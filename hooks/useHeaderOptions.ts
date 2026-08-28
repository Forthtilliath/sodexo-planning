import { useThemeColors } from '@/hooks/useThemeColors';

/**
 * Options d'en-tête communes à toutes les piles de navigation : fond bleu
 * Sodexo, texte/flèche blancs et un fin filet rouge en rappel de marque.
 */
export function useHeaderOptions() {
  const colors = useThemeColors();
  return {
    headerStyle: {
      backgroundColor: colors.headerBackground,
      borderBottomWidth: 2,
      borderBottomColor: colors.headerAccent,
    },
    headerTintColor: colors.headerText,
    headerTitleStyle: { color: colors.headerText },
    headerShadowVisible: false,
  } as const;
}
