"""Build, test and sign the S90C integration on the PC; never contact the TV."""

import argparse
import base64
import hashlib
import json
import os
import shlex
import shutil
import subprocess
import sys
import tempfile
import uuid
import venv
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
BACKUP_HASH = "a629b823b1abb10084c3cf510cdca16cbbf9d6e3be0379377f6fbee6adb1adf3"
BASELINE_HASH = "ca98a0960062b760e7bb88f854d5a9e519d81deceb89f7ba83b721f0c3302bfe"
AUTHOR_HASH = "5ada3fe0927f4a732c18fb77bb28186443d0cc36442e3caccf6e61193778a6c7"
PR49 = "bf0f7846c0b09574cf12568b6b558b95a924b8f0"
PR37 = "cfc8ba380bde2338e5dcddd080ae076f3e3701c2"


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def validate_source(expected):
    if any(part.casefold() == "downloads" for part in ROOT.parts):
        raise ValueError("Use a workspace under Documents, not Downloads.")
    actual = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    if actual != expected:
        raise ValueError("Checkout does not match the requested integration commit.")
    if subprocess.check_output(["git", "diff", "HEAD", "--"], cwd=ROOT, text=True).strip():
        raise ValueError("Tracked source changes must be reviewed before preparation.")
    for parent in (PR49, PR37):
        subprocess.run(["git", "merge-base", "--is-ancestor", parent, actual], cwd=ROOT, check=True)


def run(command, log):
    print("RUN:", " ".join(map(str, command)), flush=True)
    with log.open("a", encoding="utf-8") as stream:
        stream.write("\nRUN: " + " ".join(map(str, command)) + "\n")
        stream.flush()
        subprocess.run(command, cwd=ROOT, stdout=stream, stderr=subprocess.STDOUT, check=True, timeout=1200)


def npm_command():
    npm = shutil.which("npm")
    if not npm:
        raise ValueError("npm is unavailable.")
    if os.name == "nt":
        entry = Path(npm).resolve().parent / "node_modules/npm/bin/npm-cli.js"
        node = shutil.which("node")
        if not node or not entry.is_file():
            raise ValueError("Cannot locate node.exe and npm-cli.js.")
        return [node, str(entry)]
    return [npm]


def browser_tests(log):
    prefix = subprocess.list2cmdline([sys.executable]) if os.name == "nt" else shlex.quote(sys.executable)
    descriptor, name = tempfile.mkstemp(prefix=".pc-playwright-", suffix=".cjs", dir=ROOT)
    os.close(descriptor)
    config = Path(name)
    try:
        config.write_text(
            "const config = require('./playwright.config.cjs');\n"
            "config.workers = 1;\n"
            "config.webServer = config.webServer.map(server => ({...server, "
            "command: server.command.replace(/^python3 /, " + json.dumps(prefix + " ") + ")}));\n"
            "module.exports = config;\n",
            encoding="utf-8",
        )
        run(
            [
                shutil.which("node"),
                str(ROOT / "node_modules/@playwright/test/cli.js"),
                "test",
                "--config=" + str(config),
                "--workers=1",
            ],
            log,
        )
    finally:
        config.unlink(missing_ok=True)


def verify_widget(widget):
    import zipfile
    from urllib.parse import unquote

    from cryptography import x509
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import padding
    from lxml import etree

    namespace = "http://www.w3.org/2000/09/xmldsig#"
    ns = {"ds": namespace}
    with zipfile.ZipFile(widget) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)):
            raise ValueError("Duplicate widget entries.")
        for filename, role in (
            ("author-signature.xml", "AuthorSignature"),
            ("signature1.xml", "DistributorSignature"),
        ):
            root = etree.fromstring(archive.read(filename))
            info = root.find("ds:SignedInfo", ns)
            certificate = x509.load_der_x509_certificate(
                base64.b64decode(root.find(".//ds:X509Certificate", ns).text)
            )
            if role == "AuthorSignature" and certificate.fingerprint(hashes.SHA256()).hex() != AUTHOR_HASH:
                raise ValueError("Unexpected author certificate.")
            certificate.public_key().verify(
                base64.b64decode(root.find("ds:SignatureValue", ns).text),
                etree.tostring(info, method="c14n", exclusive=True),
                padding.PKCS1v15(),
                hashes.SHA512(),
            )
            referenced = []
            properties = 0
            for reference in info.findall("ds:Reference", ns):
                uri = reference.get("URI")
                if uri == "#prop":
                    nodes = root.xpath('//*[@Id="prop"]')
                    if len(nodes) != 1:
                        raise ValueError("Ambiguous signature properties.")
                    detached = etree.fromstring(etree.tostring(nodes[0]))
                    data = etree.tostring(detached, method="c14n")
                    properties += 1
                elif uri.startswith("#"):
                    raise ValueError("Unexpected signature reference.")
                else:
                    target = unquote(uri)
                    referenced.append(target)
                    data = archive.read(target)
                expected = base64.b64decode(reference.find("ds:DigestValue", ns).text)
                if hashlib.sha512(data).digest() != expected:
                    raise ValueError("Invalid widget digest: " + uri)
            excluded = (
                {"author-signature.xml", "signature1.xml"}
                if role == "AuthorSignature"
                else {"signature1.xml"}
            )
            if (
                properties != 1
                or len(referenced) != len(set(referenced))
                or set(referenced) != set(names) - excluded
            ):
                raise ValueError("Incomplete signature coverage.")


