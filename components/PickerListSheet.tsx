import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import BottomSheet from '@/components/BottomSheet';
import ColorDot from '@/components/ColorDot';
import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';

type Item = { key: string; label: string; highlight?: boolean };
type Section = { key: string; label: string; color?: string; items: Item[] };

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (key: string) => void;
} & ({ items: Item[]; sections?: never } | { items?: never; sections: Section[] });

/** BottomSheet listant des options en une colonne (choix d'un collègue, d'un mois passé...) — tap = sélection + fermeture.
 * Passer `items` pour une liste plate, ou `sections` pour grouper les options par catégorie (comme dans Réglages > Salariés). */
export default function PickerListSheet(props: Props) {
  const { visible, onClose, onSelect } = props;
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const sections: Section[] = props.sections ?? [{ key: '_flat', label: '', items: props.items }];

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {sections.map((section) => (
        <View key={section.key}>
          {section.label !== '' && (
            <View style={styles.header}>
              <ColorDot color={section.color} size={10} />
              <Text style={styles.headerText}>{section.label}</Text>
            </View>
          )}
          {section.items.map((item, index) => (
            <Pressable
              key={item.key}
              style={[styles.row, index > 0 && styles.rowDivider]}
              onPress={() => {
                onSelect(item.key);
                onClose();
              }}>
              <Text style={[styles.rowText, item.highlight && styles.rowTextHighlight]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ))}
    </BottomSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: colors.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    headerText: {
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: colors.text,
    },
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
    rowTextHighlight: {
      color: colors.tint,
      fontWeight: '600',
    },
  });
}
