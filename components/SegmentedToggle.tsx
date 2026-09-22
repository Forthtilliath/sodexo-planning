import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** Rangée de boutons de même largeur dont un seul est actif (ex. Calendrier / Liste). */
export default function SegmentedToggle<T extends string>({ options, value, onChange }: Props<T>) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[styles.button, active && styles.buttonActive]}
            onPress={() => onChange(option.value)}>
            <Text style={[styles.text, active && styles.textActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    button: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    buttonActive: {
      backgroundColor: colors.tint,
      borderColor: colors.tint,
    },
    text: {
      fontWeight: '600',
      color: colors.text,
    },
    textActive: {
      color: colors.onTint,
    },
  });
}
