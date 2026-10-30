import importlib.util
import json
import zipfile
from pathlib import Path

import pytest

spec = importlib.util.spec_from_file_location(
    "local_artwork", Path(__file__).parents[1] / "tools/prepare_local_artwork.py"
)
local = importlib.util.module_from_spec(spec)
spec.loader.exec_module(local)


def fixture(tmp_path):
    Image = pytest.importorskip("PIL.Image")
    package = tmp_path / "input.wgt"
    with zipfile.ZipFile(package, "w") as archive:
        archive.writestr("js/artwork-profile.js", "window.AeroTizen.artworkProfile = {};")
        archive.writestr("config.xml", "<widget/>")
    Image.new("RGBA", (1920, 1080), (20, 30, 40, 100)).save(tmp_path / "personal.png")
    manifest = tmp_path / "personal.json"
    manifest.write_text(json.dumps({"installed.App": {"rectangle": "personal.png"}}))
    return package, manifest


def test_private_pack_is_deterministic_optimized_and_keeps_proportions(tmp_path):
    package, manifest = fixture(tmp_path)
    first, second = tmp_path / "one.wgt", tmp_path / "two.wgt"
    assert local.prepare(package, manifest, first, True) == local.prepare(package, manifest, second, True)
    with zipfile.ZipFile(first) as archive:
        data = archive.read("js/artwork-profile.js").decode()
        assert "installed.App" in data and "1280" in data and "720" in data
        assert len([name for name in archive.namelist() if name.startswith("assets/")]) == 1
        assert archive.read("config.xml") == b"<widget/>"
    with pytest.raises(ValueError, match="exists"):
        local.prepare(package, manifest, first, True)


def test_private_pack_requires_rights_and_rejects_unsafe_paths_and_shapes(tmp_path):
    package, manifest = fixture(tmp_path)
    with pytest.raises(ValueError, match="rights"):
        local.prepare(package, manifest, tmp_path / "no.wgt")
    for record in ({"../app": {}}, {"app": {"wide": "personal.png"}}, {"app": {"square": "../personal.png"}}):
        manifest.write_text(json.dumps(record))
        with pytest.raises((ValueError, FileNotFoundError)):
            local.prepare(package, manifest, tmp_path / "no.wgt", True)
        assert not (tmp_path / "no.wgt").exists()


def test_signed_or_duplicate_packages_are_not_silently_modified(tmp_path):
    package, manifest = fixture(tmp_path)
    with zipfile.ZipFile(package, "a") as archive:
        archive.writestr("author-signature.xml", "<Signature/>")
    with pytest.raises(ValueError, match="unsigned"):
        local.prepare(package, manifest, tmp_path / "no.wgt", True)


@pytest.mark.parametrize("name", ["assets/brands/any.png", "assets/artwork-local/any.png", "icons/new.svg"])
def test_release_artwork_gate_rejects_unreviewed_image_files(tmp_path, name):
    gate_spec = importlib.util.spec_from_file_location(
        "artwork_gate", Path(__file__).parents[1] / "tools/check_artwork_release.py"
    )
    gate = importlib.util.module_from_spec(gate_spec)
    gate_spec.loader.exec_module(gate)
    package = tmp_path / "bad.wgt"
    with zipfile.ZipFile(package, "w") as archive:
        archive.writestr(name, "unreviewed")
    with pytest.raises(ValueError, match="Unreviewed"):
        gate.validate(package)
