# Home key and native TV navigation — QA branch

**Branch:** `qa/glass-physical-home-live-tv`  
**Base:** the Unified Glass PR (`feat/launcher-unified-glass-interface`)  
**Added:** native Samsung Home / Live TV integration and guarded HomeWatcher improvements from fork draft PR #6.

## Scope and safety

This is **not a complete V992.56 release** and **must not be merged into upstream `main`**. It deliberately isolates the physical Home key work for integration testing.

The launcher keeps its normal Samsung application ID (`DclHome001.Home`). Installing a QA build of it on a TV that already runs the verified reference can update or replace the working installation. **Save the currently working signed WGT and settings before trying a QA build.** Use a separate test TV if available. Do not overwrite the working S90C merely to inspect the branch.

No changes to the Samsung privilege set, package identifier, on-boot service registration, Art Mode client, or CLI installer are intended.

## Manual TV acceptance tests

Test each scenario at least twice and record the TV model, Tizen version, firmware, expected behaviour, actual behaviour and whether the Home key worked.

| ID | Scenario | Expected outcome |
|---|---|---|
| H01 | Start AeroTizen after a cold boot | Launcher opens without flashing or repeated restart loops |
| H02 | Open Netflix from AeroTizen, then press physical Home | AeroTizen returns |
| H03 | Open YouTube (Cobalt), start playback, then press physical Home | AeroTizen returns **if the TV exposes the native Home foreground state**; otherwise preserve video playback rather than force a guessed return |
| H04 | Open Prime Video, Stremio, Spotify and press physical Home from each | Return where observable, otherwise no false interruption |
| H05 | Launch Live TV from the Sources row and change channels | The native TV viewer stays functional |
| H06 | Press physical Home while the native TV viewer is open | Returns to AeroTizen where TV app state is observable |
| H07 | Select the on-screen Samsung Home shortcut | Open Samsung Home without an immediate AeroTizen relaunch |
| H08 | Return to or reopen AeroTizen after Samsung Home | Watcher rearms automatically |
| H09 | Open an HDMI device and return | HDMI switching remains unchanged |
| H10 | Open the Samsung App Store and HbbTV apps | No unexpected launcher takeover during normal use |
| H11 | Disconnect the network / temporarily stop HomeWatcher | Native handoff failure is reported without a launcher loop; app launching stays usable |
| H12 | Frame model: enter Art Mode, then press Home | Never interrupt Art Mode; require fresh off state before any return |

**Important:** Hardware Home key events are controlled by Samsung's OS. This branch implements guarded detection in the background service; it does **not** claim a firmware-level remapping on every Samsung model.

## Automated checks

The following suites passed with simulated Tizen, TVWindow, HTTP, timers, and Art Mode state:

- `tests/watcher.test.cjs` — 35/35
- `tests/native_navigation.test.cjs` — 12/12
- `tests/home_key_launch.test.cjs` — 7/7
- `tests/home_integration.test.cjs` — 7/7
- `tests/launch.test.cjs` — 8/8
- `tests/glass_layout.test.cjs` — 5/5
- `tests/source_dock.test.cjs` — 5/5

Total: **79 targeted or upstream checks passed**. This is **not a GitHub Actions or real-TV test report**.

## Remaining integration work before a complete release

The QA branch does **not** yet include all five upstream PRs (#26–30) plus all remaining fork drafts. The completed reference source, `reference/v99256`, is the authoritative baseline for image assets and behaviour. The next integrated milestone must combine the language, clocks, HDMI standby, square/rectangle mode, all nine logo PNGs, all nine weather photographs, Samsung artwork caching, settings categories, and the native Home key improvements.

Do not mark this QA branch as a complete package or a final release until the full cross-feature automated tests and physical-TV sign-off are completed.
