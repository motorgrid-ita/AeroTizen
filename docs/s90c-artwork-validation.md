# Owner-run S90C artwork acceptance

Target: QE65S90CATXZT, ARMv7, Tizen 9. This contribution has not passed physical-TV testing. Earlier acceptance of `aec386a5672c989e77a685cda042eae20e40848f` does not certify a later artwork build.

## Build identity

Read the exact integration commit from `git rev-parse HEAD`; do not substitute PR merge refs. Launcher remains 2.4.0. The published PR/build record supplies the source SHA and unsigned WGT SHA-256. The private signed WGT has a different hash: record it after signing and verify both XML signatures and every referenced digest with the existing owner-tested signing verifier. Keep certificates/passwords local and reuse the existing author identity; no credentials are available to contributor automation.

```powershell
npm.cmd ci --no-audit --no-fund
npm.cmd run lint
npm.cmd run build
& $python tools/build_release.py launcher --output dist/artwork-check
Get-FileHash -Algorithm SHA256 dist/artwork-check/aerotizen-launcher-2.4.0.wgt
```

Optional personal artwork preparation is documented in `artwork-system.md`. It happens before signing. Public unsigned WGT contains no local overrides; Studio generic/native composition can be tested without them. The original nine branded PNGs are not supplied or authorized by this procedure.

## Before installation

1. Preserve the working signed rollback WGT for source `aec386a`, SHA-256 `4b011ce29f9c08897dbc3a35aa264d49b487f8a69b6a5973f275d47a7b3d518f`, author fingerprint `5ada3fe0927f4a732c18fb77bb28186443d0cc36442e3caccf6e61193778a6c7`. Check actual files against these values.
2. Preserve original-home baseline and existing owner backup; verify the baseline hash `ca98a0960062b760e7bb88f854d5a9e519d81deceb89f7ba83b721f0c3302bfe`. Do not create a replacement baseline from a modified Home binding.
3. Save `python -m aerotizen --tv <TV-IP> home status --json` as a timestamped **precheck**, not as the original baseline. Record current Home/startup values and native watcher state.
4. Preserve current preferences if owner has an established export/backup method. A WGT is not a backup of app-private localStorage. Do not uninstall. Screenshot settings if no export is available.
5. Sign/verify the new WGT locally using the existing configuration and known author certificate. Record its hash and exact source SHA. Do not post private certificates/profile/passwords, device identity or network addresses to GitHub.

## Authorized in-place update

The owner must explicitly authorize and execute installation. Reuse the previously verified guarded **in-place update** procedure, changing only the approved WGT path and expected SHA; it verifies device identity, successful install/version and unchanged Home/startup/original baseline. No `uninstall`, `home apply`, `home restore`, reboot automation, native icon swaps, firmware operation or Samsung-setting reset is required for artwork. Stop on any mismatch.

After update: launch `DclHome001.Home` using the existing CLI, save a fresh `home status --json`, compare all Home/startup/baseline values with the precheck. Do not infer launch success from a package write alone.

## Artwork checklist

- Default Samsung mode is visually unchanged. Compare source candidates/resolution and app launching with the rollback build.
- Enable Studio in Settings > Home appearance > App artwork. Confirm readable labels and correct aspect ratios in Square and Rectangle at 3, 4 and 5 apps/row; check Big/Small only in Follow card size.
- Compare Classic/Glass, focused/unfocused, top/bottom rows, app move arrows, rapid D-pad, Home/All apps reversal and Settings return. No clipping, double borders or lost focus.
- Check short/long app names, sharp Samsung originals, transparent custom PNGs, very wide/tall images, a missing Rectangle override and a failed/corrupt file. No stretching; fallback remains usable.
- If a personal profile is installed, inspect each exact app mapping and shape. Disable/re-enable individual overrides. Uninstalled apps must have no controls or artwork requests. Reload/restart and confirm preferences persist.
- Settings app pickers and Continue Watching icons keep standard geometry. CW playback/progress and native app launching remain unchanged.
- Smoke-test physical HOME, Live TV/channel changes, YouTube/Prime returns, HDMI and weather wallpapers. These are compatibility checks, not new service features.
- Owner-controlled standby/reboot persistence test only when appropriate; record perceived smoothness, actual source resolution and firmware-specific failures. Automated screenshots do not prove TV rendering quality.

## Diagnostics and rollback

Record exact package/source hash, app ID, layout/columns, theme and whether personal overrides are enabled. Reproduce first with Samsung mode. Use existing app inventory and Home status CLI commands; do not publish device-identity JSON unredacted. No screenshot/debugger connection is started automatically.

First rollback: choose Samsung artwork, or disable a single local override. No installation or native write required. If necessary, owner-authorized in-place reinstall of the preserved signed working WGT using the same guarded updater; verify Home/startup unchanged again. Do not uninstall, reset bindings or overwrite backups. Saved new preference keys are ignored by the older runtime. Report pass/fail only after owner observation.
