# S90C native Live TV integration results

This fork-only test branch combines upstream PR #49 at
`bf0f7846c0b09574cf12568b6b558b95a924b8f0` with PR #37 at
`cfc8ba380bde2338e5dcddd080ae076f3e3701c2`.
It is not an additional upstream pull request and does not change either PR branch.

## Behavior

- Live TV selects the TV tuner and invokes `org.tizen.tv-viewer` through the
  in-app Tizen API, with an AppControl fallback. It waits for the service's
  `/leave` acknowledgement before the handoff. This follows AeroTizen Custom.
- Older devices without the native launch API retain the embedded TVWindow route.
  HDMI continues to use TVWindow.
- Samsung Home and YouTube/Cobalt use PR #37's acknowledged handoff.
- Native physical HOME and automatic startup remain owned by PR #49. The native
  helper, service, mode persistence, baseline and recovery protocol are unchanged.
- New integration tests exercise successful and denied Live TV launches against
  the real service handler in native mode. `/leave` and `/home` must preserve the
  native transaction and must not resume API polling or watcher relaunches.

## Hardware evidence and limits

On the S90C, PR #49 alone passed physical HOME, YouTube and Prime Video returns,
native automatic startup, and restoration of both HOME-only and HOME-plus-boot
configurations across full power disconnects, before the combined launcher test.

The embedded Live TV path in PR #49 alone did not support channel changes; BACK
returned to the launcher, whereas physical HOME did not. An external CLI launch
of the native viewer was not confirmed. That transport does not test the in-app
Tizen launch API used here.

On 27 October 2026, the owner confirmed these checks on combined commit
`7ba7fad0fdcfb6a5714ef5a91b3444edcdb5f6e0`, after applying HOME-only native routing
and disconnecting power for 60 seconds:

- Native Live TV opens, channel changes work, physical HOME returns to AeroTizen,
  and Live TV can be reopened.
- YouTube and Prime Video playback and physical HOME returns work.
- The compiled Preact Settings action **Use Samsung Home instead** leaves Samsung
  Home visible; physical HOME returns to AeroTizen.

The signed combined WGT has SHA-256
`aeaff5f8acf882ee0b1c9a8538854cd5ca316920569566711809f2f9db416dc7`.
Physical HOME in these checks is provided by PR #49, not PR #37 alone.
The TV currently runs this combined launcher with native HOME enabled and
automatic startup disabled.

Still untested on the combined build: HDMI-to-TV switching, boot, restore,
Frame/Art behavior, and recovery with the launcher absent. The Samsung Home check
used a wait before physical HOME; immediate Samsung-menu HOME is not a claimed pass.

Combined CI passed lint/typecheck/build, release packaging, 150 JavaScript tests
(including 41 watcher integration checks), 346 Python tests on 3.10/3.12/3.13,
and all 10 Chromium browser tests:
https://github.com/motorgrid-ita/AeroTizen/actions/runs/40495595391

This branch now also includes PR #49 at `bf0f7846c0b09574cf12568b6b558b95a924b8f0`,
adding Windows test fixes and read-only service diagnostics. The hardware results
above belong to the older `7ba7fad` build and do not cover those newer changes.
The native writer and launcher service are unchanged by this update.

## PC and TV procedure

Keep the original signed custom launcher backup unchanged. Keep the whole PR #49
baseline directory, including `transactions/`. Do not regenerate that baseline.

Build this exact integration commit in a separate PC directory, compile the
production launcher with `npm run build`, and sign `dist/launcher` using the same
author certificate as the installed app. Verify signatures and file digests
before installation. Run browser tests with a local Python command supported by
the host; a single worker avoided local-server connection failures on Windows.

For the completed test, the TV first had stock native assignments. The installed
launcher was updated without uninstalling it. For future updates, restore and
verify stock state first, then check the service protocol and perform an offline
HOME-only apply preview with the existing baseline. Native changes require an
explicit guided write step. Verify apply across a 60-second power disconnect
before testing Live TV. Do not include automatic startup in the first handoff test.

This branch does not change firmware, the reference branch, original backup,
certificates, or the existing upstream pull requests.

## Preparing the current PC tools

Use a separate checkout under the existing PC test workspace. With Python 3.11
or newer, run `tools/prepare_integration_pc.py --expected-commit EXACT_COMMIT`.
The tool checks that both pinned PR heads are ancestors of that exact clean
checkout. It verifies the existing archive and baseline hashes, creates the
separate `.venv-integration-current` environment, builds both managed helpers,
and runs Ruff, lint, typecheck/build, JavaScript, Python and browser tests.
Playwright must already have its matching Chromium installed on the PC.

The browser server uses the isolated Python executable with one worker, keeping
the original project configuration unchanged. The tool then checks release
packaging and offline apply/restore previews, signs the compiled launcher using
temporary copies of the preserved author/distributor certificates, and verifies
both signatures, all referenced digests and complete file coverage. It writes
`PC_UPDATE_RESULT.json` and a build log in a new `pc_update_*` directory.

No TV discovery, connection, installation, native write or backup replacement is
performed. The old `.venv`, source directories, signed packages and complete
baseline/transaction folder remain available. A failing check stops preparation
and reports the log location; it does not alter the installed TV version.
