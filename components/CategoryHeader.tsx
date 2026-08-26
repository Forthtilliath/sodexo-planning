import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import ColorDot from '@/components/ColorDot';
import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  label: string;
  color?: string;
  /** Ex. "glisse un salarié ici" quand la catégorie est vide (roster en tri Manuel). */
  hint?: string;
};

/** En-tête de section pour une liste groupée par catégorie (roster, sheet d'ajout de salarié...). */
export default function CategoryHeader({ label, color, hint }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.header}>
      <ColorDot color={color} />
      <Text style={styles.text}>{label}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
      marginBottom: 6,
    },
    text: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      opacity: 0.6,
      color: colors.text,
    },
    hint: {
      fontSize: 11,
      fontStyle: 'italic',
      opacity: 0.4,
      color: colors.text,
    },
  });
}
