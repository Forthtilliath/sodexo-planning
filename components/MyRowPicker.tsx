import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  myName: string;
  employees: string[];
  onPick: (rowIndex: number) => void;
};

/** Affiché quand "mon" nom est introuvable dans le planning : liste des lignes pour choisir la sienne. */
export default function MyRowPicker({ myName, employees, onPick }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.box}>
      <Text style={styles.text}>Aucune ligne "{myName}" dans ce planning. Choisis la tienne :</Text>
      {employees.map((name, index) => (
        <Pressable key={index} style={[styles.row, index > 0 && styles.rowDivider]} onPress={() => onPick(index)}>
          <Text style={styles.rowText}>{name || `Ligne ${index + 1}`}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    box: {
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.dangerSoft,
      marginBottom: 16,
    },
    text: {
      marginBottom: 8,
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
  });
}
