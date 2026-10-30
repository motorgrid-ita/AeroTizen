# USB artwork import and complete-card presentation

## Discussion evidence checked on 2026-10-30

No USB-import proposal by helalaou was found in the bodies, conversation comments,
inline comments or reviews of Issue #56 and PRs #34, #30 and #73. The repository-wide
issue/comment search and the older artwork discussion in #11 were also checked.
This is a bounded search result, not proof that no such statement exists elsewhere.
Do not attribute this implementation to an unverified comment.

The verified requests are:

- [helalaou's #34 review](https://github.com/helalaou/AeroTizen/pull/34#pullrequestreview-5641361586):
  keep Samsung artwork because bundled brand-image redistribution rights were uncertain.
- [helalaou's updated #11 direction](https://github.com/helalaou/AeroTizen/pull/11#issuecomment-6352911479):
  Samsung artwork for installed apps, with icon/name fallback and a card-size setting.
- [metacurb's #11 comparison](https://github.com/helalaou/AeroTizen/pull/11#issuecomment-6362278390):
  square cached artwork was found on the inspected TV; complete custom banners are
  distinct from assembling generic text and an icon. Match IDs, not display names.
- [Issue #56](https://github.com/helalaou/AeroTizen/issues/56): optional, reversible
  high-resolution improvements, with source/licence evidence for redistributed assets.

Current upstream `66ef53c5298df353c43efcabf57fe3c23a6ec564` was compared with the
integration's earlier main. The newer changes concern weather, native Home and
release packaging, not a parallel USB artwork implementation. This contribution
continues against the existing combined Preact dependency, without rewriting those
unrelated services or advancing reference/integration branches.

## Owner flow

1. Put **static PNG** files on a USB drive. A small `Art` folder is convenient;
   naming files by app ID is not required because the user explicitly chooses the app.
2. In Home **or** All Apps, hold OK on an installed app. Select **Custom artwork**.
3. Choose Square or Rectangle, browse a mounted removable drive/folder, and select a PNG.
4. Review the complete-image preview. Confirm **Use this image** only if you have
   the right to use it. Cancel/Back does not replace the current artwork.
5. The imported image overrides that exact app/shape in both views, independent of
   the default native/Studio presentation. Other apps keep their existing defaults.
6. **Reset Square to Samsung** and **Reset Rectangle to Samsung** are independent.
   Reset suppresses that shape's packaged personal override too; a subsequent USB
   import re-enables the chosen shape. The other shape is preserved.

Full Square images and supplied landscape compositions occupy the whole card with
`object-fit: contain`; no added label or orbit is painted over a loaded image.
Rectangle display of a square-only Samsung icon keeps the original aspect ratio,
with surrounding space, not fake panorama detail or a stretched logo. Purpose-made
landscape images are the route to the Custom reference's complete-banner appearance.
The global Studio setting remains optional; USB overrides do not enable it for all apps.

## Supported APIs, privileges and limits

Primary documentation:

- [Samsung USB guide](https://developer.samsung.com/smarttv/develop/guides/data-handling/handling-usb-storages.html)
- [Samsung Filesystem API](https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/filesystem-api.html)
- [Samsung file-operation guide](https://developer.samsung.com/smarttv/develop/guides/data-handling/managing-file-operations.html)
- [Samsung data/file FAQ](https://developer.samsung.com/smarttv/develop/faq/data-and-file-handling.html)
- [Tizen storage privilege reference](https://github.com/Samsung/tizen-docs/blob/master/docs/application/web/reference/security-privileges.md)

The adapter uses `listStorages`, `resolve`, `File.listFiles`, `File.openStream`,
`readBytes`, `writeBase64`, `readBase64`, and storage-change subscriptions. These
legacy File APIs date from Tizen 1.0 and are deprecated since 5.0, but avoid requiring
newer FileHandle APIs on older TVs. Runtime support/security errors are handled.
The existing `filesystem.read` and `filesystem.write` declarations are retained;
public `externalstorage` is added for removable-media access. No media-directory,
partner, native-root, network-upload or arbitrary file-picker access is requested.
Only external USB handles are opened read-only. All writes are under the widget's
own private directory. No USB file is renamed, overwritten or deleted.

Tizen's legacy web privilege table documents externalstorage from 4.0. Older-TV
package acceptance and the deprecated File API remain hardware validation items;
Chromium69/ES2018 compilation does not certify every historical firmware. If the
TV denies USB access, the dialog reports the problem and the PC personal-package
workflow remains available. No bypass or privileged native helper is introduced.

Input: static PNG only, up to 6 MiB and 16 megapixels (8192 maximum side); signature,
IHDR dimensions, bounded chunk structure and APNG exclusion are checked before decoding.
Browser decoding validates the actual image; canvas re-encoding removes original
metadata. JPEG, WebP, GIF and SVG imports are intentionally not supported yet.
There is no automatic thumbnail decode of an entire USB folder.

Output: no upscaling, at most 1024×1024 Square or 1280×720 Rectangle, 2 MiB per
image, 24 MiB total library, 100 apps. Transparent PNGs retain transparency. Folder
listings are limited to 300 entries and 12 path components; a larger folder produces
a clear instruction to use a smaller folder, not a silently incomplete list.

## Persistence, failures and cancellation

Bytes are stored under `wgt-private/aerotizen-artwork/<random-128-bit-token>.png`.
The metadata key `aerotizen.artwork.usb.v1` stores only exact app IDs, per-shape
filenames, dimensions, sizes and reset choices. No user paths or executable content
are persisted. On reload the adapter resolves private handles itself; settings do
not authorize arbitrary file URIs. Missing or damaged private files fall back to
Samsung via the existing bounded image sequence. A new import is written and read
back before metadata switches; failures preserve the previous selection and delete
new bytes best-effort. Previous owned images are removed after successful replacement.

Cancel, visibility loss, or app removal invalidates pending UI work. An in-flight
storage write cannot be forcibly interrupted through these APIs; its result is
not selected after cancellation and newly written bytes are removed best-effort.
Power loss can leave an unreferenced private file; no crash-proof cleanup or quota
reservation by the OS is claimed. Storage-full and read/write errors are reported.
No request polling, permanent USB listener or native HOME service is added.

Drive removal while browsing clears stale entries and offers explicit Refresh.
Removal during a read fails without changing the selection. Once a preview has
been fully prepared in memory, confirmation can save that image even after USB
removal. Successfully saved files no longer depend on the drive. The Samsung FAQ
states application data persists across power-off and in-place updates, and is
removed by uninstall; physical persistence still requires owner confirmation.

## Licensing and complete-card proposal

Import is a mechanism, not a licence or a private-use exception. Use only images
you may lawfully use. No USB images are uploaded, included in public source or
repackaged for others. The nine unresolved reference brand PNGs remain excluded.
No newly researched third-party HD brand file has been cleared for worldwide
GitHub/WGT distribution; the per-file register remains authoritative.

A redistributable starting point is provided in [original unbranded examples](artwork/examples/README.md):
three editorial compositions (cinema, music and games), each independently composed
as 1024-square and 1920×1080 landscape SVG/PNG. They use original geometric elements
and ordinary text, with MIT notices. They are optional USB demo/template files,
not forced replacements for app identities and not asserted to match the owner's
preferred branded cards. A complete, authorized brand banner can use the same
import/display path without introducing a public logo pack.

## Hardware status

The owner accepted remaining functionality of the earlier artwork follow-up but
explicitly rejected its aesthetics. **This USB import and new full-card rendering
have not been tested on a physical TV.** Browser filesystem doubles verify flow,
metadata and cancellation; they do not prove Samsung's private-file URI rendering,
USB permissions, real throughput or reboot durability. See the updated S90C checklist.
