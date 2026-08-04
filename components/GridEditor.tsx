import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  days: string[]; // dates ISO, une par colonne
  employees: string[];
  grid: string[][];
  onAddEmployee: () => void;
  onOpenRow: (rowIndex: number) => void;
};

/** Liste des salariés du planning : un par ligne, avec un résumé de remplissage et un accès à l'éditeur par personne. */
export default function GridEditor({ days, employees, grid, onAddEmployee, onOpenRow }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View>
      {employees.map((name, rowIndex) => {
        const filledCount = (grid[rowIndex] ?? []).filter((c) => c.trim()).length;
        return (
          <View key={rowIndex} style={styles.row}>
            <View style={styles.nameColumn}>
              <Text style={styles.nameText}>{name || `Employé ${rowIndex + 1}`}</Text>
              <Text style={styles.summaryText}>
                {filledCount} / {days.length} jours renseignés
              </Text>
            </View>
            <Pressable style={styles.openButton} onPress={() => onOpenRow(rowIndex)}>
              <Text style={styles.openButtonText}>Planning →</Text>
            </Pressable>
          </View>
        );
      })}

      <Pressable style={styles.addButton} onPress={onAddEmployee}>
        <Text style={styles.addButtonText}>+ Ajouter un salarié</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 8,
      padding: 8,
    },
    nameColumn: {
      flex: 1,
    },
    nameText: {
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 4,
      color: colors.text,
    },
    summaryText: {
      fontSize: 12,
      opacity: 0.7,
      color: colors.text,
    },
    openButton: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: colors.tint,
    },
    openButtonText: {
      color: colors.onTint,
      fontWeight: '600',
      fontSize: 13,
    },
    addButton: {
      marginTop: 8,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      alignItems: 'center',
    },
    addButtonText: {
      fontWeight: '600',
      color: colors.text,
    },
  });
}
