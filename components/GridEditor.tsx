import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  days: string[]; // dates ISO, une par colonne
  employees: string[];
  grid: string[][];
  onChangeEmployee: (rowIndex: number, value: string) => void;
  onChangeCell: (rowIndex: number, colIndex: number, value: string) => void;
};

const NAME_WIDTH = 140;
const CELL_WIDTH = 46;

/** Tableau éditable (lignes = employés, colonnes = jours) pour corriger les valeurs devinées par l'OCR. */
export default function GridEditor({ days, employees, grid, onChangeEmployee, onChangeCell }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View>
        <View style={styles.row}>
          <View style={[styles.cell, styles.headerCell, { width: NAME_WIDTH }]} />
          {days.map((day, i) => (
            <View key={`${day}-${i}`} style={[styles.cell, styles.headerCell, { width: CELL_WIDTH }]}>
              <Text style={styles.headerText}>{new Date(day).getDate() || i + 1}</Text>
            </View>
          ))}
        </View>

        <ScrollView>
          {employees.map((name, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              <TextInput
                style={[styles.cell, styles.input, { width: NAME_WIDTH, textAlign: 'left' }]}
                value={name}
                onChangeText={(value) => onChangeEmployee(rowIndex, value)}
                placeholder={`Employé ${rowIndex + 1}`}
              />
              {days.map((_, colIndex) => (
                <TextInput
                  key={colIndex}
                  style={[styles.cell, styles.input, { width: CELL_WIDTH }]}
                  value={grid[rowIndex]?.[colIndex] ?? ''}
                  onChangeText={(value) => onChangeCell(rowIndex, colIndex, value)}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  cell: {
    height: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#999',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCell: {
    backgroundColor: 'rgba(128,128,128,0.15)',
  },
  headerText: {
    fontWeight: 'bold',
  },
  input: {
    textAlign: 'center',
    fontSize: 13,
  },
});
