import type { selectArtwork } from '../../shared/artwork/selectArtwork';
import { useImageSequence } from '../../shared/hooks/useImageSequence';
import { AppLogoIcon } from '../../shared/icons/AppLogoIcon';
import type { InstalledApp, AppPresentation } from '../../settings/types';

export const AppArtwork = ({ app, brand, active, selection, studio = false }: { app: InstalledApp; brand: AppPresentation; active: boolean; selection?: ReturnType<typeof selectArtwork>; studio?: boolean }) => {
  const artwork = useImageSequence(selection?.sources || brand.artwork, active);
  const icon = useImageSequence((studio ? !artwork.src : brand.useAppIcon) && app.icon ? [app.icon] : [], active);
  if (studio) { return <div class="studio-surface" data-artwork-origin={artwork.loaded && artwork.src === selection?.preferred?.src ? selection?.origin : artwork.loaded ? 'samsung' : 'generic'}>
    <div class="studio-orbit" aria-hidden="true" />
    {!artwork.loaded && !icon.src ? <div class="studio-initial" aria-hidden="true">{brand.title.slice(0, 1).toUpperCase()}</div> : null}
    {artwork.src ? <img key={artwork.src} class="studio-image" alt="" src={artwork.src} hidden={!artwork.loaded}
      onLoad={artwork.onLoad} onError={artwork.onError} /> : icon.src ? <img key={icon.src} class="studio-image" alt="" src={icon.src} onLoad={icon.onLoad} onError={icon.onError} /> : null}
    <div class="studio-name">{brand.title}</div>
  </div>; }
  return <>
    <div class={'app-fallback' + (!brand.label ? ' logo-only' : '') + (brand.largeLogo ? ' logo-big' : '')} hidden={artwork.loaded}>
      {brand.logoPath ? <AppLogoIcon path={brand.logoPath} colour={brand.logoColour} /> : icon.src ?
        <img key={icon.src} class="logo" alt="" src={icon.src} onLoad={icon.onLoad} onError={icon.onError} /> : null}
      {brand.label || !brand.logoPath ? <div class="name" style={{ color: brand.textColour }}>{brand.label || brand.title}</div> : null}
    </div>
    {artwork.src ? <img key={artwork.src} class="app-artwork" alt="" src={artwork.src} hidden={!artwork.loaded}
      style={{ display: artwork.loaded ? undefined : 'none' }} onLoad={artwork.onLoad} onError={artwork.onError} /> : null}
  </>;
};
