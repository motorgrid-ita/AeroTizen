# Preact contribution parity review

This review revisits the implementation rather than treating a green CI run as proof
of complete parity. It compares upstream `c4b649b`, the preserved reference tree
`c9c34bf`, the focused PR trees and the combined integration. No TV operation is part
of this review. A later owner-confirmed motion/header/focus acceptance is recorded in
[the S90C acceptance report](s90c-preact-acceptance-2026-10-29.md); historical review
findings below do not expand that exact-build hardware scope.

## Confirmed findings and corrections

| Finding | Evidence / correction | Regression coverage |
| --- | --- | --- |
| Clock layout changes left cached Settings navigation geometry stale. Remote Down skipped newly shown style controls or could address hidden controls. | Make `clockLayout` an explicit layout dependency, as with the existing dynamic sections. Preserve the selected control; remeasure only when the layout changes. | Compiled Classic and Glass tests switch both ways and press actual directional keys immediately afterward. |
| Splitting a formatted time on `:` did not support Finnish dot separators or Korean leading day periods. | Expose optional structured fields from the existing clock formatter and consume them in CustomClock. Keep the full localized accessible label and a guarded string fallback for older Intl implementations. No additional timer or weather client. | Finnish and Korean compiled browsers; Node tests also cover Arabic digits, leading day periods and unavailable Intl. |
| Stale uninstalled favourite IDs consumed a move step without changing visible order. A disappearing moving app could subsequently remove another favourite through a negative splice index. | Use the same installed/visible IDs for movement and saving. Cancel a move/menu whose target disappears without committing another app's removal. | Browser tests seed a missing ID and remove the moving app during an inventory refresh. Check visible order and saved favourites. |
| A held OK survived a hidden session when the native app consumed key release. | Cancel pending key/menu state on visibility loss and restore through the existing Home bridge. Background inventory updates cannot reactivate Home focus. This also hardens an interruption case the legacy renderer did not cancel. | Hide during a held press, refresh the background inventory, return and verify no menu/accidental launch followed by a working new short press. |
| Manual HDMI visibility was rendered as an empty/dimmed port, differing from the reference; the core renderer also ignored active/recognised source reachability. | Preserve the reference `alwaysVisible` distinction. A pinned port stays reachable without changing its disconnected signal flag. Glass labels `RECOGNISED` and `PINNED` describe evidence, not proven standby or a live signal. | Source-service Node tests plus Classic/core and combined Glass browser cases; Automatic hides the manually pinned port again. |

The first clock-navigation, time-splitting, stale-ID movement and held-key scenarios
were reproduced as failing tests against the prior build before the corrections.
The reference source explicitly distinguishes manual visibility from connection
status. An existing test that equated a pin with the `off` appearance was corrected
to assert both reference appearance and an unchanged `connected: false` signal.

## Requirement-to-evidence audit

| Requirement | Evidence and boundary |
| --- | --- |
| Preact/TypeScript Home and Settings | Production HTML uses the two Preact mounts and one runtime bundle. Legacy Home/Settings source remains an unloaded comparison fixture; it is not the production implementation. |
| Current upstream / safe history | Focused branches merge forward; updates preserve their existing remote heads as parents. Reference and previous native-handoff integration refs are untouched. |
| Four clock styles and saved preferences | Original layout/style keys and CSS typography retained; compiled tests exercise all four styles, date/time visibility, 12/24-hour formatting and reload. Localized field tests address the review finding above. |
| HDMI recognition, filtering and deduplication | Raw Samsung editName and active/source reports remain evidence. A custom AeroTizen label alone is not recognition. Connected raw source wins duplicates; manual pins do not invent a signal. Real firmware inventory remains a hardware check. |
| Glass navigation and visual consistency | Five Preact categories, scope navigation, text/IME priority, Back/Left, close control, one measured focus plate and paired Classic geometry are tested. New clock controls are checked with D-pad in Glass too. TV animation/latency is unmeasured. |
| Source dock / header / Samsung escape | Existing services supply commands. Header, status badges, dimming and acknowledgement adapters are tested. Source visibility and real source activation are distinct. |
| Square/Rectangle and row count | Six layout/column combinations, persistence, directional movement and geometry covered. The upstream Samsung artwork candidate pipeline and resolution are retained. Actual Samsung image quality requires a TV. |
| Custom banners | The unverified bundled brand PNGs were removed following upstream review. No user-file/banner importer exists in this contribution. This remains an explicit scope deviation, not a completed feature or a new licensing claim. |
| Native HOME #49 | No native helper, policy, watcher protocol or binding code changed. Existing Linux/Windows native-control tests remain required. The physical remote is not simulated by those tests. |
| Live TV / YouTube / Prime #64 | App/handoff service files are unchanged. HDMI changes do not rewrite the native Live TV handoff block. Existing acknowledgement/launch tests and compiled Settings escape tests remain required. Channel ownership and return latency require hardware. |
| Continue Watching | Existing discovery/cache/late-feed/reorder/carousel/launch/persistence browser regressions remain. Preact retains changed records by key while updating their progress; the assertion checks that behavior rather than legacy node replacement. |
| Weather photos #35 and cache #72 | Exact #72 weather/solar code retained; all nine image hashes, dimensions and budgets checked. Opt-in/offline/location/23:00 tests remain required. Release packaging #74 includes all scenes plus provenance. |
| Translations | Existing upstream Intl formatting and optional translation adapters are preserved. Automatic English/Italian UI PR #27 is still separate and not silently incorporated. New English labels without dictionary entries fall back to English; complete UI translation is not claimed. |
| Backgrounds and preferences | Shared state/actions persist original keys. Browsing Glass categories changes no preferences; selecting an ordinary background exits photo mode through the existing weather service. Existing background choices and speed/text-entry behavior remain. |
| Older Tizen compatibility | Existing dependencies/tooling and Chromium 69/ES2018 target retained; structured Intl fields are optional. Parsing/build checks do not prove old-TV CSS, fonts or performance. |
| Packaging, signing and rollback | Deterministic unsigned WGT includes all nine scenes/provenance. Owner-only signing verifies author/signatures/digests. Private keys and known-good backup stay on the PC. No package installation or Home/boot reset is performed here. |

## Acceptance statement

The corrected integration must pass its full automated suite and the focused PR
checks. This review establishes reproducible corrections and records the evidence
for each requested area. It does not establish that every possible firmware path
is correct. Hardware-dependent items, unsigned-package signing and the explicit
banner/translation scope boundaries above remain open. Earlier S90C confirmations
apply to their earlier exact builds, not to this Preact renderer.


## Later owner acceptance — 2026-10-29

The owner confirmed the supplied motion/header/theme/focus checklist after an
in-place installation of runtime `aec386a5672c989e77a685cda042eae20e40848f`.
See [the exact build, successful CI and remaining physical coverage limits](s90c-preact-acceptance-2026-10-29.md).
This supersedes earlier blanket pending wording for those specific checks; it does
not certify every firmware path or each standalone feature branch.
