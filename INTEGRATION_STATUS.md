# AeroTizen V992.56 integration status

Updated: 24 October 2026.

## Current integration track

The combined source candidate is now [`integration/v99256-combined-qa`](https://github.com/motorgrid-ita/AeroTizen/tree/integration/v99256-combined-qa), recorded in [fork QA PR #11](https://github.com/motorgrid-ita/AeroTizen/pull/11). This root file remains the canonical project register. The reference-based code on this historical branch is not the current upstream-compatible QA candidate.

[Full coverage, conflict resolutions, tests and hardware matrix](https://github.com/motorgrid-ita/AeroTizen/blob/integration/v99256-combined-qa/docs/V99256_INTEGRATION_QA.md).

Protected reference `reference/v99256` remains unchanged at `c9c34bf0b8478bf1c156b41c0568f475f008d272`. The functioning TV installation was not accessed or changed.

## Official pull requests

| PR | Contribution | Status | Reviewed head |
| --- | --- | --- | --- |
| [#26](https://github.com/helalaou/AeroTizen/pull/26) | feat(launcher): manage Home favourites from app tiles | Open, awaiting maintainer | `606c1673eda930c15514ea1e113f8e1b76ce72cc` |
| [#27](https://github.com/helalaou/AeroTizen/pull/27) | feat(launcher): follow TV language for English and Italian UI | Open, awaiting maintainer | `684135c172f962c4fa8472b785291189879c0435` |
| [#28](https://github.com/helalaou/AeroTizen/pull/28) | feat(launcher): offer classic and custom clock layouts | Open, awaiting maintainer | `2aa23621efbcdfeb6597709fcf72a7cff382b180` |
| [#29](https://github.com/helalaou/AeroTizen/pull/29) | feat(launcher): retain recognised HDMI devices in standby | Open, awaiting maintainer | `66dcfa40628ec104d6dd0053026ddc0e3e3987e9` |
| [#30](https://github.com/helalaou/AeroTizen/pull/30) | feat(launcher): unify glass settings and Home navigation | Open, awaiting maintainer | `bcbbdfa461d1210c2d41be22d0f46a7fc2605bcc` |
| [#33](https://github.com/helalaou/AeroTizen/pull/33) | feat(native-home): optional physical Samsung HOME binding with compatibility checks | Open, awaiting maintainer | `e2b3df6905bf38c158c8c057039fef67a9530492` |
| [#34](https://github.com/helalaou/AeroTizen/pull/34) | feat(launcher): offer Square and Rectangle Home card layouts | Open, awaiting maintainer | `3463fd3fdda1b040662e10208f0a1745f197aaf3` |
| [#35](https://github.com/helalaou/AeroTizen/pull/35) | feat(launcher): add optional photographic weather wallpapers | Open, awaiting maintainer | `f18f055e4867406b352844ecfd15c77865ca8d2a` |
| [#37](https://github.com/helalaou/AeroTizen/pull/37) | feat(launcher): preserve V992.56 native Samsung and Cobalt handoffs | Open, awaiting maintainer | `3a676b9bd06fa0d57f88d8e983dd837dc75c0a78` |
| [#38](https://github.com/helalaou/AeroTizen/pull/38) | fix(launcher): preserve Samsung signal levels and unknown network status | Open, awaiting maintainer | `3b8190a2eeb7d44160c3ef4b28ed4fb09453b04b` |

The new native-handoff PR is **#37**, published from `feat/launcher-v99256-native-handoffs`; it does not duplicate physical-HOME PR #33. The retired #32 remains closed. The additional network-status parity fix is #38.

## Completed source work

- Combined all ten contributions with shared HTML, Settings, input and header-focus conflict resolutions.
- Extended #26 with batched DOM construction and Home/All apps tile caching with invalidation.
- Extended #30 with wallpaper category filters, compact/deferred category navigation, actual-background selection exiting photo mode, and D-pad Samsung Home escape reachability.
- Completed clock/locale interoperability in #27/#28.
- Fixed #37 YouTube failure recovery using the real upstream `/home` interface and routed Settings escape through native handoff.
- Ported validated Samsung signal levels, safe standard fallback, unknown-state reporting and stale callback handling in #38.
- Preserved the official HbbTV/catalogue behavior, Frame-aware service and manifest, and all 18 original bitmap bytes.

## Verification

Combined local checks: **205 Node tests passed; 135 Python tests and 30 subtests passed; ESLint and Ruff checks/formatting passed; diff whitespace checks passed**. Full-DOM boot and D-pad checks use jsdom with simulated layout. No rendered-browser, real native API or TV performance acceptance is claimed.

Combined fork CI: [run #40124174636](https://github.com/motorgrid-ita/AeroTizen/actions/runs/40124174636) on `3de6ed06896633dcae1907ffa358047602d701e1`; **completed successfully**. All four jobs (launcher and Python 3.10/3.12/3.13) passed. Official workflows still need maintainer approval. Passing local/fork tests are not upstream acceptance.

## Remaining acceptance

1. Maintainer code review, upstream CI approval and merge decisions.
2. Actual TV validation of Cobalt, Samsung Home, native channel controls, physical HOME/standby, HDMI reports and Frame Art Mode, on separately authorized isolated QA builds with rollback.
3. TV visual/performance acceptance for the integrated UI and long-session cache behavior.
4. Provenance/redistribution review for bundled PNG/JPEG assets; integrity alone does not establish licensing rights.
5. Other model/firmware physical HOME support only after independent read-only baseline, exact guard and tested restore. Do not weaken #33 or turn it into a universal writer.

The source candidate uses the official application/service identity. **Do not install it over the working V992.56.** No firmware/native helper/TV operation is authorized by this register. Source parity review is complete for the audited modules; production acceptance remains open.

Previous detailed status is preserved in [the archive](docs/archive/INTEGRATION_STATUS_before_combined_20261024.md).
