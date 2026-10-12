import { useResolvedScheme } from '@forthtilliath/react-native-kit/components/theme/themePreferenceContext';

import Colors from '@/constants/Colors';

export {
  ThemePreferenceContext,
  useResolvedScheme,
  useThemePreference,
} from '@forthtilliath/react-native-kit/components/theme/themePreferenceContext';
export type { ThemePreference } from '@forthtilliath/react-native-kit/hooks/useEffectiveColorScheme';
export type ResolvedScheme = 'light' | 'dark';

/** Palette de couleurs adaptée au thème actuellement appliqué. */
export function useThemeColors() {
  const scheme = useResolvedScheme();
  return Colors[scheme];
}
