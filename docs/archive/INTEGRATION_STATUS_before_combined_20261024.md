# AeroTizen — V992.56 single integration track

## Upstream porting status — 24 October 2026 (latest update)

The protected original `reference/v99256` is unchanged. All implementation PRs are
based on fork `main`, not on the standalone reference snapshot. All GitHub
PR titles, descriptions, and implementation commits remain in English.

### Submitted to `helalaou/AeroTizen`

| PR | Contribution | Status and remaining work |
| --- | --- | --- |
| [#26](https://github.com/helalaou/AeroTizen/pull/26) | Home app actions / favourites | Open, awaiting maintainer review |
| [#27](https://github.com/helalaou/AeroTizen/pull/27) | Automatic English / Italian locale | Open; added HDMI override translations; fork CI passed on `938082e` |
| [#28](https://github.com/helalaou/AeroTizen/pull/28) | Classic / custom clock layouts | Open, awaiting review and integration QA |
| [#29](https://github.com/helalaou/AeroTizen/pull/29) | HDMI standby recognition | Open; **manual per-port keep-visible override**, persistence and D-pad settings now included; [fork CI success](https://github.com/motorgrid-ita/AeroTizen/actions/runs/40120665625) |
| [#30](https://github.com/helalaou/AeroTizen/pull/30) | Glass Settings, source dock and D-pad | Open; manual HDMI controls now categorised as Inputs; fork CI passed on `9466a47` |
| [#33](https://github.com/helalaou/AeroTizen/pull/33) | Physical Samsung remote HOME binding | Open; guarded S90C native reference plus generic read-only survey; [fork CI success](https://github.com/motorgrid-ita/AeroTizen/actions/runs/40117830776). **No universal firmware writer** |
| [#34](https://github.com/helalaou/AeroTizen/pull/34) | Square / Rectangle cards, original brand banners | Open; **Samsung Square artwork positive/negative resolution cache** added, with original onload timing preserved; [fork CI success](https://github.com/motorgrid-ita/AeroTizen/actions/runs/40121147162) |
| [#35](https://github.com/helalaou/AeroTizen/pull/35) | Photographic weather wallpapers | Open; [fork CI success](https://github.com/motorgrid-ita/AeroTizen/actions/runs/40114556880). Review image redistribution rights |

All eight upstream PRs are unmerged and awaiting maintainer review as of
24 October 2026. Upstream Actions report `action_required` and require
maintainer handling; **fork CI success is not upstream acceptance or TV hardware QA**.

### Completed but not yet submitted to upstream

**Native Samsung Home / Live TV / YouTube handoffs:**
`feat/launcher-v99256-native-handoffs` (head `4639146f64f1bb8dc45a67b3397c020cc04056f9`).
This is the least-invasive upstream port of the V992.56 acknowledged
`/leave` handoff for Cobalt YouTube, native Samsung Home and the native TV
viewer, preserving the current Frame-aware `launcher/service/index.js`
unchanged, with HDMI continuing to use upstream TVWindow. Sixteen offline
tests were added; [fork CI passed all four jobs](https://github.com/motorgrid-ita/AeroTizen/actions/runs/40120364898).
The previous upstream [#32](https://github.com/helalaou/AeroTizen/pull/32)
was closed without merging and does not cover this prepared branch.
**Opening the new upstream PR from the GitHub connector returned 403
Resource not accessible by integration.** The code is ready for maintainer
review, but no new upstream PR has been created for it.

[Upstream compare / create PR](https://github.com/helalaou/AeroTizen/compare/main...motorgrid-ita:feat/launcher-v99256-native-handoffs?expand=1)

Suggested title:
`feat(launcher): preserve V992.56 native Samsung and Cobalt handoffs`

### Genuine V992.56 coverage gaps / QA

1. Reconcile the full categorised wallpaper Settings UI (photo / animated /
   gradients / solid), with the new Glass Settings and D-pad categories.
2. Independently review the remaining Home/All Apps DOM caching, focus, scroll
   and transition optimisations from the protected reference; avoid reverting
   existing upstream fixes. Square Samsung artwork discovery caching was added
   to #34, but **this is not full UI performance parity**.
3. Resolve integration conflicts between the independent PRs touching
   `launcher/index.html`, `launcher/js/settings-ui.js` and other shared UI.
   Individual passing suites do not establish a tested combined bundle.
4. Verify actual TV behaviour of native YouTube, Samsung Home, Live TV, standby,
   Frame Art Mode and D-pad focus using a disposable signed QA build with
   rollback. **Never overwrite the tested installed V992.56** for these tests.
5. Verify redistribution rights for bundled PNG/JPEG artwork in #34 and #35.
6. Expand physical HOME support only via independently verified device model,
   exact firmware, read-only baseline, tested restore, and owner approval.
   Do not weaken the #33 firmware guard or copy S90C original values to
   arbitrary Samsung TVs.

### Hard rules

- Keep `reference/v99256` unchanged as the tested reference.
- Do not claim physical remote HOME is solved by HomeWatcher JavaScript alone.
- Do not open duplicate PRs for #26-#30, #33-#35.
- Keep the latest native-handoff branch independent of #33, and do not
  transplant the retired experimental service rewrite.
- Do not mark the official project port complete until the combined QA matrix
  and actual TV tests pass.

---


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
