"""Check new artwork-file distribution boundaries, not a universal IP clearance."""

import argparse
import hashlib
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def validate(package):
    records = json.loads((ROOT / "docs/artwork/reference-assets.json").read_text())["assets"]
    excluded = {record["sha256"] for record in records if not record["public_bundle"]}
    allowed = {"icon.png"} | {
        f"assets/weather/{scene}.jpg"
        for scene in ("sun", "partly", "cloud", "rain", "storm", "snow", "fog", "night", "sunset")
    }
    with zipfile.ZipFile(package) as archive:
        if "js/logos.js" in archive.namelist():
            raise ValueError("Unreviewed legacy logo paths; build with --reviewed-artwork")
        if "css/artwork-studio.css" in archive.namelist():
            css = archive.read("css/artwork-studio.css").decode().replace("\r\n", "\n")
            if (ROOT / "LICENSE").read_text().strip() not in css:
                raise ValueError("Original artwork is missing the repository MIT notice")
        for name in archive.namelist():
            if name.startswith(("assets/brands/", "assets/artwork-local/", "assets/artwork-verified/")):
                raise ValueError("Unreviewed artwork pack: " + name)
            if (
                name.lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"))
                and name not in allowed
            ):
                raise ValueError("Unreviewed image file: " + name)
            if hashlib.sha256(archive.read(name)).hexdigest() in excluded:
                raise ValueError("Excluded reference image bytes: " + name)
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package", type=Path)
    args = parser.parse_args()
    validate(args.package)
    print("Public artwork-file boundary verified; no excluded reference PNG or private pack.")
    print("Legacy logo-path bundle is excluded. This check is not a worldwide legal opinion.")
