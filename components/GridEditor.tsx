import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  days: string[]; // dates ISO, une par colonne
  employees: string[];
  grid: string[][];
  onChangeEmployee: (rowIndex: number, value: string) => void;
  onRemoveRow: (rowIndex: number) => void;
  onAddRow: () => void;
  onOpenRow: (rowIndex: number) => void;
};

/** Liste des salariés du scan : un par ligne, avec un résumé de remplissage et un accès à l'éditeur par personne. */
export default function GridEditor({ days, employees, grid, onChangeEmployee, onRemoveRow, onAddRow, onOpenRow }: Props) {
  function confirmRemove(rowIndex: number, name: string) {
    Alert.alert(
      'Supprimer cette ligne ?',
      `"${name || `Employé ${rowIndex + 1}`}" et son planning seront retirés de ce scan.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => onRemoveRow(rowIndex) },
      ]
    );
  }

  return (
    <View>
      {employees.map((name, rowIndex) => {
        const filledCount = (grid[rowIndex] ?? []).filter((c) => c.trim()).length;
        return (
          <View key={rowIndex} style={styles.row}>
            <Pressable style={styles.deleteButton} onPress={() => confirmRemove(rowIndex, name)}>
              <Text style={styles.deleteText}>×</Text>
            </Pressable>
            <View style={styles.nameColumn}>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={(value) => onChangeEmployee(rowIndex, value)}
                placeholder={`Employé ${rowIndex + 1}`}
              />
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

      <Pressable style={styles.addButton} onPress={onAddRow}>
        <Text style={styles.addButtonText}>+ Ajouter une ligne</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
    borderRadius: 8,
    padding: 8,
  },
  deleteButton: {
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  deleteText: {
    color: '#a33',
    fontWeight: '700',
    fontSize: 16,
  },
  nameColumn: {
    flex: 1,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 6,
    padding: 8,
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 12,
    opacity: 0.7,
  },
  openButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#2f95dc',
  },
  openButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  addButton: {
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#999',
    alignItems: 'center',
  },
  addButtonText: {
    fontWeight: '600',
  },
});
