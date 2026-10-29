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
  enabled: boolean, disabled: readonly string[], local: ArtworkProfile = {}, bundled: ArtworkProfile = verifiedArtwork) => {
  const localFile = enabled && !disabled.includes(app.id) ? safe(own(local, app.id)?.[shape]) : undefined;
  const bundledFile = enabled ? safe(own(bundled, app.id)?.[shape]) : undefined;
  const preferred = localFile || bundledFile;
  return { sources: [...new Set([...(preferred ? [preferred.src] : []), ...native])], preferred,
    origin: localFile ? 'local' : bundledFile ? 'verified' : 'samsung' } as const;
};
