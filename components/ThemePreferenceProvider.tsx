import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { ThemePreferenceContext, type ThemePreference } from '@/hooks/useThemeColors';
import { getSettings, saveSettings } from '@/lib/db';

/** Charge la préférence de thème enregistrée et la rend disponible (+ modifiable) à toute l'app. */
export default function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    getSettings().then((settings) => {
      if (settings.theme) setPreferenceState(settings.theme);
    });
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    getSettings().then((settings) => saveSettings({ ...settings, theme: next }));
  }, []);

  return (
    <ThemePreferenceContext.Provider value={{ preference, setPreference }}>{children}</ThemePreferenceContext.Provider>
  );
}
