import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { useStore } from '../../shared/hooks/useStore';
import type { CardShape } from '../../shared/artwork/selectArtwork';
import type { PreparedArtwork, UsbArtwork, UsbItem } from '../../shared/artwork/usbArtwork';
import type { HomeEnvironment } from '../types';

type Screen = 'choices' | 'files' | 'preview';
interface BrowserState { screen: Screen; shape: CardShape; path?: string; items: UsbItem[]; preview?: PreparedArtwork; busy: boolean; message: string; selected: number }
export const ArtworkDialog = ({ env, library, appId }: { env: HomeEnvironment; library: UsbArtwork; appId: string }) => {
  const { apps, ready } = useStore(env.inventory);
  const app = apps.find(app => app.id === appId);
  const [view, setView] = useState<BrowserState>({ screen: 'choices', shape: 'square', items: [], busy: false, message: '', selected: 0 });
  const root = useRef<HTMLDivElement>(null), generation = useRef(0);
  const installed = () => env.inventory.getSnapshot().ready && env.inventory.getSnapshot().apps.some(item => item.id === appId);
  const close = () => { generation.current++; env.closeArtwork(); };
  const run = (task: (current: () => boolean) => Promise<Partial<BrowserState>>) => {
    const token = ++generation.current;
    const current = () => token === generation.current && installed() && !document.hidden;
    setView(before => ({ ...before, busy: true, message: '' }));
    void task(current).then(patch => { if (current()) { setView(before => ({ ...before, ...patch, busy: false, selected: 0 })); } })
      .catch(reason => { if (current()) { setView(before => ({ ...before, busy: false, message: (reason as Error).message || 'Artwork could not be imported.' })); } });
  };
  const browse = (shape: CardShape, path?: string) => run(async () => ({ screen: 'files', shape, path, items: await library.list(path), preview: undefined }));
  const back = () => {
    if (view.busy) { close(); }
    else if (view.screen === 'choices') { close(); }
    else if (view.screen === 'preview') { setView(before => ({ ...before, screen: 'files', preview: undefined, selected: 0, message: '' })); }
    else if (view.path) { browse(view.shape, view.path.includes('/') ? view.path.slice(0, view.path.lastIndexOf('/')) : undefined); }
    else { setView(before => ({ ...before, screen: 'choices', selected: 0, message: '' })); }
  };
  const open = (item: UsbItem) => {
    if (item.directory) { browse(view.shape, item.path); }
    else { run(async () => ({ screen: 'preview', preview: await library.prepare(item.path, view.shape) })); }
  };
  const save = () => {
    const preview = view.preview;
    if (!preview) { return; }
    run(async current => {
      if (!current()) { return {}; }
      await library.save(appId, view.shape, preview, current);
      if (current()) { env.runtime.toast(env.translate('Artwork saved')); close(); }
      return {};
    });
  };
  const reset = (shape: CardShape) => run(async current => {
    if (current()) { await library.reset(appId, shape); }
    return { message: (shape === 'square' ? 'Square' : 'Rectangle') + ' restored to Samsung artwork.' };
  });
  const buttons = view.busy ? [{ label: 'Cancel', action: close }] : view.screen === 'choices' ? [
    { label: 'Choose Square from USB', action: () => browse('square') },
    { label: 'Choose Rectangle from USB', action: () => browse('rectangle') },
    { label: 'Reset Square to Samsung', action: () => reset('square') },
    { label: 'Reset Rectangle to Samsung', action: () => reset('rectangle') },
    { label: 'Close', action: close }
  ] : view.screen === 'preview' ? [
    { label: 'Use this image', action: save }, { label: 'Choose another image', action: back }, { label: 'Cancel', action: close }
  ] : [
    { label: view.path ? 'Up one folder' : 'Back', action: back },
    { label: 'Refresh USB', action: () => browse(view.shape, view.path) },
    ...view.items.map(item => ({ label: (item.directory ? '▸ ' : '') + item.name, action: () => open(item) }))
  ];
  useLayoutEffect(() => {
    if (!ready || !app) { generation.current++; env.closeArtwork(); }
  }, [ready, app, env]);
  useLayoutEffect(() => () => { generation.current++; }, []);
  useLayoutEffect(() => {
    const target = root.current?.querySelectorAll<HTMLButtonElement>('button')[Math.min(view.selected, buttons.length - 1)];
    target?.focus({ preventScroll: true });
    const host = root.current?.querySelector('.artwork-dialog-options');
    if (target && host?.contains(target)) {
      const a = target.getBoundingClientRect(), b = host.getBoundingClientRect();
      if (a.bottom > b.bottom - 12) { host.scrollTop += a.bottom - b.bottom + 12; }
      if (a.top < b.top + 12) { host.scrollTop += a.top - b.top - 12; }
    }
  }, [view.selected, view.screen, view.busy, view.items, buttons.length]);
  useLayoutEffect(() => {
    const K = env.runtime.config.KEY;
    const keydown = (event: KeyboardEvent) => {
      const code = event.keyCode;
      if (![K.UP, K.DOWN, K.LEFT, K.RIGHT, K.ENTER, K.BACK, K.ESC, 9, 32].includes(code)) { return; }
      event.preventDefault(); event.stopImmediatePropagation();
      if (code === K.BACK || code === K.ESC) { back(); }
      else if (code === K.ENTER || code === 32) { if (!event.repeat) { buttons[view.selected]?.action(); } }
      else { const delta = code === K.UP || code === K.LEFT || code === 9 && event.shiftKey ? -1 : 1;
        setView(before => ({ ...before, selected: Math.max(0, Math.min(buttons.length - 1, before.selected + delta)) })); }
    };
    window.addEventListener('keydown', keydown, true);
    return () => window.removeEventListener('keydown', keydown, true);
  });
  useLayoutEffect(() => {
    if (view.screen !== 'files') { return; }
    return library.watch(() => {
      generation.current++;
      setView(before => ({ ...before, path: undefined, items: [], preview: undefined, busy: false, selected: 0, message: 'USB storage changed. Select Refresh USB to list drives again.' }));
    });
  }, [library, view.screen]);
  return <div class="artwork-dialog-backdrop"><div ref={root} class="artwork-dialog" role="dialog" aria-modal="true" aria-labelledby="artwork-dialog-title">
    <div class="artwork-dialog-heading"><span>{env.translate('CUSTOM ARTWORK')}</span><h2 id="artwork-dialog-title">{app?.name || appId}</h2></div>
    <p class="artwork-dialog-hint">{env.translate(view.screen === 'choices' ? 'Choose a complete image for each card shape. Samsung artwork remains the fallback.' : view.screen === 'files' ? 'Static PNG only · up to 6 MiB / 16 megapixels. No image is saved until you confirm.' : 'The complete image keeps its proportions. Confirm only if you have the right to use it.')}</p>
    {!library.available ? <p role="status">{env.translate('USB import is unavailable here. Personal PC packages remain supported.')}</p> : null}
    {view.path ? <p class="artwork-dialog-path">{view.path}</p> : null}
    {view.preview && view.screen === 'preview' ? <div class={'artwork-dialog-preview preview-' + view.shape}><img src={'data:image/png;base64,' + view.preview.data} alt={env.translate('Selected artwork preview')} /></div> : null}
    <p class="artwork-dialog-status" role="status" aria-live="polite">{env.translate(view.busy ? 'Preparing artwork…' : view.message || (view.screen === 'files' && !view.items.length ? 'No PNG images or USB drives found. Insert a drive and select Refresh USB.' : ''))}</p>
    <div class="artwork-dialog-options">{buttons.map((button, i) => <button type="button" key={button.label + i} class={view.selected === i ? 'focused' : ''} onFocus={() => setView(before => before.selected === i ? before : { ...before, selected: i })} onClick={button.action}>{env.translate(button.label)}</button>)}</div>
  </div></div>;
};
