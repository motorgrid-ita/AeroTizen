# AeroTizen — single integration track from proven reference

**The only active integration branch:** `integration/v99256-upstream`  
**Immutable proven source:** `reference/v99256` at commit `c9c34bf0b8478bf1c156b41c0568f475f008d272`  
**Official upstream:** `helalaou/AeroTizen` (`main`)

## What we stopped

Experimental fork draft PRs **#5–#8 are closed**. The old `qa/glass-physical-home-live-tv` branch is archived and marked **do not install or merge**. None of their experimental HomeWatcher changes will be introduced by default.

Upstream PRs **#26–#30** were already submitted and remain independent and unmerged. Their contents must be reconciled carefully against this tested baseline; no automatic merges or replacement of upstream `main`.

## Non-negotiable reference behaviour

Preserve V992.56's **physical remote HOME return**, YouTube/Cobalt launch handshake, native Samsung Home shortcut, native Live TV viewer and tuner routing, HDMI behaviour, original 9 branded PNGs, original 9 Full-HD weather images, glass UI and D-pad transitions, including the Square/Rectangle card modes and all original settings.

At the first integration milestone, the following Git blobs are **unchanged from the reference**:

| File | Original Git blob SHA |
|---|---|
| `launcher/js/homewatch.js` | `82c1c97c2fc111aea2f9f1d05f805f7b6e3c01fd` |
| `launcher/service/index.js` | `8aeaf3e87ed6efa23bdf8ce0196295529d149a7d` |
| `launcher/js/inputs.js` | `ecf1f13e95f83c96809adcfc5ffd59c4bf396191` |
| `launcher/index.html` | `f4a53ea1b28b774e1c1c74659a0dc54c32c044fc` |

## Increment 01 — imported upstream HbbTV support

**Status: committed to the integration branch, Node test pass; hardware test pending.**

Only `launcher/js/apps.js` and `launcher/js/config.js` differ functionally from V992.56:

- HbbTV link metadata now routes hosted content to `org.tizen.hbbtv` using the Tizen AppControl data contract.
- HbbTV host is included in the watcher app inventory.
- Ordinary application and YouTube/Cobalt launch paths **remain unchanged**.
- No experimental HomeWatcher replacement, Tizen package ID change, or updated configuration/reset is included.

Checks: `node --test tests/*.test.cjs` = **11/11 passed** on an actual Node.js runner; syntax checks passed for all original JS files. These are mocked device interfaces, *not physical Samsung TV tests*. Two regression test files are committed alongside the feature.

## Next increments — not yet applied

1. Compare official HbbTV/launcher inventory handling and apply only follow-up fixes actually required by the current upstream, preserving the first increment.
2. Carefully add official Frame Art Mode safety checks *without overwriting the proven HomeWatcher behaviour*. Test this on a Frame device, not just S90C.
3. Port other upstream improvements individually: source/app identity lookups, artwork performance, Home/All Apps, clock/i18n changes, official Settings conventions and CLI/release compatibility.
4. Run tests after each increment and maintain all original theme assets (9 brand PNGs and 9 weather JPEGs).
5. Prepare one full integration build for **explicit hardware acceptance**, retaining a rollback copy of the signed working WGT/settings before any install.
6. Prepare upstream-compatible contributions based on the current upstream `main`; do not propose a wholesale launcher replacement from this unrelated-history snapshot.

## Verification gate

No claims of complete V992.56 integration or universal Home-key remapping until the whole combined app passes its tests and hardware acceptance. In particular, Samsung's local application visibility API behaves differently for Cobalt/YouTube and native TV apps. The Frame's Art Mode must never be interrupted.

**Do not install this branch on the user's working S90C yet**; it shares the same Tizen app ID and is a source-level integration branch, not a signed QA release.
