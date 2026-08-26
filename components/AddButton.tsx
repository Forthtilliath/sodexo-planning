import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
};

/** Bouton pointillé "+ ..." réutilisé partout où on ajoute une ligne (salarié, groupe...). */
export default function AddButton({ label, onPress, style }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable style={[styles.button, style]} onPress={onPress}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    button: {
      marginTop: 4,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      alignItems: 'center',
    },
    text: {
      fontWeight: '600',
      color: colors.text,
    },
  });
}
