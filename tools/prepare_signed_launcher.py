"""Prepare and verify a launcher WGT locally using an owner's existing certificate backup.

No device connection, installation, settings write or Home operation is performed.
The backup is read only and private certificate material is kept in a temporary directory.
"""

import argparse
import base64
import hashlib
import json
import subprocess
import tempfile
import urllib.parse
import zipfile
from pathlib import Path, PurePosixPath
from xml.etree import ElementTree

from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import pkcs12
from lxml import etree

from aerotizen import signer

ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    with path.open("rb") as stream:
        value = hashlib.sha256()
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(block)
        return value.hexdigest()


def checked_archive(path):
    archive = zipfile.ZipFile(path)
    names = archive.namelist()
    if len(names) != len(set(names)) or any(
        "\\" in name or ":" in name or PurePosixPath(name).is_absolute() or ".." in PurePosixPath(name).parts
        for name in names
    ):
        archive.close()
        raise ValueError("Archive contains duplicate or unsafe paths")
    return archive


def verify(widget, author_fingerprint):
    ns = {"ds": signer.DSIG}
    parser = etree.XMLParser(resolve_entities=False, no_network=True)
    with checked_archive(widget) as archive:
        payload = set(archive.namelist()) - set(signer.SIG_FILES)
        for name in signer.SIG_FILES:
            signature = etree.fromstring(archive.read(name), parser)
            info = signature.find("ds:SignedInfo", ns)
            certificate = x509.load_der_x509_certificate(
                base64.b64decode(signature.find(".//ds:X509Certificate", ns).text)
            )
            if (
                name == "author-signature.xml"
                and certificate.fingerprint(hashes.SHA256()).hex() != author_fingerprint
            ):
                raise ValueError("Unexpected author certificate")
            certificate.public_key().verify(
                base64.b64decode(signature.find("ds:SignatureValue", ns).text),
                etree.tostring(info, method="c14n", exclusive=True),
                padding.PKCS1v15(),
                hashes.SHA512(),
            )
            covered = set()
            for reference in info.findall("ds:Reference", ns):
                uri = reference.get("URI")
                if uri.startswith("#"):
                    nodes = signature.xpath("//*[@Id=$value]", value=uri[1:])
                    if len(nodes) != 1:
                        raise ValueError("Ambiguous signature property")
                    detached = etree.fromstring(etree.tostring(nodes[0]), parser)
                    data = etree.tostring(detached, method="c14n")
                else:
                    filename = urllib.parse.unquote(uri)
                    data = archive.read(filename)
                    covered.add(filename)
                expected = base64.b64decode(reference.find("ds:DigestValue", ns).text)
                if hashlib.sha512(data).digest() != expected:
                    raise ValueError("Signature digest mismatch: " + uri)
            required = payload | ({"author-signature.xml"} if name == "signature1.xml" else set())
            if covered != required:
                raise ValueError("Signature does not cover the complete package")
            print("Verified:", name)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--commit", required=True, help="Exact reviewed source commit")
    parser.add_argument("--unsigned", required=True, type=Path)
    parser.add_argument("--unsigned-sha256", required=True)
    parser.add_argument("--backup", required=True, type=Path)
    parser.add_argument("--backup-sha256", required=True)
    parser.add_argument("--author-sha256", required=True)
    parser.add_argument("--output", required=True, type=Path, help="New output directory; must not exist")
    args = parser.parse_args()
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    dirty = subprocess.check_output(["git", "diff", "HEAD", "--"], cwd=ROOT, text=True).strip()
    if commit != args.commit or dirty:
        raise ValueError("Source commit differs or tracked sources have changes")
    if (
        digest(args.unsigned) != args.unsigned_sha256.lower()
        or digest(args.backup) != args.backup_sha256.lower()
    ):
        raise ValueError("Unsigned package or backup hash differs")
    with checked_archive(args.unsigned) as archive:
        if set(signer.SIG_FILES) & set(archive.namelist()):
            raise ValueError("Expected an unsigned package")
        metadata = ElementTree.fromstring(archive.read("config.xml"))
        application = metadata.find("{http://tizen.org/ns/widgets}application")
        if application is None or application.get("id") != "DclHome001.Home":
            raise ValueError("Unexpected launcher application ID")
        html = archive.read("index.html").decode()
        if 'id="home-root"' not in html or 'id="settings-root"' not in html:
            raise ValueError("Compiled Preact mounts are missing")
    with checked_archive(args.backup) as archive:
        certificates = {}
        for name in ("author.p12", "distributor.p12", "password.txt"):
            matches = [entry for entry in archive.namelist() if PurePosixPath(entry).name == name]
            if len(matches) != 1:
                raise ValueError("Missing or ambiguous certificate file: " + name)
            certificates[name] = archive.read(matches[0])
    password = certificates["password.txt"].decode("utf-8-sig").strip().encode()
    _, author, _ = pkcs12.load_key_and_certificates(certificates["author.p12"], password)
    if author is None or author.fingerprint(hashes.SHA256()).hex() != args.author_sha256.lower():
        raise ValueError("Author certificate differs from the approved installation")
    certificates["password.txt"] = password
    args.output.mkdir(parents=True, exist_ok=False)
    pending = args.output / "launcher.unverified.wgt"
    widget = args.output / "AeroTizen_Preact_S90C_signed.wgt"
    try:
        with tempfile.TemporaryDirectory(prefix="aerotizen-signing-") as temporary:
            certdir = Path(temporary)
            for name, data in certificates.items():
                (certdir / name).write_bytes(data)
            signer.sign_wgt(str(args.unsigned), str(pending), str(certdir))
        verify(pending, args.author_sha256.lower())
        pending.rename(widget)
    finally:
        pending.unlink(missing_ok=True)
    manifest = {
        "source_commit": commit,
        "app_id": "DclHome001.Home",
        "version": metadata.get("version"),
        "unsigned_sha256": digest(args.unsigned),
        "signed_sha256": digest(widget),
        "author_sha256": args.author_sha256.lower(),
        "hardware_tested": False,
    }
    (args.output / "build-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print("Package:", widget)
    print("SHA256:", manifest["signed_sha256"])
    print("Prepared locally. No TV connection or operation performed.")


if __name__ == "__main__":
    main()
