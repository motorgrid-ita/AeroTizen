# Contribution and fork health audit — 2026-10-30

## Verified upstream and protected refs

Upstream and fork main are identical at `64574228cee973095af590cd9ff387467e84d3b7`.
No synchronization push or history rewrite was necessary.

The following refs were inspected and remain unchanged:
- `reference/v99256`: `c9c34bf0b8478bf1c156b41c0568f475f008d272`.
- `integration/pr49-pr37-s90c`: `a3c8d9385d7e2d41c68df667cc64062e4ac2e246`.

The reference and early upstream integration have separate ancestry from current
main. This is not a reason to reset or merge them. No branches were deleted.

## PR status and developer feedback

| PR | State verified | Remaining action |
| --- | --- | --- |
| #26 favourites | Merged | Preserve the hold-OK/focus behavior; do not reopen |
| #27 locale | Open, mergeable; includes main; CI green | metacurb's shared-i18n/pause request remains substantive |
| #28 clocks | Open, mergeable; includes main; CI green | Review and scoped physical clock/locale/persistence checks |
| #29 HDMI | Open, mergeable; includes main; CI green | Review and real standby/hot-plug/source switching checks |
| #30 Glass | Open, mergeable; includes main | New physical-longhand fix and test plan; validate exact new head |
| #34 cards | Merged | Preserve Samsung-local artwork and per-row choices |
| #37 handoffs | Closed, superseded | Changes merged by helalaou in #64; do not reopen or duplicate |
| #49 native HOME | Merged as experimental | Restore after uninstall remains physically unverified |
| #73 Preact Home | Merged | Preserve adapter boundaries and source-pinned acceptance |
| #74 weather package | Merged | Preserve nine JPEGs and their provenance in WGTs |
| Issue #18 | Closed as completed by metacurb | Coordinate #30 test, then broader UI cleanup |

Helalaou dismissed the old Preact migration requested-change reviews on #27–#30.
That does not constitute final approval of the open features. #27 still has a
CHANGES_REQUESTED review from metacurb: avoid locale-specific condition lists and
extracting fragments from already-composed messages; discuss a shared i18n
library once UI contributions settle. Existing Preact hooks and generic Intl
clock-locale preservation address only part of that request. I have not claimed
it is resolved or imposed an unagreed dependency during the pause.

