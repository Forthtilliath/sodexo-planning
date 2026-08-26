import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import BottomSheet from '@/components/BottomSheet';
import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';

type Item = { key: string; label: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  items: Item[];
  onSelect: (key: string) => void;
};

/** BottomSheet listant des options en une colonne (choix d'un collègue, d'un mois passé...) — tap = sélection + fermeture. */
export default function PickerListSheet({ visible, onClose, items, onSelect }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {items.map((item, index) => (
        <Pressable
          key={item.key}
          style={[styles.row, index > 0 && styles.rowDivider]}
          onPress={() => {
            onSelect(item.key);
            onClose();
          }}>
          <Text style={styles.rowText}>{item.label}</Text>
        </Pressable>
      ))}
    </BottomSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      paddingVertical: 12,
      paddingHorizontal: 20,
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: colors.divider,
    },
    rowText: {
      color: colors.text,
    },
  });
}
