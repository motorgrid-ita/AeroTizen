"""Owner signing preparation verifies complete payloads without a TV connection."""

import hashlib
import importlib.util
import zipfile
from pathlib import Path

import pytest
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.serialization import pkcs12

from aerotizen import signer
from test_signer import app_dir, certs  # noqa: F401 -- reusable throwaway fixtures

spec = importlib.util.spec_from_file_location(
    "prepare_signed_launcher", Path(__file__).parents[1] / "tools/prepare_signed_launcher.py"
)
preparation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preparation)


def test_prepared_signatures_cover_original_payload(certs, app_dir, tmp_path):  # noqa: F811
    certdir, _ = certs
    _, certificate, _ = pkcs12.load_key_and_certificates((certdir / "author.p12").read_bytes(), b"pw")
    widget = tmp_path / "signed.wgt"
    signer.sign_wgt(str(app_dir), str(widget), str(certdir))
    preparation.verify(widget, certificate.fingerprint(hashes.SHA256()).hex())
    assert preparation.digest(widget) == hashlib.sha256(widget.read_bytes()).hexdigest()
    with pytest.raises(ValueError, match="author"):
        preparation.verify(widget, "0" * 64)


def test_tampered_payload_is_rejected(certs, app_dir, tmp_path):  # noqa: F811
    certdir, _ = certs
    _, certificate, _ = pkcs12.load_key_and_certificates((certdir / "author.p12").read_bytes(), b"pw")
    widget, tampered = tmp_path / "signed.wgt", tmp_path / "tampered.wgt"
    signer.sign_wgt(str(app_dir), str(widget), str(certdir))
    with zipfile.ZipFile(widget) as original, zipfile.ZipFile(tampered, "w") as changed:
        for name in original.namelist():
            changed.writestr(name, b"tampered" if name == "index.html" else original.read(name))
    with pytest.raises(ValueError, match="digest"):
        preparation.verify(tampered, certificate.fingerprint(hashes.SHA256()).hex())


@pytest.mark.parametrize("name", ["../outside", "/outside", "C:/outside", "dir\\outside"])
def test_owner_backup_archive_paths_are_checked(tmp_path, name):
    widget = tmp_path / "archive.zip"
    with zipfile.ZipFile(widget, "w") as archive:
        archive.writestr(name, "test")
    with pytest.raises(ValueError, match="unsafe"):
        preparation.checked_archive(widget)
