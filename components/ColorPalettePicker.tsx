import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import BottomSheet from '@/components/BottomSheet';
import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';

// Deux teintes (claire/foncée) par famille de couleur, dans l'ordre de l'arc-
// en-ciel pour que la grille se parcoure naturellement, plus quelques neutres
// à la fin. L'historique du projet montre plusieurs ajustements passés à
// cause de couleurs trop proches (un rose confondu avec du rouge, un autre
// avec du vert-teal) — d'où des familles bien espacées sur la roue des teintes.
export const COLOR_PALETTE = [
  // Rouge
  '#ef5350', '#d32f2f',
  // Orange foncé
  '#ff7043', '#e64a19',
  // Orange
  '#ffa726', '#f57c00',
  // Ambre
  '#ffca28', '#ffa000',
  // Jaune
  '#fdd835', '#f9a825',
  // Citron vert
  '#c0ca33', '#9e9d24',
  // Vert clair
  '#8bc34a', '#689f38',
  // Vert
  '#4caf50', '#388e3c',
  // Turquoise
  '#009688', '#00796b',
  // Cyan
  '#00bcd4', '#0097a7',
  // Bleu clair
  '#03a9f4', '#0288d1',
  // Bleu
  '#2196f3', '#1976d2',
  // Indigo
  '#3f51b5', '#303f9f',
  // Violet foncé
  '#673ab7', '#512da8',
  // Violet
  '#9c27b0', '#7b1fa2',
  // Rose
  '#e91e63', '#c2185b',
  // Neutres
  '#6d4c41', '#757575', '#546e7a',
];

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  selectedColor?: string;
  onSelect: (color: string) => void;
};

/** Grille de nuances à choisir pour un groupe de postes, dans un BottomSheet. */
export default function ColorPalettePicker({ visible, onClose, title, selectedColor, onSelect }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.grid}>
        {COLOR_PALETTE.map((color) => (
          <Pressable
            key={color}
            style={[styles.swatch, { backgroundColor: color }, selectedColor === color && styles.swatchSelected]}
            onPress={() => {
              onSelect(color);
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Couleur ${color}`}
          />
        ))}
      </View>
    </BottomSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: {
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 12,
      paddingHorizontal: 20,
      color: colors.text,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
      paddingHorizontal: 20,
    },
    swatch: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    swatchSelected: {
      borderWidth: 3,
      borderColor: colors.text,
    },
  });
}