def sign_widget(backup, output):
    import zipfile

    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.serialization import pkcs12

    from aerotizen import signer

    with zipfile.ZipFile(backup) as archive:
        certificates = {}
        for filename in ("author.p12", "distributor.p12", "password.txt"):
            matches = [name for name in archive.namelist() if PurePosixPath(name).name == filename]
            if len(matches) != 1:
                raise ValueError("Missing or ambiguous certificate material.")
            certificates[filename] = archive.read(matches[0])
    password = certificates["password.txt"].decode("utf-8-sig").strip().encode()
    _, author, _ = pkcs12.load_key_and_certificates(certificates["author.p12"], password)
    if author.fingerprint(hashes.SHA256()).hex() != AUTHOR_HASH:
        raise ValueError("Author certificate does not match the preserved custom launcher.")
    widget = output / "AeroTizen_PR49_PR37_current_signed.wgt"
    with tempfile.TemporaryDirectory(prefix="signing-", dir=output) as temporary:
        directory = Path(temporary)
        for filename, data in certificates.items():
            (directory / filename).write_bytes(data)
        signer.sign_wgt(str(ROOT / "dist/launcher"), str(widget), str(directory))
    verify_widget(widget)
    return widget


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--expected-commit", required=True)
    parser.add_argument("--venv-ready", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()
    validate_source(args.expected_commit)
    documents = Path.home() / "Documents"
    backup = documents / "AeroTizen_BACKUP/DEFINITIVO_S90C/01_AEROTIZEN_V99256_HOME_BACKUP_COMPLETO.zip"
    baseline = ROOT.parent / "s90c-stock-baseline/original-home.json"
    if digest(backup) != BACKUP_HASH or digest(baseline) != BASELINE_HASH:
        raise ValueError("Original archive or PR49 baseline checksum mismatch.")
    environment = ROOT.parent / ".venv-integration-current"
    python = environment / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    if not args.venv_ready:
        if not python.is_file():
            print("Creating separate PC Python environment...", flush=True)
            venv.EnvBuilder(with_pip=True).create(environment)
        subprocess.run([str(python), "-m", "pip", "install", "-e", str(ROOT) + "[dev]"], check=True)
        subprocess.run(
            [
                str(python),
                str(Path(__file__).resolve()),
                "--expected-commit",
                args.expected_commit,
                "--venv-ready",
            ],
            check=True,
        )
        return
    if Path(sys.prefix).resolve() != environment.resolve():
        raise ValueError("The isolated Python environment is not active.")
    for command in ("git", "node", "dotnet"):
        if not shutil.which(command):
            raise ValueError("Required PC tool is unavailable: " + command)
    output = ROOT.parent / ("pc_update_" + uuid.uuid4().hex[:12])
    output.mkdir(exist_ok=False)
    log = output / "PC_BUILD.log"
    print("PC LOG:", log, flush=True)
    try:
        run([sys.executable, "tools/build_home_query.py"], log)
        run([sys.executable, "tools/build_home_control.py"], log)
        run([sys.executable, "-m", "ruff", "check", "."], log)
        run([sys.executable, "-m", "ruff", "format", "--check", "."], log)
        npm = npm_command()
        run([*npm, "ci", "--no-audit", "--no-fund"], log)
        for action in ("lint", "build"):
            run([*npm, "run", action], log)
        run([*npm, "test"], log)
        run([sys.executable, "-m", "pytest", "-q", "-o", "addopts="], log)
        browser_tests(log)
        run([sys.executable, "tools/build_release.py", "launcher", "--output", str(output / "unsigned")], log)
        for action in ("apply", "restore"):
            run([sys.executable, "-m", "aerotizen", "home", action, "--backup", str(baseline), "--json"], log)
        widget = sign_widget(backup, output)
        if digest(backup) != BACKUP_HASH or digest(baseline) != BASELINE_HASH:
            raise ValueError("Original archive or baseline changed during preparation.")
        validate_source(args.expected_commit)
        report = {
            "source_commit": args.expected_commit,
            "tv_contacted": False,
            "native_changes": False,
            "backup_unchanged": True,
            "baseline_unchanged": True,
            "signed_widget": str(widget),
            "sha256": digest(widget),
            "signatures_and_digests_verified": True,
            "cli_python": sys.executable,
            "pc_build_complete": True,
        }
        result = output / "PC_UPDATE_RESULT.json"
        result.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print("PC UPDATE COMPLETE; NO TV OPERATIONS.")
        print("REPORT:", result)
        print("PACKAGE:", widget)
        print("SHA256:", report["sha256"])
    except Exception:
        print("STOP: preparation failed. Keep the current TV installation. PC log:", log, flush=True)
        raise


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("ERROR:", error, file=sys.stderr)
        sys.exit(1)
