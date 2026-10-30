import { createStore } from '../state/createStore';
import type { ArtworkFile, ArtworkProfile, CardShape } from './selectArtwork';

// The adapter deliberately uses the documented legacy File interface (Tizen 1.0+)
// instead of assuming a browser picker or Tizen 5-only FileHandle methods.
export interface FsStream { close(): void; readBytes(count: number): number[]; readBase64(count: number): string; writeBase64(value: string): void }
export interface FsFile {
  name: string; fullPath: string; isDirectory: boolean; isFile: boolean; fileSize: number;
  toURI(): string; resolve(path: string): FsFile; createDirectory(path: string): FsFile; createFile(path: string): FsFile;
  listFiles(done: (files: FsFile[]) => void, failed: (error: unknown) => void): void;
  openStream(mode: string, done: (stream: FsStream) => void, failed: (error: unknown) => void): void;
  deleteFile(path: string, done?: () => void, failed?: (error: unknown) => void): void;
}
export interface UsbStorage { label: string; type: string; state: string }
export interface ArtworkFilesystem {
  resolve(path: string, done: (file: FsFile) => void, failed: (error: unknown) => void, mode: string): void;
  listStorages(done: (storages: UsbStorage[]) => void, failed: (error: unknown) => void): void;
  addStorageStateChangeListener?(changed: (storage: UsbStorage) => void, failed: (error: unknown) => void): number;
  removeStorageStateChangeListener?(id: number): void;
}
export interface UsbItem { name: string; path: string; directory: boolean }
export interface PreparedArtwork { data: string; width: number; height: number; bytes: number }
interface SavedImage { name: string; width: number; height: number; bytes: number }
interface SavedState { images: Record<string, Partial<Record<CardShape, SavedImage>>>; disabled: string[] }
export const ARTWORK_STORAGE_KEY = 'aerotizen.artwork.usb.v1';
export const ARTWORK_DIRECTORY = 'aerotizen-artwork';
export const MAX_INPUT_BYTES = 6 * 1024 * 1024;
export const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
export const MAX_LIBRARY_BYTES = 24 * 1024 * 1024;
const MAX_ENTRIES = 100, MAX_DIRECTORY_ITEMS = 300;
const validId = (id: string) => /^[A-Za-z0-9_.-]{1,200}$/.test(id) && !['__proto__', 'constructor', 'prototype'].includes(id);
const validName = (name: string) => /^[a-f0-9]{32}\.png$/.test(name);
const shapeKey = (id: string, shape: CardShape) => id + ':' + shape;
export const isUsbPath = (path: string) => /^removable_[A-Za-z0-9_-]+(?:\/[^\\/:]+)*$/.test(path) &&
  ![...path].some(char => char.charCodeAt(0) < 32) && !path.split('/').some(part => part === '.' || part === '..') && path.length <= 1024 && path.split('/').length <= 12;
const error = (value: unknown) => value instanceof Error && value.name !== 'SecurityError' ? value : new Error((value as { name?: string })?.name === 'SecurityError' ?
  'USB access was denied by this TV. Use the personal PC package instead.' : 'The drive or file is unavailable. Reconnect USB and try again.');

// Validate dimensions before handing compressed bytes to the browser decoder.
// Only static PNGs are accepted, never SVG/HTML, remote URLs or animated PNGs.
export const inspectPng = (bytes: Uint8Array) => {
  if (bytes.length < 45 || bytes.length > MAX_INPUT_BYTES ||
      [137,80,78,71,13,10,26,10].some((value, i) => bytes[i] !== value)) { throw new Error('Choose a static PNG image up to 6 MiB.'); }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = 8, width = 0, height = 0, ended = false;
  for (let chunks = 0; at + 12 <= bytes.length && chunks < 10000; chunks++) {
    const size = view.getUint32(at), type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    if (size > bytes.length - at - 12) { throw new Error('The PNG file is incomplete.'); }
    if (at === 8) {
      if (type !== 'IHDR' || size !== 13) { throw new Error('The PNG header is invalid.'); }
      width = view.getUint32(at + 8); height = view.getUint32(at + 12);
      if (!width || !height || width > 8192 || height > 8192 || width * height > 16 * 1024 * 1024) { throw new Error('The image exceeds the 16 megapixel limit.'); }
    } else if (type === 'IHDR' || type === 'acTL') { throw new Error('Choose a static, non-animated PNG image.'); }
    at += size + 12;
    if (type === 'IEND') { ended = size === 0 && at === bytes.length; break; }
  }
  if (!ended) { throw new Error('The PNG file is incomplete or unsupported.'); }
  return { width, height };
};