I accepted metacurb's offer in
[Issue #18](https://github.com/helalaou/AeroTizen/issues/18#issuecomment-6519052639)
and will point testing to an exact green source/checksum, not a moving head.
The focused plan is `docs/pr30-hardware-validation.md` on the Glass branch.

New related work inspected: diagnostic reports #78, root/authentication #85,
release proposals #90/#91; older-Tizen native-helper issues #75/#84, source/CEC
#59 and native HOME limitations #65/#69/#76. None authorizes changing a TV or
rewriting their authors' work. New native transport/UI refactors must be inspected
again before future integration.

## Changes and validation

The #30 overlay used `inset: 0`, beyond the Chromium 69 target. Physical
top/right/bottom/left now express the same bounds. Four tests verify Classic and
Glass at 720p/1080p, the full viewport, final source-category focus and Back.
No native service, launching, HOME/startup, image choice or preference key changed.

Local complete validation in this audit:
- #30: lint, both TypeScript checks, ES2018/Chromium 69 production build,
  197 Node tests and all 59 browser tests.
- #28: lint/types/build, 204 Node tests and all 54 browser tests.
- #29: lint/types/build, 207 Node tests and all 47 browser tests.
- #27: lint/types/build, 206 Node tests and all 47 browser tests.
- Reviewed #30 WGT: all nine weather JPEGs, CREDITS/MANIFEST, Preact license and
  required runtime present; no excluded brand PNGs, personal packs or legacy
  logo-path script. Local reviewed unsigned SHA-256:
  `16107a85967f71f8bfa54150641ac2620d2d3b0dcff3e42fa9df5083966b8bef`.

Initial parallel audit runs on isolated ports exposed hardcoded baseline URLs in
the test harness: two comparisons on each nondefault-port branch connected to
8170 instead of their own baseline. Local port-only substitutions corrected the
transport, and complete suites passed; those substitutions are not published.
The first draft of the new test also used the wrong category key (inputs rather
than sources); the corrected test passed. Neither failure was hidden as a pass.

## Fork Actions root causes

All 34 failed historical runs returned by the failure query were inspected,
including complete logs for their failed jobs. Nine cancelled PR-title runs were
also inspected; some cancelled jobs had no retrievable log or never started.
Do not invent a missing-log cause. The title workflow explicitly cancels earlier
runs for the same PR; current maintained heads have successful title checks.

| Workflow / representative runs | Cause | Current disposition |
| --- | --- | --- |
| Release Please 41017898529, 40979317201 | Repository policy forbids Actions creating/approving PRs | Still blocked; not a launcher defect |
| Contributors 41017898433, 40979317021 | Same policy; generation/push succeeds but PR creation fails | Still blocked; default token scopes already declared |
| Integration 40889838055 | Initial focus-indicator motion changed exact header pixels during screenshots | Fixed later by immediate initial placement; unchanged strict assertions pass on current heads |
| Clock/integration 40704325677, 40704464304 | Test assumed Korean day-period text across differing Node/ICU output | Later tests compare runtime-provided fields; current locale tests pass |
| Early cards / i18n / HOME preflights | Artwork cache/fixture, header visibility and Ruff regressions on superseded heads | Later maintained heads pass; do not rerun obsolete snapshots to repaint history |
| Early custom integration QA | Old watcher/fixture/source assumptions in preserved historical integration | Superseded by current Preact/native contributions; preserved for history |

The main code CI at `64574228` is green. Combined validation at `3710703` and
artwork CI at `042a320` were green before this follow-up; new heads need their
own results. Historical failures remain visible as evidence.

Repository settings were read in the Work browser. Actions are enabled, default
workflow credentials remain read-only, and **Allow GitHub Actions to create and
approve pull requests** is unchecked. The YAML already requests job-scoped write
permissions for the two maintenance jobs. The managed connector cannot read the
administrative workflow-permissions endpoint. No secret value was accessed.

Changing that checkbox broadens automation capabilities; it was not silently
enabled, and no PAT/credential workaround was introduced. Required administrator
decision: allow that capability for this fork (without changing the read-only
default), then rerun failed jobs of 41017898529 and 41017898433 and verify the
resulting maintenance PRs. Re-running unchanged jobs before that decision would
repeat the known policy failure. Do not disable jobs, tests or checks to hide it.

Contributors also inherits an upstream force-push to its generated bot branch.
This audit did not execute that push or change that branch. Before enabling
unattended maintenance, review that bot-history policy; no user/reference branch
may be force-pushed. There are no repository rulesets exposed by the public API;
logical preservation of the reference is not a claim that a server rule exists.

## Branch retention

The four maintained feature branches, current combined/artwork branches and
fork main include latest upstream main. Merged/superseded branches (#26/#34/#37,
core Home, weather packaging/solar fix, physical-HOME prototype) remain intact.
Older native/artwork/QA branches have divergent or separate history and may
contain unique work; they were not deleted, reset or described as safely empty.
Release-please and contributor bot refs were preserved too. Fork PR #11 remains
a historical QA snapshot, not the current installation target; #12 is the active
artwork preview. Historical mirror PRs are not additional upstream proposals.

## Rights and hardware limits

No new third-party brand asset was added. The nine unresolved reference PNGs stay
outside public packages. An inherited logo script is not newly declared cleared;
the reviewed package omits it using the pinned existing artwork packager.
Samsung-local artwork remains the primary source. USB imports do not grant
copyright/trademark permission; #56 stays open.

I installed artwork correction `042a320` on my S90C, but USB testing remains
pending. Earlier S90C UI/native/weather results stay associated with their exact
tested sources. The new Glass compatibility fix, other TV models, real standby,
remote latency, reboot persistence and post-uninstall restore are not certified
by browser tests. No TV connection, installation, HOME/startup or firmware change
was performed by the development/automated validation work.


## Artwork-category test adaptation

The initial artwork merge CI 41057109252 passed the Python matrix, Windows HOME
and the existing 99 browser cases, but failed the four new sidebar cases: the
artwork preview appends an App artwork category after Inputs, so a fixed eight
Down presses ended on that additional category. The regression now derives the
Inputs index from the rendered sidebar and navigates there with the same remote
keys. Viewport longhands, focus visibility and Back assertions remain intact.
This is a test-navigation correction, not evidence that physical TV validation
has passed. The new commit must pass its own complete CI.
