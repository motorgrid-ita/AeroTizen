import { Choice } from '../components/Choice';
import type { InstalledApp, SettingsSectionProps } from '../types';
import type { ArtworkProfile } from '../../shared/artwork/selectArtwork';

export const ArtworkSettings = ({ settings, actions, apps, profile }: SettingsSectionProps & {
  apps: readonly InstalledApp[]; profile: ArtworkProfile;
}) => <>
  <h3>App artwork</h3>
  <Choice id="artwork-style" label="App artwork presentation" value={settings.artworkStyle}
    options={[["native", "Samsung artwork"], ["studio", "Studio cards"]]} onSelect={actions.setArtworkStyle} />
  <p class="hint">Complete images keep their proportions. Choose Custom artwork from an app menu in Home or All apps to import a PNG from USB. Samsung artwork remains the fallback. Personal PC packages are also supported.</p>
  {settings.artworkStyle === 'studio' ? apps.filter(app => Object.prototype.hasOwnProperty.call(profile, app.id)).map(app =>
    <Choice key={app.id} id={'artwork-override:' + app.id} label={app.name + ' local artwork'}
      value={!settings.artworkDisabled.includes(app.id)} options={[[true, app.name + ': Local'], [false, app.name + ': Samsung']]}
      onSelect={enabled => actions.setArtworkOverride(app.id, enabled)} />) : null}
</>;
