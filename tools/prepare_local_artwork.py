"""Create a personal unsigned WGT with user-authorized PNG artwork; never contact a TV."""

import argparse
import hashlib
import io
import json
import re
import zipfile
from pathlib import Path


def prepare(package, manifest, output, acknowledge=False):
    if not acknowledge:
        raise ValueError("Explicit --acknowledge-rights is required; local use is not a legal exemption")
    try:
        from PIL import Image
    except ImportError as error:
        raise ValueError("Install Pillow in your build environment: python -m pip install Pillow") from error
    if output.exists():
        raise ValueError("Output already exists; refusing to replace it")
    records = json.loads(manifest.read_text(encoding="utf-8"))
    if not isinstance(records, dict) or len(records) > 100:
        raise ValueError("Expected at most 100 exact installed application IDs")
    profile, assets = {}, {}
    base = manifest.resolve().parent
    for app_id, shapes in records.items():
        if (
            not re.fullmatch(r"[A-Za-z0-9_.-]{1,200}", app_id)
            or not isinstance(shapes, dict)
            or set(shapes) - {"square", "rectangle"}
        ):
            raise ValueError("Invalid exact app ID or shape")
        entry = {}
        for shape, name in shapes.items():
            source = base / name
            if (
                source.is_symlink()
                or not source.is_file()
                or source.resolve() != source.absolute()
                or not source.resolve().is_relative_to(base)
            ):
                raise ValueError(
                    "Artwork must be a regular file below the manifest directory without symlinks"
                )
            if source.stat().st_size > 6 * 1024 * 1024:
                raise ValueError("Artwork input exceeds 6 MiB")
            with Image.open(source) as image:
                if (
                    image.format != "PNG"
                    or image.width * image.height > 16_777_216
                    or getattr(image, "n_frames", 1) != 1
                ):
                    raise ValueError("Only single-frame PNG images up to 16 megapixels are accepted")
                image.load()
                image = image.convert("RGBA")
                image.info.clear()
                image.thumbnail((1024, 1024) if shape == "square" else (1280, 720), Image.Resampling.LANCZOS)
                buffer = io.BytesIO()
                image.save(buffer, "PNG", optimize=True)
                data = buffer.getvalue()
                filename = "assets/artwork-local/" + hashlib.sha256(data).hexdigest() + ".png"
                assets[filename] = data
                entry[shape] = {"src": filename, "width": image.width, "height": image.height}
        profile[app_id] = entry
    profile_data = (
        "window.AeroTizen.artworkProfile = "
        + json.dumps(profile, sort_keys=True, separators=(",", ":"))
        + ";\n"
    ).encode()
    with zipfile.ZipFile(package) as archive:
        names = archive.namelist()
        if (
            len(names) != len(set(names))
            or "js/artwork-profile.js" not in names
            or any(name in names for name in ("author-signature.xml", "signature1.xml"))
        ):
            raise ValueError("Expected an unsigned AeroTizen artwork-enabled package with unique entries")
        files = {name: archive.read(name) for name in names}
    files["js/artwork-profile.js"] = profile_data
    files.update(assets)
    files["licenses/local-artwork.json"] = json.dumps(
        {"private": True, "rights_acknowledged": True, "files": sorted(assets)}, indent=2
    ).encode()
    # Exclusive creation prevents a concurrent run from overwriting an existing package.
    output.parent.mkdir(parents=True, exist_ok=True)
    with (
        output.open("xb") as stream,
        zipfile.ZipFile(stream, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive,
    ):
        for name, data in sorted(files.items()):
            item = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0))
            item.create_system = 3
            item.external_attr = 0o100644 << 16
            item.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(item, data)
    return hashlib.sha256(output.read_bytes()).hexdigest()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--package", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--acknowledge-rights", action="store_true")
    args = parser.parse_args()
    print("SHA256:", prepare(args.package, args.manifest, args.output, args.acknowledge_rights))
    print("Personal unsigned package prepared. Sign locally before installation. No TV operation performed.")
