# Owner-confirmed Samsung S90C acceptance — 2026-10-29

The TV owner installed the signed combined Preact build and explicitly reported:
"Collaudo effettuato con successo." This records the owner's manual acceptance of
the four checks supplied immediately before that confirmation. It is not a claim
that the contributor automation operated the TV or that every firmware path was
physically tested.

## Exact tested build

| Field | Value |
| --- | --- |
| Runtime source commit | `aec386a5672c989e77a685cda042eae20e40848f` |
| App ID / package version | `DclHome001.Home` / `2.4.0` |
| Device | Samsung OLED S90C, `QE65S90CATXZT`, ARMv7 / Tizen 9.0.0 |
| Previously owner-reported firmware | `T-PTMCDEUC-0090-2220.4` |
| Signed WGT SHA-256 | `4b011ce29f9c08897dbc3a35aa264d49b487f8a69b6a5973f275d47a7b3d518f` |
| Unsigned Windows WGT SHA-256 | `e9e9df430f978a95588f9554866e19c6ff937e81d2648d6ed7ba1285afea62ec` |
| Unsigned Linux WGT SHA-256 | `cca1ac3e55dccea71bb61c08bddc737a8e94f154d252018e4916314bedf0323b` |

Unsigned archive ordering differs between Windows and Linux; these are the recorded
platform-specific hashes. Signing was performed on the owner's PC with the existing
author configuration. Private keys, certificate archives, recovery files, private
paths and device/network identifiers are not published in this report.

## Installation evidence supplied by the owner

- The installer reported `app_id[DclHome001.Home] install completed`.
- The CLI verified installed version `2.4.0`.
- The guarded in-place update reported native Home/startup bindings and the original
  Home baseline unchanged after comparison with the captured pre-install state.
- Launch returned REST HTTP 200, with `running=True` and `visible=True`.
- No uninstall, native Home remap, boot-setting change or firmware operation was
  part of this update procedure. The owner executed the PC commands manually.

## Owner-confirmed checks for this build

| Check supplied to the owner | Result |
| --- | --- |
| Scroll upward/downward and reverse direction; inspect movement and both edge fades. | Owner reported successful acceptance. |
| Switch Home / All apps; immediately use Back or directional keys. | Owner reported successful acceptance. |
| Switch Classic / Glass; retain centred tabs and Samsung Home beside the network indicator, including Custom clock. | Owner reported successful acceptance. |
| Retain focus transitions in both themes and restore focus on return from Settings. | Owner reported successful acceptance. |

This is qualitative owner feedback, not a measured latency/frame-rate benchmark.
The initial header indicator is positioned immediately; later focus/page changes
animate. Scrolling retains the exact automated header-pixel comparison.

## Automated validation of the exact runtime commit

[Combined CI run](https://github.com/motorgrid-ita/AeroTizen/actions/runs/40891366225)
completed successfully on the tested runtime commit:

- ESLint, both TypeScript checks and production build targeting Chromium 69 / ES2018.
- 212 Node tests and 71 compiled-browser tests.
- Linux Python matrix on 3.10, 3.12 and 3.13; Windows Home checks.
- WGT packaging: 52 runtime files, including all nine weather scenes and provenance.

The first combined CI attempt exposed an initial Glass indicator transition in two
header-pixel assertions. The initial-placement correction was published without
weakening those assertions, and the final full CI above passed. Local verification
also passed a complete 71-test browser run before that final guard and all 12 focused
header/clock/theme/motion tests after it. Earlier local parallel timeout failures are
not reported as passes; final CI supplies the full result for the exact tested source.

## Focused PRs represented in the combined runtime

| PR | Head included in the tested integration | Scope of this acceptance |
| --- | --- | --- |
| #73 — Preact Home | `41b39341a121b5d470a540c7009d28dc783c3108` | Combined Home/page/scroll/focus behavior above. |
| #30 — Classic/Glass | `daba99eb029f1489cf1d611c613f5449243711f1` | Combined theme/header consistency and Settings return above. |
| #28 — Custom clocks | `b24dce68284c68355d265df4ccff1d3c0d4d25d2` | Combined compact/custom header compatibility above. |
| #29 — Recognised HDMI | `9d3a71a3812b3e3deaf5db65257539e55d3116fb` | Integration compatibility; no new device-by-device standby claim. |
| #34 — App cards | `197ab3049fb1361c19cdec2210b798ce1c21fead` | Integration compatibility; all six combinations are automated coverage. |
| #72 — Solar cache | `ad12b59f68007b80f41d7534b63a6481bf94d159` | Exact correction retained; no new physical 23:00/offline claim. |
| #74 — Weather packaging | `bc6b69ccab168f88679956fafd11ee8dd587290c` | Signed combined WGT installed; asset completeness is checked automatically. |

The focused branches were not each installed independently. Their code remains in
the existing PRs; this acceptance must not be relabelled as a standalone-branch or
universal Samsung compatibility test. The automatic English/Italian UI PR #27 remains
separate and is not silently included or certified here.

## Remaining coverage boundaries

The latest four-point confirmation does not separately re-certify physical HOME,
Live TV channel changes, YouTube/Prime Video returns, every HDMI device/standby state,
every clock/locale/card combination, every Continue Watching publisher, all nine
weather scenes and solar/offline transitions, or cold boot/autostart persistence on
this exact build. Earlier owner results for native Home, handoffs and weather remain
evidence for their earlier pinned builds. Existing automated regressions and unchanged
native/weather services are recorded separately from fresh physical checks.

Other Samsung models, older firmware and quantitative performance remain unverified.
Upstream review/merge approval is still required; this report does not dismiss a
reviewer's requested changes or merge/close any PR.

## Documentation after acceptance

Any later commit that only records this report does not change the tested runtime
or require another TV installation. Continue to identify the tested package by the
runtime commit and signed hash above, rather than by a moving branch head. Preserve
the existing known-good signed packages, original Home baseline and rollback receipts
on the owner's PC.
