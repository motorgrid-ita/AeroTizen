# Contribution status after upstream refresh — 2026-10-30

Upstream and fork main were synchronized by a nine-commit fast-forward to
`c9a05719dff4f86836a44000b47f22c8636e7c7f`. No shared history was rewritten.
Launcher is 2.5.0; CLI is 2.5.0. The old reference and native-handoff integration
branches were not moved.

| Work | Current status | Remaining action |
| --- | --- | --- |
| #26 Home favourites | Merged upstream | Preserve existing behavior |
| #72 solar cache, #73 Preact Home, #74 weather packaging | Merged upstream | Included in current main and refreshed branches |
| #27 IT/EN | Refreshed with typed Preact Settings subscriptions; clock locale regression corrected | Maintainer requested a pause and discussion of a shared i18n library; that architecture decision remains open. New strings fall back to English. |
| #28 clocks | Existing branch refreshed and tested | Upstream review; focused hardware cases remain scoped |
| #29 HDMI standby | Existing branch refreshed and tested | Upstream review; physical standby/hot-plug validation |
| #30 Classic/Glass | Four conflicts with current Home resolved; real Preact categories/themes retained | Requested-changes review still needs maintainer approval; not merged |
| #34 card shapes/columns | Preferences wired directly to merged Preact Home | Upstream review; all six physical geometries/artwork sharpness |
| Fork #12 artwork/USB | Continues as a draft against the combined branch | Actual USB permissions, private-file URI rendering, drive removal/restart persistence, performance and owner visual acceptance |
| Fork #11 older combined QA | Historical independent QA, not a current release candidate | Retained for history; do not install or merge it as the current Preact/artwork build |

Focused branch heads after the refresh:

- #27: `ddf7f887891c2a4daef96bde21d50912cf23a5f1`
- #28: `2d0eb97e825af467b5100f3b36dc77932479de49`
- #29: `78364b4a8c30d96f51d18e65b2a62e7d2af6cd0b`
- #30: `7d22265de2f01e7cc0fc617377f8f531a79fd316`
- #34: `48e2c9594f5be6952ee08b120ead81a23523a0c6`

The combined branch preserves upstream native HOME backup and store-discovery
corrections, plus the current weather and Preact implementations. No independent
native policy, weather client, network service or timer was introduced.

Issue #56 was successfully updated:
https://github.com/helalaou/AeroTizen/issues/56#issuecomment-6511775774
It remains open. No third-party HD brand asset has been cleared or newly bundled;
USB import is not a grant of intellectual-property rights. The reference brand
PNGs remain excluded from reviewed artwork packages.

Owner feedback on the previous artwork preview confirmed remaining functionality
but rejected Studio's visual impact. Full-canvas PNG import and original unbranded
templates are proposed alternatives, not owner-approved replacements yet.

Earlier S90C acceptance belongs to the exact 2.4.0 signed build documented in
`s90c-preact-acceptance-2026-10-29.md`. It must not be transferred to these 2.5.0
sources. No contributor automation connected to the TV or accessed owner signing
keys. The owner must personally sign, update and verify any new hardware build.
