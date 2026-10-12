import { useMemo } from 'react';

import { SelectField as KitSelectField } from '@forthtilliath/react-native-kit/components/picker/SelectField';

import { useOptionsModalStyles } from '@/hooks/useKitStyles';
import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  label: string;
  valueLabel: string;
  options: { value: number; label: string }[];
  onSelect: (value: number) => void;
};

/** Champ "select" façon natif : bouton + popup de choix (utilisé pour le mois/année de l'écran Saisie). */
export default function SelectField(props: Props) {
  const colors = useThemeColors();
  const optionsModal = useOptionsModalStyles();
  const styles = useMemo(
    () => ({
      label: { color: colors.text },
      button: { borderColor: colors.border },
      buttonText: { color: colors.text },
      chevron: { color: colors.text },
      optionsModal,
    }),
    [colors, optionsModal]
  );

  return <KitSelectField {...props} styles={styles} />;
}
