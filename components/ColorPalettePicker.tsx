import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import BottomSheet from '@/components/BottomSheet';
import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';

// Deux teintes (claire/foncée) par famille, dans l'ordre de l'arc-en-ciel,
// neutres à la fin. Familles volontairement bien espacées sur la roue des
// teintes : les couleurs trop proches se confondaient (rose/rouge, vert/teal).
export const COLOR_PALETTE = [
  '#ef5350', '#d32f2f', // rouge
  '#ff7043', '#e64a19', // orange foncé
  '#ffa726', '#f57c00', // orange
  '#ffca28', '#ffa000', // ambre
  '#fdd835', '#f9a825', // jaune
  '#c0ca33', '#9e9d24', // citron vert
  '#8bc34a', '#689f38', // vert clair
  '#4caf50', '#388e3c', // vert
  '#009688', '#00796b', // turquoise
  '#00bcd4', '#0097a7', // cyan
  '#03a9f4', '#0288d1', // bleu clair
  '#2196f3', '#1976d2', // bleu
  '#3f51b5', '#303f9f', // indigo
  '#673ab7', '#512da8', // violet foncé
  '#9c27b0', '#7b1fa2', // violet
  '#e91e63', '#c2185b', // rose
  '#6d4c41', '#757575', '#546e7a', // neutres
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
