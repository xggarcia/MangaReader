import { create } from 'zustand';
import { getSettingsUseCases } from '../modules/settings/application/factory';
import { Settings, type SettingsPrimitive } from '../modules/settings/domain/Settings';

interface SettingsState {
  settings: Settings;
  loaded: boolean;
  load: () => Promise<void>;
  update: (changes: Partial<SettingsPrimitive>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: Settings.defaults(),
  loaded: false,

  load: async () => {
    try {
      set({ settings: await getSettingsUseCases().getSettings(), loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  update: async (changes) => {
    // Optimistic: the UI reacts immediately, persistence follows.
    const previous = get().settings;
    set({ settings: previous.with(changes) });
    try {
      set({ settings: await getSettingsUseCases().updateSettings(changes) });
    } catch {
      set({ settings: previous });
    }
  },
}));
