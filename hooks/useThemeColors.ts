import { useColorScheme } from 'react-native';

import Colors from '@/constants/Colors';

/** Palette de couleurs adaptée au thème système (clair/sombre) actuel. */
export function useThemeColors() {
  const scheme = useColorScheme();
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}
