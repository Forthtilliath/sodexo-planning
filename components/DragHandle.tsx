import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  onPressIn: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
};

/** Poignée "⠿" pour réordonner une ligne dans une DraggableFlatList (roster, groupes de postes). */
export default function DragHandle({ onPressIn, disabled, accessibilityLabel }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      onPressIn={onPressIn}
      disabled={disabled}
      hitSlop={10}
      style={styles.handle}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}>
      <Text style={styles.text}>⠿</Text>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    handle: {
      paddingHorizontal: 4,
      paddingVertical: 4,
    },
    text: {
      fontSize: 20,
      opacity: 0.5,
      color: colors.text,
    },
  });
}
