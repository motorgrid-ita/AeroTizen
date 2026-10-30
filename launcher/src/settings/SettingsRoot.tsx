import { useLayoutEffect } from 'preact/hooks';
import { useLocale } from '../shared/hooks/useTranslation';
import { useStore } from '../shared/hooks/useStore';
import { Settings } from './Settings';
import { useSettingsEnvironment } from './hooks/useSettingsEnvironment';
import { useSettingsPresentation } from './hooks/useSettingsPresentation';

export const SettingsRoot = () => {
  const { view, root, settings, glass, navigation } = useSettingsEnvironment();
  const state = useStore(view);
  const locale = useLocale();
  useLayoutEffect(() => { navigation.invalidate(); if (state.open && !state.previewing) { navigation.focus(); } }, [locale, navigation, state.open, state.previewing]);
  const values = useStore(settings), category = useStore(glass);
  useSettingsPresentation(state.open, state.previewing);
  return (
    <div id="editor" class={'sheet aero-settings-ready' + (values.glassSettings ? ' aero-settings-glass' : ' aero-settings-classic') + (!category.expanded ? ' aero-settings-collapsed' : '')} hidden={!state.open} ref={root}>
      {state.mounted ? <Settings active={state.open} previewing={state.previewing} openedAt={state.openedAt} /> : null}
    </div>
  );
};
