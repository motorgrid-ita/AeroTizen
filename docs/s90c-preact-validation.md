# Samsung S90C: Preact integration acceptance

Status: **not installed or hardware-tested by the contributor automation**.
Target: Samsung QE65S90CATXZT, ARMv7, Tizen 9.0.0. The existing native HOME
binding must remain unchanged. No Home apply/restore, boot apply, uninstall,
firmware update or Samsung settings change is required by this UI test.

## Prepare a pinned build on the PC

Use the exact integration commit and unsigned WGT SHA-256 from the delivery report.
Do not test a moving branch head. Keep the currently working signed launcher,
certificate backup ZIP, original Home JSON and all transaction receipts intact.
Create a new directory under Documents; do not use Downloads or old worktrees.
The existing repository can be used to fetch/add a new detached worktree:

```powershell
# Set these to the full reviewed commit and unsigned hash from the report.
$expected = 'FULL_REVIEWED_INTEGRATION_COMMIT'
$unsignedHash = 'REVIEWED_UNSIGNED_WGT_SHA256'
$work = Join-Path "$HOME\Documents" ("AeroTizen_Preact_Test_" + (Get-Date -Format 'yyyyMMdd_HHmmss'))
# Run from an existing AeroTizen Git checkout.
git fetch https://github.com/motorgrid-ita/AeroTizen.git integration/preact-contributions
if ($LASTEXITCODE -ne 0) { throw 'Fetch failed' }
git -c core.autocrlf=false worktree add --detach $work $expected
if ($LASTEXITCODE -ne 0) { throw 'Worktree creation failed' }
Set-Location $work
if ((git rev-parse HEAD) -ne $expected) { throw 'Unexpected commit' }
python -m venv .venv
if ($LASTEXITCODE -ne 0) { throw 'Python environment failed' }
& '.\.venv\Scripts\python.exe' -m pip install -e '.[dev]'
if ($LASTEXITCODE -ne 0) { throw 'Python dependencies failed' }
npm.cmd ci --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw 'Node dependencies failed' }
npm.cmd run lint
if ($LASTEXITCODE -ne 0) { throw 'Lint failed' }
npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
npm.cmd test
if ($LASTEXITCODE -ne 0) { throw 'Node tests failed' }
& '.\.venv\Scripts\python.exe' tools/build_release.py launcher --output dist/release-check
if ($LASTEXITCODE -ne 0) { throw 'Packaging failed' }
$unsigned = Join-Path $work 'dist\release-check\aerotizen-launcher-2.4.0.wgt'
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $unsigned).Hash.ToLowerInvariant() -ne $unsignedHash) {
    throw 'Unsigned build differs: do not sign or install it'
}
```

The build remains version 2.4.0 to avoid independently advancing the upstream release
PR. Node/tool versions and LF checkout matter for byte reproducibility. If the WGT
hash differs, keep both hashes and stop for comparison; do not silently accept it.
On Windows the existing Playwright web servers use `python3`; a temporary local config
may substitute `py -3` and run one worker. Keep it outside tracked sources, delete it
afterwards, and retain traces for any failure. Do not label a failed run successful.

## Sign locally using the existing authorized certificate backup

Use `tools/prepare_signed_launcher.py` with the immutable backup ZIP, its already
verified hash and the existing author fingerprint. The script reads the ZIP without
modifying it, extracts only the three signing files to a temporary directory, signs
the pinned unsigned WGT, verifies both signatures and every payload digest, then
writes a manifest and signed WGT into a new directory. It never contacts the TV.
It verifies integrity with the embedded certificates; it does not establish Samsung
certificate-chain trust or device authorization independently of the existing profile.

```powershell
$backup = Join-Path "$HOME\Documents" 'AeroTizen_BACKUP\DEFINITIVO_S90C\01_AEROTIZEN_V99256_HOME_BACKUP_COMPLETO.zip'
$signed = Join-Path "$HOME\Documents" ("AeroTizen_Preact_Signed_" + (Get-Date -Format 'yyyyMMdd_HHmmss'))
& '.\.venv\Scripts\python.exe' tools/prepare_signed_launcher.py `
  --commit $expected --unsigned $unsigned --unsigned-sha256 $unsignedHash `
  --backup $backup `
  --backup-sha256 a629b823b1abb10084c3cf510cdca16cbbf9d6e3be0379377f6fbee6adb1adf3 `
  --author-sha256 5ada3fe0927f4a732c18fb77bb28186443d0cc36442e3caccf6e61193778a6c7 `
  --output $signed
