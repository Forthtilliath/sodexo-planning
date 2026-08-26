import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import OptionsModal from '@/components/OptionsModal';
import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  label: string;
  valueLabel: string;
  options: { value: number; label: string }[];
  onSelect: (value: number) => void;
};

/** Champ "select" façon natif : bouton + popup de choix (utilisé pour le mois/année de l'écran Saisie). */
export default function SelectField({ label, valueLabel, options, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.button} onPress={() => setOpen(true)}>
        <Text style={styles.buttonText}>{valueLabel}</Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>
      <OptionsModal visible={open} onClose={() => setOpen(false)} options={options} onSelect={onSelect} />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    label: {
      fontSize: 12,
      opacity: 0.7,
      marginBottom: 4,
      color: colors.text,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
    },
    buttonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    chevron: {
      opacity: 0.5,
      color: colors.text,
    },
  });
}