export const readArtworkState = (raw: string | null): SavedState => {
  const clean: SavedState = { images: Object.create(null), disabled: [] };
  try {
    const value = JSON.parse(raw || '{}'); let total = 0;
    if (value?.images && typeof value.images === 'object') {
      Object.keys(value.images).slice(0, MAX_ENTRIES).forEach(id => {
        if (!validId(id)) { return; }
        const entry: Partial<Record<CardShape, SavedImage>> = {};
        (['square', 'rectangle'] as const).forEach(shape => {
          const image = value.images[id]?.[shape];
          if (!image || typeof image.name !== 'string' || !validName(image.name) ||
              !Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width < 1 || image.height < 1 ||
              image.width > (shape === 'square' ? 1024 : 1280) || image.height > (shape === 'square' ? 1024 : 720) ||
              !Number.isInteger(image.bytes) || image.bytes < 1 || image.bytes > MAX_OUTPUT_BYTES || total + image.bytes > MAX_LIBRARY_BYTES) { return; }
          total += image.bytes; entry[shape] = { name: image.name, width: image.width, height: image.height, bytes: image.bytes };
        });
        if (Object.keys(entry).length) { clean.images[id] = entry; }
      });
    }
    if (Array.isArray(value?.disabled)) { clean.disabled = [...new Set<string>(value.disabled.filter((key: unknown): key is string => typeof key === 'string' && /:(square|rectangle)$/.test(key) && validId(key.replace(/:(square|rectangle)$/, ''))))].slice(0, MAX_ENTRIES * 2); }
  } catch { /* Malformed local preferences must not grant arbitrary file access. */ }
  return clean;
};

export const optimisePng = async (bytes: Uint8Array, shape: CardShape): Promise<PreparedArtwork> => {
  const dimensions = inspectPng(bytes);
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'image/png' }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => { image.src = ''; reject(new Error('Image decoding timed out.')); }, 8000);
      image.onload = () => { window.clearTimeout(timer); resolve(); };
      image.onerror = () => { window.clearTimeout(timer); reject(new Error('This TV cannot decode the PNG image.')); };
      image.src = url;
    });
    if (image.naturalWidth !== dimensions.width || image.naturalHeight !== dimensions.height) { throw new Error('The image dimensions are inconsistent.'); }
    const scale = Math.min(1, (shape === 'square' ? 1024 : 1280) / dimensions.width, (shape === 'square' ? 1024 : 720) / dimensions.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(dimensions.width * scale)); canvas.height = Math.max(1, Math.round(dimensions.height * scale));
    const context = canvas.getContext('2d');
    if (!context) { throw new Error('Image preparation is unavailable on this TV.'); }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/png').split(',')[1];
    const size = Math.floor(data.length * 3 / 4) - (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0);
    if (!data || size > MAX_OUTPUT_BYTES) { throw new Error('The prepared image exceeds 2 MiB. Optimise it on your PC first.'); }
    return { data, width: canvas.width, height: canvas.height, bytes: size };
  } finally { URL.revokeObjectURL(url); }
};

