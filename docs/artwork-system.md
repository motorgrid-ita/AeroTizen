# Optional Studio cards and personal artwork

Related to upstream Issue #56. This partially addresses it: no third-party HD logo pack is cleared or included. PR #34 retains geometry/columns; #73 owns Preact Home. #30 owns appearance composition. Do not close #56 on the basis of this work.

## Selection and rendering

Default **Samsung artwork** preserves the current candidate order and Settings/CW icons. Opt into **Studio cards and local overrides** in Settings > Home appearance > App artwork. Home app cards use exact installed application IDs and independently select the current shape:

1. An enabled personal profile entry for that exact ID and shape.
2. An individually cleared bundled entry (currently empty, deliberately).
3. Existing local Samsung candidates, unmodified and in their existing order.
4. Installed app icon, if present; then original neutral surface and ordinary app-name text.

Images use contain, never a square-to-landscape stretch or aggressive crop. Studio Rectangle places the unaltered image on the left and name on the right. The Square design centres the image above its label. Both appearances retain existing card focus/remote behavior; Settings and Continue Watching icons remain standard and independent of Home shape. No native application icon/database is overwritten. A low-resolution native icon stays low-resolution; CSS cannot invent detail. Studio gives it purposeful spacing rather than pretending it is HD.

The existing image-sequence hook provides loaded-image caching, deferred loading for inactive grids, timeout/error fallback and stale callback cleanup. Source sequences deduplicate; no network client or persistent polling timer is added. Keys remain exact app IDs and image sources. One-off image attempt deadlines retain the existing 2-second bound.

## Personal images: PC packaging, not TV filesystem access

No universal TV file picker, arbitrary filesystem privilege, upload server or remote image URL is assumed. Prepare a **separate personal unsigned WGT on the PC**, then sign it with the existing local configuration. Nothing in this tool connects to a TV. Use only images you may lawfully use; personal packaging is not a copyright/trademark exception.

Keep personal files outside the checkout, for example `Documents/AeroTizen_Artwork_Private`. Do not upload personal packages or certificates. Install Pillow in the existing PC build virtual environment if needed (`python -m pip install Pillow`). The TV runtime needs no additional dependency.

Create `profile.json` beside the authorized PNGs (actual runtime app ID, not an unverified name or package prefix):

```json
{
  "installed.application.ID": {
    "square": "my-square.png",
    "rectangle": "my-landscape.png"
  }
}
```

Each shape is optional. Missing Rectangle falls back to Samsung, not the Square override. PNG sources may be transparent. Input targets: 1024-square and 1920×1080 landscape; runtime optimization keeps at most 1024×1024 or 1280×720 and never upscales. Original proportions are retained. Metadata is removed; identical optimized bytes deduplicate. No SVG/script input, URLs, path escapes, symlinks, animated images or input above 16 megapixels/6 MiB. Pillow is a PC-only optional build dependency.

```powershell
& $python tools/prepare_local_artwork.py `
  --package "dist/release-check/aerotizen-launcher-2.4.0.wgt" `
  --manifest "$HOME/Documents/AeroTizen_Artwork_Private/profile.json" `
  --output "$HOME/Documents/AeroTizen_Artwork_Private/AeroTizen_personal_unsigned.wgt" `
  --acknowledge-rights
```

`$python` must name the existing build virtual environment's Python. Output must be new. Input must be unsigned; altering an already signed package invalidates its signatures and is rejected. Sign the generated WGT afterwards. Profile data cannot execute markup and only package-local PNG paths are accepted by the runtime selector. Merely preparing it does not install anything.

After installing the owner-signed build, choose Studio. Local/Samsung choices appear only for installed app IDs found in the personal profile. Switching a local entry off persists and keeps files untouched; switching the global mode back restores original Samsung presentation. Reinstalling the public package removes private bytes; saved opt-outs are harmless if no profile exists.

## Release and licensing boundary

`docs/artwork-licensing-audit.md` documents all nine reference PNGs. None is in this public contribution. Existing upstream `logos.js` is not newly licensed or certified here; this patch preserves the default behavior and does not expand its path set. Studio uses a newly written generic fallback instead. The gate rejects private, brand and unreviewed verified image-pack directories in public builds. Do not promote an asset to the empty verified registry without exact-file evidence and an allowlist/packaging change reviewed together.

Original neutral CSS and SVG design masters are MIT, with the repository notice retained. App names identify installed apps and do not imply endorsement. Brand rights and user-image rights are not relicensed by this repository. Permission enquiries have not been sent.
