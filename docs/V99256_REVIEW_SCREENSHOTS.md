# Visual evidence for upstream PR #26

## Requested evidence

On 24 October 2026, [metacurb asked for screenshots](https://github.com/helalaou/AeroTizen/pull/26#issuecomment-6387988514) so reviewers can see the changes and their appearance.

This is the only concrete discussion request currently recorded across upstream PRs #26–#30, #33–#35, #37 and #38. It is a request for visual documentation, not an approval or completed hardware review.

## Minimum capture set

| Image | How to show the state | What the image should demonstrate |
| --- | --- | --- |
| 1 — Home actions | On Home, highlight an application and hold OK until its menu opens. Capture before confirming an action. | The selected app and the Move / Remove from Home options. |
| 2 — Add from All apps | Press Back to dismiss. Open All apps, highlight an app that is not a Home favourite, then hold OK. | Add to Home, with enough of the All apps header visible to identify the view. |
| 3 — Remove from All apps | Dismiss with Back. Highlight an app already present on Home, then hold OK. | Remove from Home, demonstrating that membership controls the offered action. |

Dismiss each menu with Back. Capturing these states does not require adding/removing an app, installing another build, running a native helper or changing firmware.

A fourth overview of Home is optional. A short video is optional if the reviewer later needs evidence of short/held OK, release handling and Back navigation.

## Evidence labels

Keep these two evidence types separate:

- **Working V992.56 reference on the owner's Samsung:** useful real-TV visual reference for the UX being ported. These images do not certify the upstream-adapted code.
- **Proposed upstream branch rendered in a desktop browser:** useful evidence of the actual proposed HTML/CSS. It does not certify Tizen native APIs or TV performance.

Never caption a reference photo as a screenshot of the proposed upstream branch.

## English captions for reference photos

1. **V992.56 reference implementation on Samsung S90C — Home tile actions.** Holding OK opens Move / Remove from Home without launching the app.
2. **V992.56 reference implementation on Samsung S90C — All apps, app not on Home.** The menu offers Add to Home.
3. **V992.56 reference implementation on Samsung S90C — All apps, existing Home favourite.** The menu offers Remove from Home.

Add this note alongside the images:

> These photos show the working V992.56 reference implementation on a Samsung S90C. The upstream adaptation is covered by automated regression tests; its actual TV visual/performance acceptance remains pending.

If actual proposed-branch browser screenshots are supplied instead, replace the reference labels with the exact branch/commit and state that the captures are desktop previews.

## Received visual evidence — 24 October 2026

Six digital PNG captures were supplied from the existing Samsung S90C installation, all 1920 × 1080. Four unchanged images were selected for the [reference gallery](screenshots/v99256-reference/README.md): Home overview, Home actions, directional reorder state, and Add to Home inside All apps.

The other two captures show the Home removal selection and an All apps overview. They do not show Remove from Home inside All apps; that specific capture remains pending.

The reference-gallery images are being linked from PR #26 with explicit scope/evidence labels. They document the working V992.56 reference, not the proposed upstream branch. The CI screenshot is not launcher visual evidence.

No new TV installation or TV/firmware operation has been performed to prepare this document.
