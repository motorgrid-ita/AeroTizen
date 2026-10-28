# Preact contribution integration

This is a validation branch, not a replacement for the focused upstream PRs.
Upstream baseline: `c4b649b4fa22a43e19842f0f6d52acdfa69cc1d3`.
The fork main matches that baseline. Existing reference and native-handoff
integration branches are preserved without changes or history rewrites.

| Contribution | Review unit | Integration decision |
| --- | --- | --- |
| Core Home | #73 | Preact/TypeScript owns header, grids, menus and Continue Watching cards; existing services remain adapters. |
| Custom clocks | #28 | Four reference styles and original preference keys; optional clock mount, shared clock tick and weather. |
| Recognised HDMI | #29 | Existing recognition/deduplication plus typed per-port overrides and Preact Settings. |
| Square/Rectangle cards | #34 | Original geometry and 3/4/5 columns; Samsung artwork pipeline retained at original resolution. |
| Optional Glass | #30, depends on #73 | Actual Preact categories, scoped remote navigation, moving focus plates, header and source dock. Classic remains default. |
| Weather photos | Merged #35 | Existing assets, provenance and shared weather service preserved. |
| Native HOME | Merged #49 | Native helper, settings policy and watcher protocol unchanged. |
| Native handoffs | Merged #64 | Existing acknowledged Samsung escape, Live TV, YouTube and Prime Video commands reused. |
| WGT weather assets | #74 | Include all nine scene JPEGs and both provenance files; fail if incomplete. |
| Solar cache | Open #72, `ad12b59f68007b80f41d7534b63a6481bf94d159` | Exact fix included for combined testing; not duplicated in the feature PRs. |

## Conflict resolutions and parity

The old feature branches were merged forward without force-pushing. The core and
feature PR trees remain separate; this branch resolves their composition conflicts:
Display Settings controls belong in Glass appearance/status/source panes, all original
settings keys remain in the shared types/actions, the clock has one stable header host,
and Preact column calculation applies the validated card preference. Source HTML is
kept as a legacy comparison fixture, while the production build uses a single Preact
bundle for Home and Settings. Existing status services own only their stable hosts.

Reference styles and source recognition rules were compared directly with the retained
reference/feature sources. Custom brand PNGs with unestablished redistribution rights
are excluded from the modernized #34 diff, as requested by the upstream reviewer.
This does not add a custom-file/banner import system. Native Samsung artwork and its
existing fallback candidates remain; source-resolution selection is not downsampled.
No new image-license claim is made. Reference/history assets are not rewritten.

## Validation boundaries

Automated coverage includes short/held OK, app menus, move/drop, Back, tab caching,
Settings focus restoration, native handoff adapters, Continue Watching startup/cache/
reordering/carousel position, HDMI recognition/visibility/selection, all clock styles,
all six card mode/column combinations, all Glass categories, focus-plate geometry,
wallpaper opt-in/fallback and the #72 23:00 legacy-cache repair. A combined browser
scenario enables Glass, custom clock, Rectangle cards and HDMI overrides together,
then changes wallpaper settings and verifies reload persistence. Paired Classic
screenshots and geometry preserve the legacy baseline at 1920x1080.

ESLint, strict TypeScript, production builds, Node tests and compiled-browser tests
are required. Release packaging uses the existing deterministic WGT builder. Python
and native-helper validation runs in the unchanged CI matrix (3.10/3.12/3.13 Linux,
Windows Home checks). Local .NET startup is restricted in the hosted editing sandbox;
missing generated helper manifests caused the attempted local full Python suite to
fail, so that attempt must not be reported as a pass. Upstream PR CI builds the helpers
and supplies the authoritative full Python result. Integration CI repeats the same
workflow on the combined commit.

The extra integration-only workflow also publishes a source-pinned unsigned WGT artifact
only after CI succeeds. Signing remains a PC-only step. This workflow runs on this validation branch and calls the
existing CI workflow. It is not part of any feature PR against upstream main.

## Remaining acceptance

Samsung S90C hardware acceptance of this renderer is pending. Previous HOME, native
handoff and weather test confirmations apply only to their earlier tested builds.
They are not claims about this migration. Samsung-only artwork, device standby data,
physical HOME/Back, TV channel focus, app returns, font rendering, animation latency,
standby/cold-boot behavior and older-device performance need physical checks.
See [the S90C procedure](s90c-preact-validation.md). Private signing configuration is
available only on the owner's PC; an unsigned reproducible WGT is not installable as
an owner-signed package until that local signing/verification step is completed.
