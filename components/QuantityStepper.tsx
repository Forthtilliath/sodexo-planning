import { useMemo } from 'react';

import { QuantityStepper as KitQuantityStepper } from '@forthtilliath/react-native-kit/components/picker/QuantityStepper';

import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  value: number;
  onChange: (value: number) => void;
  /** Nom de ce qui est compté, pour les libellés d'accessibilité ("Ajouter : …"). */
  label: string;
  max?: number;
};

/** Compteur entier ≥ 0 : boutons −/+ pour ajuster, champ central pour taper un grand nombre d'un coup. */
export default function QuantityStepper(props: Props) {
  const colors = useThemeColors();
  const styles = useMemo(
    () => ({
      button: { backgroundColor: colors.tint },
      buttonText: { color: colors.onTint },
      input: { borderColor: colors.border, color: colors.text },
    }),
    [colors]
  );

  return <KitQuantityStepper {...props} styles={styles} />;
}
