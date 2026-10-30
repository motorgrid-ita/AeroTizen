import { useArtworkVisibility } from './useArtworkVisibility';
import { createStore } from '../../shared/state/createStore';
import type { ArtworkProfile } from '../../shared/artwork/selectArtwork';
import { selectArtwork } from '../../shared/artwork/selectArtwork';
import { useMemo } from 'preact/hooks';
import { useStore } from '../../shared/hooks/useStore';
import { AppArtwork } from './AppArtwork';
import { MoveArrows } from './MoveArrows';
import { HomeControl } from './HomeControl';
import type { HomeEnvironment } from '../types';
import type { InstalledApp } from '../../settings/types';
const emptyArtwork = createStore<{profile: ArtworkProfile; disabled: readonly string[]}>({ profile: {}, disabled: [] });
export const AppCard = ({ env, app, active }: { env: HomeEnvironment; app: InstalledApp; active: boolean }) => {
  const brand = useMemo(() => env.describe(app), [env, app]);
  const settings = useStore(env.settings);
  const privateArtwork = useStore(env.artwork || emptyArtwork);
  const selection = selectArtwork(app, brand.artwork, settings.homeCardMode, settings.artworkStyle === 'studio', settings.artworkDisabled,
    env.runtime.artworkProfile, undefined, privateArtwork.profile[app.id]?.[settings.homeCardMode], privateArtwork.disabled.includes(app.id + ':' + settings.homeCardMode));
  const studio = settings.artworkStyle === 'studio' || selection.origin === 'usb';
  const near = useArtworkVisibility(env.nodes, 'app:' + app.id, active && studio && Boolean(selection.preferred));
  const state = useStore(env.state), moving = state.moving === app.id;
  return <HomeControl env={env} controlKey={'app:' + app.id} dataId={app.id} registered={active} className={'tile app-tile' + (moving ? ' moving' : '') + (studio ? ' artwork-studio' : '')}
    title={brand.title} style={{ background: brand.background }}>
    <AppArtwork app={app} brand={brand} active={active && near} selection={selection} studio={studio} />
    {moving ? <MoveArrows env={env} id={app.id} /> : null}
  </HomeControl>;
};