// Every filesystem request has a deadline; there is no polling or background USB scan.
const request = <T>(start: (done: (value: T) => void, failed: (reason: unknown) => void) => void): Promise<T> => new Promise((resolve, reject) => {
  let live = true;
  const timer = setTimeout(() => { live = false; reject(new Error('Storage request timed out.')); }, 10000);
  const finish = (action: () => void) => { if (live) { live = false; clearTimeout(timer); action(); } };
  try { start(value => finish(() => resolve(value)), reason => finish(() => reject(error(reason)))); }
  catch (reason) { finish(() => reject(error(reason))); }
});
export const createUsbArtwork = (filesystem: ArtworkFilesystem | undefined, storage: Pick<Storage, 'getItem' | 'setItem'>,
  optimise = optimisePng) => {
  let raw: string | null = null;
  try { raw = storage.getItem(ARTWORK_STORAGE_KEY); } catch { /* Blocked browser storage keeps native artwork available. */ }
  let saved = readArtworkState(raw);
  const store = createStore<{ profile: ArtworkProfile; disabled: readonly string[] }>({ profile: {}, disabled: saved.disabled });
  let directory: FsFile | undefined, writing = false;
  const resolveFile = (path: string, mode = 'r') => request<FsFile>((done, failed) => {
    if (!filesystem) { throw new Error('unsupported'); }
    filesystem.resolve(path, done, failed, mode);
  });
  const getDirectory = async (create: boolean) => {
    if (directory) { return directory; }
    const root = await resolveFile('wgt-private', create ? 'rw' : 'r');
    let found: FsFile;
    try { found = root.resolve(ARTWORK_DIRECTORY); }
    catch { if (!create) { throw new Error('No imported artwork is stored.'); } found = root.createDirectory(ARTWORK_DIRECTORY); }
    if (!found.isDirectory || !/^file:\/\//.test(found.toURI())) { throw new Error('Private artwork storage is unavailable.'); }
    // Refresh the rw handle when an earlier read-only hydration opened this directory.
    if (create) { directory = found; }
    return found;
  };
  const publish = (dir?: FsFile) => {
    const profile: Record<string, Partial<Record<CardShape, ArtworkFile>>> = Object.create(null);
    if (dir) { Object.keys(saved.images).forEach(id => {
      profile[id] = {};
      (['square', 'rectangle'] as const).forEach(shape => {
        const image = saved.images[id][shape];
        if (!image) { return; }
        try {
          const file = dir.resolve(image.name);
          if (file.isFile && file.fileSize === image.bytes) { profile[id][shape] = { src: file.toURI(), width: image.width, height: image.height }; }
        } catch { /* Missing private images fall back to Samsung without request loops. */ }
      });
    }); }
    store.set({ profile, disabled: saved.disabled });
  };
  const remove = (dir: FsFile, name?: string) => {
    if (name && validName(name)) { try { dir.deleteFile(dir.fullPath + '/' + name, () => {}, () => {}); } catch { /* Best-effort deletion affects only our own files. */ } }
  };
  const ready = Object.keys(saved.images).length && filesystem ? getDirectory(false).then(publish).catch(() => {}) : Promise.resolve();
  return {
    ...store, ready, available: Boolean(filesystem?.listStorages && filesystem?.resolve),
    async list(path?: string): Promise<UsbItem[]> {
      if (!filesystem) { throw new Error('USB import is unavailable here. Use the personal PC package instead.'); }
      if (!path) {
        const roots = await request<UsbStorage[]>((done, failed) => filesystem.listStorages(done, failed));
        return roots.filter(root => root.type === 'EXTERNAL' && root.state === 'MOUNTED' && /^removable_[A-Za-z0-9_-]+$/.test(root.label))
          .slice(0, 16).map(root => ({ name: root.label, path: root.label, directory: true }));
      }
      if (!isUsbPath(path)) { throw new Error('Invalid USB folder.'); }
      const dir = await resolveFile(path);
      if (!dir.isDirectory) { throw new Error('Choose a USB folder.'); }
      const files = await request<FsFile[]>((done, failed) => dir.listFiles(done, failed));
      if (files.length > MAX_DIRECTORY_ITEMS) { throw new Error('This folder has over 300 entries. Put your PNG images in a smaller folder.'); }
      return files.filter(file => file.fullPath === path + '/' + file.name && isUsbPath(file.fullPath) &&
          (file.isDirectory || file.isFile && /\.png$/i.test(file.name)))
        .sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name))
        .map(file => ({ name: file.name, path: file.fullPath, directory: file.isDirectory }));
    },
    async prepare(path: string, shape: CardShape) {
      if (!isUsbPath(path) || !/\.png$/i.test(path)) { throw new Error('Choose a PNG from the USB drive.'); }
      const file = await resolveFile(path);
      if (!file.isFile || !Number.isInteger(file.fileSize) || file.fileSize < 45 || file.fileSize > MAX_INPUT_BYTES) { throw new Error('Choose a static PNG image up to 6 MiB.'); }
      const size = file.fileSize;
      const bytes = await request<Uint8Array>((done, failed) => file.openStream('r', stream => {
        try {
          const bytes = new Uint8Array(size);
          for (let offset = 0; offset < size;) {
            const chunk = stream.readBytes(Math.min(65536, size - offset));
            if (!chunk.length || chunk.length > size - offset) { throw new Error('The USB file changed or was removed.'); }
            bytes.set(chunk, offset); offset += chunk.length;
          }
          inspectPng(bytes); done(bytes);
        }
        catch (reason) { failed(reason); }
        finally { try { stream.close(); } catch { /* The read result/error already settled. */ } }
      }, failed));
      return optimise(bytes, shape);
    },
    async save(id: string, shape: CardShape, prepared: PreparedArtwork, current = () => true) {
      await ready;
      if (!current()) { throw new Error('Import cancelled.'); }
      if (writing || !validId(id)) { throw new Error('Artwork is busy or the app is invalid.'); }
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(prepared.data) || prepared.data.length > Math.ceil(MAX_OUTPUT_BYTES / 3) * 4 ||
          !Number.isInteger(prepared.bytes) || prepared.bytes > MAX_OUTPUT_BYTES || prepared.bytes < 1 ||
          !Number.isInteger(prepared.width) || !Number.isInteger(prepared.height) || prepared.width < 1 || prepared.height < 1 ||
          prepared.width > (shape === 'square' ? 1024 : 1280) || prepared.height > (shape === 'square' ? 1024 : 720)) { throw new Error('Invalid prepared image.'); }
      if (!saved.images[id] && Object.keys(saved.images).length >= MAX_ENTRIES) { throw new Error('The 100-app artwork limit has been reached.'); }
      const previous = saved.images[id]?.[shape];
      const used = Object.values(saved.images).reduce((total, entry) => total + (entry.square?.bytes || 0) + (entry.rectangle?.bytes || 0), 0);
      if (used - (previous?.bytes || 0) + prepared.bytes > MAX_LIBRARY_BYTES) { throw new Error('The 24 MiB artwork library is full. Reset unused images first.'); }
      writing = true; let dir: FsFile | undefined, name: string | undefined;
      try {
        dir = await getDirectory(true);
        const random = new Uint8Array(16); crypto.getRandomValues(random);
        name = [...random].map(byte => byte.toString(16).padStart(2, '0')).join('') + '.png';
        try { dir.resolve(name); throw new Error('Private image name collision.'); } catch (reason) { if ((reason as Error).message === 'Private image name collision.') { throw reason; } }
        const file = dir.createFile(name);
        await request<void>((done, failed) => file.openStream('w', stream => {
          try { stream.writeBase64(prepared.data); stream.close(); done(); }
          catch (reason) { try { stream.close(); } catch { /* Preserve the original failure. */ } failed(reason); }
        }, failed));
        const stored = dir.resolve(name);
        if (stored.fileSize !== prepared.bytes) { throw new Error('Private artwork write could not be verified.'); }
        const readback = await request<string>((done, failed) => stored.openStream('r', stream => {
          try { done(stream.readBase64(prepared.bytes)); } catch (reason) { failed(reason); } finally { try { stream.close(); } catch { /* The read result/error already settled. */ } }
        }, failed));
        if (readback !== prepared.data) { throw new Error('Private artwork verification failed.'); }
        if (!current()) { throw new Error('Import cancelled.'); }
        const next: SavedState = { images: { ...saved.images, [id]: { ...saved.images[id], [shape]: { name, width: prepared.width, height: prepared.height, bytes: prepared.bytes } } }, disabled: saved.disabled.filter(key => key !== shapeKey(id, shape)) };
        storage.setItem(ARTWORK_STORAGE_KEY, JSON.stringify(next)); saved = next; publish(dir); remove(dir, previous?.name);
      } catch (reason) { if (dir) { remove(dir, name); } throw reason; }
      finally { writing = false; }
    },
    async reset(id: string, shape: CardShape) {
      await ready;
      if (writing || !validId(id)) { throw new Error('Artwork is busy or the app is invalid.'); }
      const previous = saved.images[id]?.[shape], entry = { ...saved.images[id] }; delete entry[shape];
      const images = { ...saved.images }; if (Object.keys(entry).length) { images[id] = entry; } else { delete images[id]; }
      const next = { images, disabled: [...new Set([...saved.disabled, shapeKey(id, shape)])].slice(-MAX_ENTRIES * 2) };
      storage.setItem(ARTWORK_STORAGE_KEY, JSON.stringify(next)); saved = next;
      let dir: FsFile | undefined; try { dir = await getDirectory(true); } catch { /* Reset preferences works even if private storage is unavailable. */ }
      publish(dir); if (dir) { remove(dir, previous?.name); }
    },
    watch(changed: () => void) {
      let id: number | undefined;
      try { id = filesystem?.addStorageStateChangeListener?.(() => changed(), () => changed()); } catch { /* Refresh remains available when notifications are unsupported. */ }
      return () => { if (id !== undefined) { try { filesystem?.removeStorageStateChangeListener?.(id); } catch { /* Already removed. */ } } };
    }
  };
};
export type UsbArtwork = ReturnType<typeof createUsbArtwork>;
