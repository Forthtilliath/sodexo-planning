import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  value: number;
  onChange: (value: number) => void;
  /** Nom de ce qui est compté, pour les libellés d'accessibilité ("Ajouter : …"). */
  label: string;
  max?: number;
};

/** Compteur entier ≥ 0 : boutons −/+ pour ajuster, champ central pour taper un grand nombre d'un coup. */
export default function QuantityStepper({ value, onChange, label, max = 999 }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  function set(next: number) {
    onChange(Math.min(max, Math.max(0, next)));
  }

  function handleChangeText(text: string) {
    const digits = text.replace(/\D/g, '');
    set(digits === '' ? 0 : Number(digits));
  }

  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.button, value === 0 && styles.buttonDisabled]}
        onPress={() => set(value - 1)}
        disabled={value === 0}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Retirer : ${label}`}>
        <Text style={styles.buttonText}>−</Text>
      </Pressable>
      <TextInput
        style={styles.input}
        value={String(value)}
        onChangeText={handleChangeText}
        keyboardType="number-pad"
        selectTextOnFocus
        maxLength={String(max).length}
        accessibilityLabel={`Quantité : ${label}`}
      />
      <Pressable
        style={styles.button}
        onPress={() => set(value + 1)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Ajouter : ${label}`}>
        <Text style={styles.buttonText}>+</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    button: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.tint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDisabled: {
      opacity: 0.35,
    },
    buttonText: {
      color: colors.onTint,
      fontSize: 22,
      fontWeight: '700',
      lineHeight: 26,
    },
    input: {
      width: 52,
      height: 40,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
      padding: 0,
    },
  });
}