if ($LASTEXITCODE -ne 0) { throw 'Signing or verification failed' }
Get-Content (Join-Path $signed 'build-manifest.json')
```

Record the signed hash printed on this PC. A signed hash cannot be supplied before
signing with the owner's keys, which must never be uploaded to GitHub or this workspace.
Generated signing files and manifests must stay outside tracked repository files.

## Before installation: capture, then review

Using the existing working CLI (with native helpers already built), save a fresh
read-only `home status --json` next to the new signed manifest. Confirm the exact TV
model, current Home binding, startup IDs, autostart value and watcher mode against
that saved state. Confirm the immutable original Home backup still has its original
hash. Preserve the known-good signed 2.4.0 weather build separately. If its file is
missing, stop before installing. Preserve a local copy of current launcher settings
using an already available inspector if possible; opening debug may restart the app.
Do not invent or reset unavailable settings-export support.

Installation is an **owner-operated next step after review**, not part of the
preparation script. Use the already verified raw signed-WGT update workflow:
`DeviceSession.install('DclHome001.Home', signed_bytes, sdk_toolpath)` with the
existing authorized device profile. Validate model/device identity and package hash
before transfer, require the installer completion message, then verify the installed
application/version. Use an in-place update, never uninstall the HOME-bound launcher.
Do not pass a signed WGT through an installer that silently re-signs it. If the update
fails or requests uninstall/new certificates, stop and retain the full diagnostic.
Launch `DclHome001.Home` only after confirmed installation, then repeat read-only Home
status. Native Home/startup values must match the pre-install snapshot exactly.

## Physical acceptance checklist

Record each item as pass/fail/not tested, with commit, signed hash, firmware and
observed latency. A PC simulation is not a physical remote or Samsung API test.

1. **Classic baseline:** first launch, existing app order, all artwork, background,
   Continue Watching and status preferences match the working launcher. Toggle Home/
   All apps repeatedly; no blank/flashing artwork or duplicated tiles.
2. **Remote/focus:** D-pad all rows, short OK launch, held OK menu, add/remove and
   move/drop; Back closes menu and returns All apps to Home. Open/close Settings from
   an app/source and confirm visible focus restoration, including after app return.
3. **Physical HOME and handoffs:** launch YouTube and Prime Video, play video, press
   physical HOME and confirm AeroTizen returns promptly. Repeat after a reboot. Use
   Samsung Home escape and confirm its existing intentional behavior. Do not change
   native HOME policy merely because the UI changed.
4. **Live TV:** select the dock tile, change channels with CH+/CH- and number keys,
   verify TV owns remote focus, then physical HOME returns to AeroTizen. Repeat with
   Back and after re-entering TV. Report any overlay/remote-focus failure distinctly.
5. **Shared drawer and themes:** Settings > Home appearance > Interface appearance > Glass.
   Repeat the category controls in Classic too. Traverse all five categories
   with Up/Down, Right/OK, Left at the content edge and Back. Check text input, IME,
   close button, focus glider alignment, single borders, clipping and smooth movement.
   Return to Classic and verify original controls remain reachable.
6. **Clocks:** Weather and clock category (or Classic Clock layout controls): Custom,
   Large Vertical/Horizontal/Thin/Bold. Test 12/24-hour, date style/No date, No time,
   weather/location visibility and offline placeholder. Check glyphs and clipping.
7. **HDMI:** connected, recognised standby and unidentified disconnected ports;
   custom label alone must not create recognition. Test Hide disconnected, per-port
   Automatic/Always show, hot-plug, duplicates, active source and real switching.
8. **Cards:** Square/Rectangle, 3/4/5 per row and Follow card size. Inspect original
   Samsung artwork sharpness, focus scale/clipping, row navigation and app launching.
9. **Wallpapers:** Backgrounds > Weather photos > On; existing background stays while
   solar data is unavailable, then correct scene appears. Test normal weather hidden,
   location changes, Off restoration, and real sunset/night. The deterministic 23:00
   legacy-cache case is automated; do not alter the TV clock to reproduce it.
10. **Continue Watching:** discovery/settings, multiple apps, late feed, progress,
    scrolling and launch/return. Reopen Settings during a feed update; focus stays valid.
11. **Persistence:** close/reopen launcher, standby/power cycle and actual cold reboot;
    all visual preferences persist. HOME still works. Autostart should retain the
    pre-test value (currently disabled); enabling native boot is a separate change.

## Diagnostics and rollback

Read-only CLI: `python -m aerotizen --tv TV_IP home status --json`, `apps --all`.
Use the previously working CLI environment if the new source helpers are not built.
Never publish device identity hashes, precise coordinates, tokens or certificate files.
An already available inspector can record page errors, failed image requests and:

```javascript
({ settingsOpen: AeroTizen.settingsUi.isOpen(),
   focused: Array.from(document.querySelectorAll('.focused')).map(n => n.id || n.dataset.key || n.dataset.id),
   glass: AeroTizen.settings.glassSettings, clock: AeroTizen.settings.clockLayout,
   cards: [AeroTizen.settings.homeCardMode, AeroTizen.settings.homeCardColumns],
   weather: Weather.solarPhase(Weather.currentReading(), Date.now()) })
