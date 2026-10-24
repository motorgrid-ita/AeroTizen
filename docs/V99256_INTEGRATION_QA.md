# V992.56 upstream integration verification

Date: 24 October 2026. Status: **source integration candidate; hardware acceptance pending**.

## Protected baseline and scope

- TV-tested reference: `reference/v99256` at `c9c34bf0b8478bf1c156b41c0568f475f008d272`, unchanged.
- Official baseline: `helalaou/AeroTizen:main` at `69aecf8e4e20497a68116af3d5cefafe08a7d80d`.
- Combined QA source: `integration/v99256-combined-qa` in the fork.
- No television connection, installation, native helper execution, firmware write, or replacement of the working V992.56 took place.
- All contributions target the existing official project. The older reference-based integration branch remains historical; its root status file points here.

## Published contributions

All ten official PRs below are open, unmerged and awaiting maintainer acceptance. No duplicate physical-HOME or visual PR was created. PR #32 remains closed and superseded by #37.

| Official PR | Source coverage and final behavior |
| --- | --- |
| [#26](https://github.com/helalaou/AeroTizen/pull/26) | Short/held OK, Move/Add/Remove favourites, persistence; now parks Home/All apps DOM in fragments and invalidates caches on explicit renders. |
| [#27](https://github.com/helalaou/AeroTizen/pull/27) | TV English/Italian locale, fallback, dates/messages, wallpaper category and unavailable-network labels. Never translates app, custom input or location names. |
| [#28](https://github.com/helalaou/AeroTizen/pull/28) | Classic/custom clock, four styles, weather/date/time visibility; optional translation of rich choice labels. |
| [#29](https://github.com/helalaou/AeroTizen/pull/29) | Recognised HDMI devices in standby, selected-source hints, deduplication, persistent per-port visibility exceptions. |
| [#30](https://github.com/helalaou/AeroTizen/pull/30) | Glass Settings/header/source dock, compact category selection before expansion, single focus outline, wallpaper category filters, source icons and native-Home bridge. Settings escape is now reachable by D-pad. |
| [#33](https://github.com/helalaou/AeroTizen/pull/33) | Exact-firmware guarded optional S90C physical HOME tooling and generic read-only survey. Unmodified by this integration. No universal writer. |
| [#34](https://github.com/helalaou/AeroTizen/pull/34) | Square/Rectangle cards, 3/4/5 columns, original brand PNGs and shared positive/negative Samsung Square artwork lookup cache. |
| [#35](https://github.com/helalaou/AeroTizen/pull/35) | Nine original weather JPEGs, automatic weather/day/night/solar scenes, upstream provider/cache, disabled by default. |
| [#37](https://github.com/helalaou/AeroTizen/pull/37) | Acknowledged `/leave` before YouTube/Cobalt, native Samsung Home and Live TV; real upstream `/home` error recovery; TVWindow HDMI and legacy fallback. Independent of #33. |
| [#38](https://github.com/helalaou/AeroTizen/pull/38) | Validated Samsung Wi-Fi levels 1–5, standard Tizen fallback, unavailable/unknown status, stale callback rejection and idempotent startup. |

## Direct reference-source audit

The port deliberately maps behaviors into official modules rather than importing the reference's historical stack of CSS/JS overrides.

| Reference modules reviewed | Port / decision |
| --- | --- |
| `home-screen.js`, favourites CSS | #26, combined header-focus resolution with #30; fragment batching and tile reuse retained. |
| `v9-theme.js`, `s90c-samsung-artwork.js`, `brands.js`, app/banner/Square CSS | #34. Original binary imagery preserved. Official ID-first catalogue and image callback sequencing retained. |
| `s90c-clock-v991.js`, clock-layout/custom/header visibility modules | #28 plus official clock/date formatters. Existing upstream regional defaults and visibility behavior preserved. |
| `s90c-custom-v992.js`, reference weather/background modules | #35 and #30 filters. Choosing a concrete background disables photo mode; merely browsing categories does not save or change it. |
| `s90c-settings-sections.js`, compact/reactive settings modules, wall categories and glass/single-focus CSS | #30. Deferred compact category details, original node identity/callbacks, wallpaper filters, focus and scroll. |
| `inputs.js`, source dock | #29/#30; #37 changes only TV native handoff. HDMI continues through official TVWindow. |
| `apps.js`, `homewatch.js`, native handoffs | #37 retains `/leave` acknowledgement and real recovery. Official HbbTV discovery/catalogue and Frame-aware service retained. |
| `s90c-network-status.js` | #38 validates Samsung discrete readings and unknown status without assuming the TV is on Wi-Fi. |
| Reference standalone configuration/defaults and packaging | Intentionally preserve official application identity, existing user preferences, regional defaults, CLI, release tooling and supported APIs. Do not import obsolete paths or force the owner's defaults on other users. |
| Native physical HOME environment | #33 exact guard remains. A JavaScript HomeWatcher is not a physical key binding. |

No additional useful behavior gap was identified in this source audit. This is not a claim of pixel parity, timing parity, universal firmware support, or completed TV acceptance.

## Combined conflict resolutions

Independent PRs are individually mergeable into the official baseline, but their shared edits conflict with each other. The combined QA tree records these resolutions:

1. `launcher/index.html`: load each stylesheet and module once; locale before consumers; native handoff after HomeWatcher and before apps/inputs; settings extensions before main. Preserve all optional card, clock, HDMI and photo controls.
2. `settings-ui.js`: render every contribution; keep all optional rows; route native Samsung Home when available; refresh wallpaper filtering after render; compact D-pad expansion/collapse.
3. `inputs.js`: combine locale labels and recognised/manual visibility with the Glass source dock; fix console regex; preserve original source objects and HDMI behavior.
4. `home-screen.js`: combine four header targets with favourites and Square/Rectangle rendering; correct empty-Home focus to the actual Home tab; reuse tile DOM on pure tab changes, invalidate both caches after mutations.
5. Test fixtures: account for real source-dock DOM and localization without suppressing assertions. The complete jsdom boot also exercises the actual HTML, script order and all integrated Settings controls.

These merge resolutions must be carried forward when the maintainer lands the independent PRs. The combined fork PR is a QA vehicle, not a duplicate upstream feature submission.

## Automated validation

Final combined local result:

- `npm test`: **205 passed, 0 failed** (includes actual HTML/script-order boot in jsdom).
- `python -m pytest`: **135 passed and 30 subtests passed**.
- `npm run lint`: passed.
- `python -m ruff check .` and `python -m ruff format --check .`: passed.
- `git diff --check`: passed.
- SHA-256 integrity test pins all **nine brand PNGs and nine weather JPEGs** against the protected reference.
- The official `launcher/service/index.js`, `launcher/service/artmode.js` and `launcher/config.xml` are byte-identical to the official baseline.

Coverage includes watcher/Frame protocol simulations, Cobalt handoff order and failures, native Home/TV failures, HDMI fallback and standby, artwork caching, favourites cache identity/invalidation, clock/locale, wallpaper filtering without preference mutation, all five Settings categories by D-pad, native Samsung escape routing, native helper guards, CLI/release packaging, and asset integrity.

The full-DOM harness simulates layout geometry and disables live network/time APIs. It is **not a browser rendering or TV performance test**. An attempted local Chromium download was unavailable; no screenshot-based layout acceptance is claimed. Production Tizen WebKit and Samsung native APIs are not executed by jsdom.

Fork GitHub Actions and the official PR checks must be read at their exact heads. Upstream workflows require maintainer approval; historical successful fork runs do not certify a newer head. See the combined fork PR for its CI result.

## Hardware acceptance matrix — all pending

| Device / scenario | Required acceptance |
| --- | --- |
| S90C, exact known firmware | Physical HOME from ordinary apps, Cobalt, TV, HDMI and standby; confirm launcher return and a tested restore. |
| Other Samsung generations | Ordinary apps, supported native Home/TV IDs and AppControl permissions; safe unsupported/error handling. |
| Samsung Frame | Art Mode on/off/unknown, boot, standby and casting; no speculative artwork interruption. |
| YouTube/Cobalt | `/leave` acknowledgement before launch; no bounce-back; error recovery; physical HOME return. |
| Native Samsung Home / Live TV | Explicit native launch, tuner/channel controls, return/reload, denied launch and focus behavior. |
| HDMI | Sleeping recognised devices, empty ports, selected source, manual overrides and device label variations. |
| Visual/D-pad | 1920x1080 and supported TV runtimes, all card shapes/columns/clock styles, compact settings, clipping, single borders, rapid repeats and reduced motion. |
| Network | Samsung level API capability/permission, standard signal fallback, Ethernet/offline/unknown reports. |
| Long sessions | Cache invalidation after catalogue/favourite/locale changes, memory and responsiveness on real Tizen. |

Any later TV test needs separate authorization and a genuinely isolated disposable signed package with a different verified app/service identity and rollback plan. The current source uses the official identity and **must not be installed over the working V992.56**.

## Outstanding non-hardware review

- Maintainer review, approval of upstream Actions and final merge decisions.
- Redistribution/provenance review for the 18 original bundled bitmap assets. Byte identity does not establish licensing permission. Their source/license evidence is not available in the reference snapshot.
- Visual and performance acceptance; device-specific failures may require follow-up changes.
- Universal physical HOME support remains out of scope until each model/firmware baseline and restore are independently verified.

## Received native reference screenshots — 24 October 2026

Four unchanged 1920 × 1080 PNG captures from the existing Samsung S90C V992.56 installation are now published in the [PR #26 description](https://github.com/helalaou/AeroTizen/pull/26) and indexed in the [reference gallery](screenshots/v99256-reference/README.md). They show Home, Home actions, reorder arrows, and Add to Home from All apps. Remove from Home inside All apps remains pending. These are reference screenshots, not hardware acceptance of the proposed upstream source.
