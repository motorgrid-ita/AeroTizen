# S90C native Live TV integration candidate

This fork-only test branch combines upstream PR #49 at
`3c2320052b68a0f23b8966059e3771e25b3a1a90` with PR #37 at
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
configurations across full power disconnects. The original settings are currently
restored, with the PR #49 launcher still installed.

The embedded Live TV path in PR #49 alone did not support channel changes; BACK
returned to the launcher, whereas physical HOME did not. An external CLI launch
of the native viewer was not confirmed. That transport does not test the in-app
Tizen launch API used here.

The combined build has **not yet passed hardware acceptance**. Required checks:
native Live TV channel changes and physical HOME return, re-entry, a handoff after
HDMI selection, Samsung Home escape, YouTube/Prime regression, boot and restore.
Do not claim recovery with the launcher absent until separately tested.

## PC and TV procedure

Keep the original signed custom launcher backup unchanged. Keep the whole PR #49
baseline directory, including `transactions/`. Do not regenerate that baseline.

Build this exact integration commit in a separate PC directory, compile the
production launcher with `npm run build`, and sign `dist/launcher` using the same
author certificate as the installed app. Verify signatures and file digests
before installation. Run browser tests with a local Python command supported by
the host; a single worker avoided local-server connection failures on Windows.

The TV currently has stock native assignments. Update the installed launcher
without uninstalling it, then check its service protocol and perform an offline
HOME-only apply preview with the existing baseline. Native changes require an
explicit guided write step. Verify apply across a 60-second power disconnect
before testing Live TV. Do not include automatic startup in the first handoff test.

This branch does not change firmware, the reference branch, original backup,
certificates, or the existing upstream pull requests.