```

First revert optional preferences: Classic Settings, Classic clock, Square cards,
Follow card size and Weather photos Off. For a package regression, reinstall the
separately preserved known-good signed 2.4.0 WGT in place, using the same author and
verified profile. The known-good solar WGT SHA-256 is
`25e3b48670390104c593368d2496b7b5cd2e6c7903dd6864752b9d59a2a81880`.
Do not overwrite it with a test build. Verify its hash before rollback and compare
Home status afterwards. If the TV refuses the package or HOME becomes unavailable,
stop; do not uninstall, reset bindings, apply boot settings or perform recovery
without explicit owner approval. Existing baseline/receipt recovery remains separate.

## Reviewed in-place installation command (owner step only)

Run this only after the signed manifest, rollback file and read-only pre-install
status have been reviewed and the owner authorizes the physical test. The `$signed`
directory must be the newly verified output above. The old helper-ready CLI is used
for transport/status; it does not rebuild or replace native HOME policy. If its path
is unavailable, stop and locate the previously verified environment first.

```powershell
$cli = Join-Path "$HOME\Documents" 'AeroTizen_PR49_Test\run_20261027_110052_147138\.venv-integration-current\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $cli)) { throw 'Existing helper-ready CLI unavailable' }
$env:AEROTIZEN_SIGNED_DIR = $signed
try {
@'
import hashlib, json, os, re, zipfile
from pathlib import Path, PurePosixPath
from aerotizen import home
from aerotizen.device import DeviceSession
from aerotizen.cli import app_metadata_of, verify_install

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

output = Path(os.environ['AEROTIZEN_SIGNED_DIR'])
widget = output / 'AeroTizen_Preact_S90C_signed.wgt'
manifest = json.loads((output / 'build-manifest.json').read_text())
if sha(widget) != manifest['signed_sha256']:
    raise SystemExit('STOP: signed package differs')
base = Path.home() / 'Documents/AeroTizen_PR49_Test/run_20261027_110052_147138/s90c-stock-baseline/original-home.json'
if sha(base) != 'ca98a0960062b760e7bb88f854d5a9e519d81deceb89f7ba83b721f0c3302bfe':
    raise SystemExit('STOP: original Home baseline differs')
baseline = json.loads(base.read_text())
backup = Path.home() / 'Documents/AeroTizen_BACKUP/DEFINITIVO_S90C/01_AEROTIZEN_V99256_HOME_BACKUP_COMPLETO.zip'
if sha(backup) != 'a629b823b1abb10084c3cf510cdca16cbbf9d6e3be0379377f6fbee6adb1adf3':
    raise SystemExit('STOP: certificate backup differs')
rollback = Path.home() / 'Documents/AeroTizen_Solar_Signed_20261028_094142_719766/AeroTizen_PR72_S90C_signed.wgt'
if sha(rollback) != '25e3b48670390104c593368d2496b7b5cd2e6c7903dd6864752b9d59a2a81880':
    raise SystemExit('STOP: known-good rollback package differs')
app_id, version = app_metadata_of(widget)
if app_id != 'DclHome001.Home' or version != manifest['version']:
    raise SystemExit('STOP: unexpected app or version')
with zipfile.ZipFile(backup) as archive:
    names = [n for n in archive.namelist() if PurePosixPath(n).name == 'device-profile.xml']
    if len(names) != 1:
        raise SystemExit('STOP: missing or ambiguous device profile')
    profile = archive.read(names[0])

def bindings(status):
    return (status['home']['main_operation'].get('value'),
            {key: value.get('value') for key, value in status['home']['settings'].items()})

with DeviceSession('192.168.50.3') as session:
    info = home.device_info(session, '192.168.50.3')
    before = home.read_status(session, None, info)
    if not before['complete'] or before['device']['model'] != 'QE65S90CATXZT':
        raise SystemExit('STOP: complete S90C status not confirmed')
    if before['device']['identity_sha256'] != baseline['device']['identity_sha256']:
        raise SystemExit('STOP: device identity differs from original baseline')
    # Exclusive output avoids overwriting an earlier diagnostic.
    with (output / 'home-before-install.json').open('x') as stream:
        json.dump(before, stream, indent=2)
    toolpath = session.capability().get('sdk_toolpath')
    if toolpath != '/home/owner/share/tmp/sdk_tools':
        raise SystemExit('STOP: unexpected SDK path')
    session.push(profile, toolpath + '/device-profile.xml')
    result = session.install(app_id, widget.read_bytes(), toolpath)
    print(result)
    if not re.search(r'app_id\[DclHome001\.Home\]\s+install completed\b', result, re.I):
        raise SystemExit('STOP: installation completion not confirmed')
    verify_install(app_id, version, result, session.applist())
    after = home.read_status(session, None, info)
    with (output / 'home-after-install.json').open('x') as stream:
        json.dump(after, stream, indent=2)
    if not after['complete'] or bindings(after) != bindings(before):
        raise SystemExit('STOP: native Home/startup values changed; do not apply or restore anything automatically')
if sha(base) != 'ca98a0960062b760e7bb88f854d5a9e519d81deceb89f7ba83b721f0c3302bfe':
    raise SystemExit('STOP: original baseline differs after update')
print('In-place installation verified. Native Home/startup bindings and original backup unchanged.')
'@ | & $cli -
    if ($LASTEXITCODE -ne 0) { throw 'Installation or post-check failed; stop here' }
}
finally {
    Remove-Item Env:AEROTIZEN_SIGNED_DIR -ErrorAction SilentlyContinue
}
# Only after the verified completion above:
& $cli -m aerotizen --tv 192.168.50.3 launch DclHome001.Home
& $cli -m aerotizen --tv 192.168.50.3 home status --json
```

This command has not been run against the TV as part of this delivery. Its native
transport is the previously used upstream API; final success still depends on the
TV's package verifier and firmware. Keep local logs private and redact identifiers
before sharing results on GitHub. A failed update must not trigger an automatic
uninstall, Home remap, boot change or recovery operation.

## Hardware finding: Classic header covered by weather photos

On the initial combined Preact build, the S90C owner reported that unfocused
header controls and status content disappeared in Classic mode. The weather
layer used z-index 0, while its foreground CSS still matched only direct body
children. The Preact mount introduced a wrapper, so those rules no longer
matched. Preserve the legacy selectors and include the Preact header and
content viewport explicitly; do not force visibility or change HOME policy.
A browser regression activates the real wallpaper layer and checks the paint
order of unfocused header controls, status content and the viewport in both
Classic and Glass, including Settings and native-TV hiding. Hardware retest
of this correction remains pending.

## Hardware findings: scroll fade, custom clock clearance and shared drawer

The owner confirmed that the weather-layer correction restored header visibility.
Subsequent acceptance found a missing upper scroll fade, insufficient clearance
below the custom clock/city and off-centre tabs. Restore the screen-fixed viewport
fade only while scrolled; keep the header outside the mask. Let the actual custom
clock height reserve layout space, including local fonts and weather/city content,
and centre its tabs independently of the clock width. No additional measurement
polling, observer or timer is required.

The category drawer is common functionality for both Classic and Glass. The
appearance preference must not switch to an unrelated linear Settings screen.
Both themes use the same category controls, D-pad scopes, Back/Left behaviour and
existing settings services. Classic paints neutral opaque surfaces and violet
focus; Glass paints the satin surfaces. Compact/custom clock layout remains a
separate preference. Automated geometry and category checks do not establish
physical TV acceptance of these corrections; owner retest remains pending.
