import type { ReactNode } from 'react';

import { ThemePreferenceProvider as KitThemePreferenceProvider } from '@forthtilliath/react-native-kit/components/theme/ThemePreferenceProvider';

import type { ThemePreference } from '@/hooks/useThemeColors';
import { getSettings, saveSettings } from '@/lib/db';

async function loadTheme() {
  return (await getSettings()).theme;
}

async function saveTheme(theme: ThemePreference) {
  await saveSettings({ ...(await getSettings()), theme });
}

/** Charge la préférence de thème enregistrée et la rend disponible (+ modifiable) à toute l'app. */
export default function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  return (
    <KitThemePreferenceProvider load={loadTheme} save={saveTheme}>
      {children}
    </KitThemePreferenceProvider>
  );
}
