import { useMemo } from 'react';
import type { ErrorBoundaryProps } from 'expo-router';

import { ErrorFallback as KitErrorFallback } from '@forthtilliath/react-native-kit/components/feedback/ErrorFallback';

import { useThemeColors } from '@/hooks/useThemeColors';

const HINT =
  "Désolé, quelque chose s'est mal passé. Tes données restent sur l'appareil, rien n'est perdu — réessaie ci-dessous.";

/**
 * Remplace l'écran d'erreur par défaut d'Expo Router (fond noir, message brut,
 * pensé pour le développement) par un écran de secours lisible : les données
 * restent en place (stockage local), on peut réessayer sans perdre le fil.
 */
export default function ErrorFallback({ error, retry }: ErrorBoundaryProps) {
  const colors = useThemeColors();
  const styles = useMemo(
    () => ({
      container: { backgroundColor: colors.background },
      title: { color: colors.text },
      hint: { color: colors.text },
      button: { backgroundColor: colors.tint },
      buttonText: { color: colors.onTint },
      detailsText: { color: colors.text },
    }),
    [colors]
  );

  return <KitErrorFallback error={error} retry={retry} labels={{ hint: HINT }} styles={styles} />;
}
