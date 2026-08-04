import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

import Colors from '@/constants/Colors';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedScheme = 'light' | 'dark';

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

/** Valeur par défaut utilisée si jamais consommée hors du Provider (ne devrait pas arriver). */
export const ThemePreferenceContext = createContext<ThemePreferenceContextValue>({
  preference: 'system',
  setPreference: () => {},
});

/** Préférence de thème choisie dans Réglages (clair/sombre/système), avec le setter pour la changer. */
export function useThemePreference(): ThemePreferenceContextValue {
  return useContext(ThemePreferenceContext);
}

/** Thème réellement appliqué : la préférence choisie, ou le thème système si "système" est sélectionné. */
export function useResolvedScheme(): ResolvedScheme {
  const { preference } = useThemePreference();
  const systemScheme = useColorScheme();
  if (preference === 'system') return systemScheme === 'dark' ? 'dark' : 'light';
  return preference;
}

/** Palette de couleurs adaptée au thème actuellement appliqué. */
export function useThemeColors() {
  const scheme = useResolvedScheme();
  return Colors[scheme];
}
