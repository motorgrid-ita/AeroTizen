import type { InstalledApp } from '../../settings/types';

export type CardShape = 'square' | 'rectangle';
export interface ArtworkFile { src: string; width: number; height: number }
export interface ArtworkEntry { square?: ArtworkFile; rectangle?: ArtworkFile }
export type ArtworkProfile = Readonly<Record<string, ArtworkEntry>>;
// Empty until a specific file and the exact repository/WGT distribution are cleared.
export const verifiedArtwork: ArtworkProfile = Object.freeze({});
const own = (profile: ArtworkProfile, id: string) => Object.prototype.hasOwnProperty.call(profile, id) ? profile[id] : undefined;
const safe = (file?: ArtworkFile) => file && /^assets\/artwork-(?:local|verified)\/[a-z0-9-]+\.png$/.test(file.src) &&
  Number.isInteger(file.width) && Number.isInteger(file.height) && file.width > 0 && file.height > 0 && file.width <= 1920 && file.height <= 1080 ? file : undefined;

export const selectArtwork = (app: InstalledApp, native: readonly string[], shape: CardShape,
  enabled: boolean, disabled: readonly string[], local: ArtworkProfile = {}, bundled: ArtworkProfile = verifiedArtwork, imported?: ArtworkFile, useSamsung = false) => {
  // Only the private-storage adapter can supply a resolved file URI; package
  // profiles never gain arbitrary filesystem or URL access through this path.
  const usbFile = !useSamsung && imported && /^file:\/\/\/[^?#]*\/aerotizen-artwork\/[a-f0-9]{32}\.png$/.test(imported.src) && Number.isInteger(imported.width) && Number.isInteger(imported.height) && imported.width > 0 && imported.height > 0 && imported.width <= 1280 && imported.height <= 1024 ? imported : undefined;
  const localFile = !useSamsung && enabled && !disabled.includes(app.id) ? safe(own(local, app.id)?.[shape]) : undefined;
  const bundledFile = !useSamsung && enabled ? safe(own(bundled, app.id)?.[shape]) : undefined;
  const preferred = usbFile || localFile || bundledFile;
  return { shape, sources: [...new Set([...(preferred ? [preferred.src] : []), ...native])], preferred,
    origin: usbFile ? 'usb' : localFile ? 'local' : bundledFile ? 'verified' : 'samsung' } as const;
};
