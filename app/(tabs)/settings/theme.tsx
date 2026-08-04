import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors, useThemePreference, type ThemePreference } from '@/hooks/useThemeColors';

const OPTIONS: { value: ThemePreference; emoji: string; label: string }[] = [
  { value: 'light', emoji: '☀️', label: 'Clair' },
  { value: 'dark', emoji: '🌙', label: 'Sombre' },
  { value: 'system', emoji: '⚙️', label: 'Système' },
];

export default function ThemeScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { preference, setPreference } = useThemePreference();

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        "Système" suit automatiquement le réglage clair/sombre de ton téléphone.
      </Text>
      {OPTIONS.map((option) => {
        const active = preference === option.value;
        return (
          <Pressable
            key={option.value}
            style={[styles.row, active && styles.rowActive]}
            onPress={() => setPreference(option.value)}>
            <Text style={styles.emoji}>{option.emoji}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
            {active && <Text style={styles.check}>✓</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 16,
    },
    hint: {
      fontSize: 13,
      opacity: 0.7,
      marginBottom: 16,
      color: colors.text,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 10,
      padding: 14,
      marginBottom: 10,
    },
    rowActive: {
      borderColor: colors.tint,
      backgroundColor: colors.tintSoft,
    },
    emoji: {
      fontSize: 20,
    },
    label: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    labelActive: {
      color: colors.tint,
    },
    check: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.tint,
    },
  });
}
