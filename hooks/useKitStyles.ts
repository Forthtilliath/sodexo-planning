import { useMemo } from 'react';

import type { OptionsModalStyles } from '@forthtilliath/react-native-kit/components/picker/OptionsModal';

import { useThemeColors } from '@/hooks/useThemeColors';

/** Palette de l'app pour l'OptionsModal du kit — partagée par OptionsModal et SelectField. */
export function useOptionsModalStyles(): OptionsModalStyles {
  const colors = useThemeColors();
  return useMemo(
    () => ({
      overlay: { backgroundColor: colors.overlay },
      card: { backgroundColor: colors.modalCard },
      optionText: { color: colors.text },
    }),
    [colors]
  );
}
