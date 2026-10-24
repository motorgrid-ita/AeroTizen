# AeroTizen — V992.56 single integration track

**Active working branch:** `integration/v99256-upstream`  
**Protected TV-tested reference:** `reference/v99256` at `c9c34bf0b8478bf1c156b41c0568f475f008d272`  
**Upstream:** `helalaou/AeroTizen` (`main`)  
**Latest Frame integration CI:** [successful GitHub Actions run #40097539342](https://github.com/motorgrid-ita/AeroTizen/actions/runs/40097539342).

This is the only active integration track. The formerly experimental fork PRs #5–#8 are closed, and `qa/glass-physical-home-live-tv` is retired. The already-submitted upstream PRs #26–#30 remain separate, open and unmerged. Do **not** create duplicate PRs or merge into upstream without review.

## Non-negotiable V992.56 behaviour

Keep the tested **physical HOME**, YouTube/Cobalt handshake, native Samsung Home, Live TV and HDMI routes, Square/Rectangle tiles, nine original branded PNGs, nine weather JPEGs, Glass Settings, clocks, backgrounds, animations and D-pad experience. A new feature is accepted only if existing behaviour is verified.

The following remain byte-identical to the reference:

- `launcher/js/homewatch.js` — `82c1c97c2fc111aea2f9f1d05f805f7b6e3c01fd`
- `launcher/js/inputs.js` — `ecf1f13e95f83c96809adcfc5ffd59c4bf396191`
- `launcher/index.html` — `f4a53ea1b28b774e1c1c74659a0dc54c32c044fc`
- All **nine brand PNGs and nine weather JPEGs**, compared against original Git blob IDs.

The **service `launcher/service/index.js` is intentionally no longer byte-identical** because of the next increment. Its proven `launchSelf` implementation is preserved in `launchOriginal`, with its exact function text verified by a pinned SHA-256 test. No experimental native Home probing, launcher key remapping, or rewritten YouTube logic was imported.

## Increment 01 — upstream HbbTV compatibility

**Committed; automated tests passed; TV testing outstanding.**

- `launcher/js/config.js` provides official HbbTV host constants.
- `launcher/js/apps.js` supports HbbTV wrapper metadata and includes the host in app discovery.
- **YouTube is checked first**, retaining the original confirmed `/leave` handoff. Ordinary apps retain their original `/watch` behaviour.

## Increment 02 — guarded Frame Art Mode compatibility

**Committed; automated tests passed; Frame hardware testing outstanding.**

- `launcher/service/artmode.js` and its protocol tests were copied unchanged from current upstream Git objects.
- `launcher/service/frame-gate.js` is a separate opt-in-by-device guard: valid normal Samsung TVs use the original HOME relaunch function directly.
- For confirmed Frame models, the service requires **two fresh independent Art Mode “off” replies**, repeated checks that AeroTizen is hidden and no monitored app is unexpectedly visible, then a fresh power-on/Frame identity check.
- Art Mode “on” or “unknown”, an unsupported TV capability response, application changes, or a `/leave` cancellation prevent a speculative relaunch. A background retry never skips these checks.
- The original HomeWatcher application ID, service endpoint, manifest registration, YouTube handoff and Live TV path are preserved.
- The added boot retry timer stops when the launcher has already started, avoiding needless polling.

**Note:** Initial boot and application state reporting vary by firmware. This guard is deliberately conservative: when a Frame's capability or Art state is unavailable, it may delay or refuse Home reclaim instead of interrupting artwork.

## Verification

Automated GitHub Actions executes `find launcher -name '*.js' -type f -print0 | xargs -0 -n1 node --check` and `node --test tests/*.test.cjs`, plus the pinned original-file integrity tests.

The latest **combined suite passed on GitHub Actions**: [run #40097539342](https://github.com/motorgrid-ita/AeroTizen/actions/runs/40097539342), covering the official Art protocol module, Frame/non-Frame gate, complete service boot/Home scenarios, preserved S90C HOME contract and binary artwork integrity. These are simulated Tizen/HTTP/Art devices, **not real-TV verification**.

## Remaining work — do not mark complete

1. Confirm the Frame guard against a real Samsung Frame in Art Mode and test the normal S90C HOME/YouTube/Live TV paths on a disposable signed QA build with rollback. **Do not overwrite the currently working V992.56.**
2. Reconcile original V992.56 artwork and app-display internals with upstream cache, app catalog and recognized-HDMI handling *one change at a time*; preserve all original branded images.
3. Reconcile the already-open upstream PRs #26–#30 with the reference behavior without sending duplicate changes.
4. Preserve full Settings, Square/Rectangle graphics, clock/i18n, wallpapers and animation parity through regression and visual tests.
5. Build and test a single packaged integration QA artifact, then publish upstream-compatible changes in reviewable increments. Acceptance of official PRs remains the upstream maintainer's decision.

**Do not install or announce this branch as a complete production build.** It uses the same Tizen application ID and has not passed TV hardware acceptance yet.
