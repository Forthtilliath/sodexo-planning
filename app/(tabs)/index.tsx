import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import GridEditor from '@/components/GridEditor';
import HolidayPicker from '@/components/HolidayPicker';
import PersonDayEditor from '@/components/PersonDayEditor';
import { getEmployeeCodeOptions, getEmployeeRoster, getScans, getSettings, saveScan } from '@/lib/db';
import type { RosterEntry, ScanRecord } from '@/types';

/** Fait remonter "Mon nom" en tête de liste, sans changer l'ordre des autres. */
function putMyNameFirst(names: string[], myName: string): string[] {
  const trimmed = myName.trim().toLowerCase();
  if (!trimmed) return names;
  const index = names.findIndex((n) => n.trim().toLowerCase() === trimmed);
  if (index <= 0) return names;
  const next = [...names];
  const [mine] = next.splice(index, 1);
  next.unshift(mine);
  return next;
}

const MONTH_NAMES = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function daysInMonth(year: number, month: number): number {
  // Jour 0 du mois suivant = dernier jour du mois courant.
  return new Date(year, month, 0).getDate();
}

function buildDays(year: number, month: number): string[] {
  const count = daysInMonth(year, month);
  const days: string[] = [];
  const date = new Date(Date.UTC(year, month - 1, 1));
  for (let i = 0; i < count; i++) {
    days.push(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return days;
}

type Step = 'home' | 'review';

export default function ScannerScreen() {
  const [step, setStep] = useState<Step>('home');

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const [employees, setEmployees] = useState<string[]>([]);
  const [days, setDays] = useState<string[]>([]);
  const [grid, setGrid] = useState<string[][]>([]);
  const [lastEmployees, setLastEmployees] = useState<string[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [myName, setMyName] = useState('');
  const [codeOptions, setCodeOptions] = useState<Record<string, string[]>>({});
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [editingRow, setEditingRow] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [scans, employeeRoster, options, settings] = await Promise.all([
          getScans(),
          getEmployeeRoster(),
          getEmployeeCodeOptions(),
          getSettings(),
        ]);
        setLastEmployees(scans[0]?.employees ?? []);
        setRoster(employeeRoster);
        setCodeOptions(options);
        setMyName(settings.myName);
      })();
    }, [])
  );

  function toggleHoliday(iso: string) {
    setHolidays((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  }

  // La liste des salariés actifs gérée dans Réglages prime ; à défaut, celle du dernier scan.
  // Dans tous les cas, "Mon nom" remonte en tête pour se retrouver plus vite.
  function defaultEmployees(): string[] {
    const activeNames = roster.filter((r) => r.active).map((r) => r.name);
    if (activeNames.length > 0) return putMyNameFirst(activeNames, myName);
    if (lastEmployees.length > 0) return putMyNameFirst(lastEmployees, myName);
    return Array(5).fill('');
  }

  function createManualPlanning() {
    const monthDays = buildDays(year, month);
    const fill = defaultEmployees();
    setDays(monthDays);
    setEmployees(fill);
    setGrid(fill.map(() => Array(monthDays.length).fill('')));
    setStep('review');
  }

  function updateEmployee(rowIndex: number, value: string) {
    setEmployees((prev) => prev.map((e, i) => (i === rowIndex ? value : e)));
  }

  function updateCell(rowIndex: number, colIndex: number, value: string) {
    setGrid((prev) =>
      prev.map((row, r) => (r === rowIndex ? row.map((c, cI) => (cI === colIndex ? value : c)) : row))
    );
  }

  function addRow() {
    setEmployees((prev) => [...prev, '']);
    setGrid((prev) => [...prev, Array(days.length).fill('')]);
  }

  function removeRow(rowIndex: number) {
    setEmployees((prev) => prev.filter((_, i) => i !== rowIndex));
    setGrid((prev) => prev.filter((_, i) => i !== rowIndex));
    setEditingRow(null);
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const scan: ScanRecord = {
        id: randomId(),
        year,
        month,
        createdAt: Date.now(),
        days,
        employees,
        grid: grid.map((row) => row.map((cell) => cell.trim().toUpperCase())),
      };
      await saveScan(scan);
      Alert.alert('Planning enregistré', 'Tu peux le consulter dans "Mon planning".', [
        {
          text: 'OK',
          onPress: () => {
            reset();
            router.push('/planning');
          },
        },
      ]);
    } catch (err) {
      console.error('handleSave failed', err);
      Alert.alert("Échec de l'enregistrement", err instanceof Error ? err.message : "Une erreur inconnue s'est produite.");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setStep('home');
    setEmployees([]);
    setDays([]);
    setGrid([]);
    setEditingRow(null);
    setHolidays(new Set());
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Planning</Text>

      {step === 'home' && (
        <>
          <View style={styles.row}>
            <SelectField
              label="Mois"
              valueLabel={MONTH_NAMES[month - 1]}
              options={MONTH_NAMES.map((name, i) => ({ value: i + 1, label: name }))}
              onSelect={setMonth}
            />
            <SelectField
              label="Année"
              valueLabel={String(year)}
              options={yearOptions.map((y) => ({ value: y, label: String(y) }))}
              onSelect={setYear}
            />
          </View>

          <Pressable style={styles.primaryButton} onPress={createManualPlanning}>
            <Text style={styles.primaryButtonText}>✏️ Créer le planning</Text>
          </Pressable>
          <Text style={styles.hint}>
            Grille pré-remplie avec ta liste de salariés (Réglages) ; complète-la avec le mode sélection multiple.
          </Text>
        </>
      )}

      {step === 'review' && (
        <>
          {editingRow !== null ? (
            <PersonDayEditor
              employeeName={employees[editingRow] ?? ''}
              days={days}
              codes={grid[editingRow] ?? []}
              codeOptions={codeOptions[employees[editingRow] ?? ''] ?? []}
              holidays={holidays}
              onChangeCode={(colIndex, value) => updateCell(editingRow, colIndex, value)}
              onClose={() => setEditingRow(null)}
            />
          ) : (
            <>
              <Text style={styles.sectionTitle}>
                {MONTH_NAMES[month - 1]} {year} — {employees.length} ligne(s)
              </Text>
              <HolidayPicker days={days} holidays={holidays} onToggle={toggleHoliday} />
              <GridEditor
                days={days}
                employees={employees}
                grid={grid}
                onChangeEmployee={updateEmployee}
                onAddRow={addRow}
                onRemoveRow={removeRow}
                onOpenRow={setEditingRow}
              />
              <Pressable style={[styles.primaryButton, saving && styles.buttonDisabled]} disabled={saving} onPress={handleSave}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Enregistrer le planning</Text>}
              </Pressable>
              <Pressable style={styles.resetButton} onPress={reset}>
                <Text style={styles.resetButtonText}>Recommencer</Text>
              </Pressable>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

function SelectField({
  label,
  valueLabel,
  options,
  onSelect,
}: {
  label: string;
  valueLabel: string;
  options: { value: number; label: string }[];
  onSelect: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.labeledInput}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable style={styles.selectButton} onPress={() => setOpen(true)}>
        <Text style={styles.selectButtonText}>{valueLabel}</Text>
        <Text style={styles.selectChevron}>▾</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <View style={styles.modalCard}>
            <ScrollView>
              {options.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={styles.modalOption}
                  onPress={() => {
                    onSelect(opt.value);
                    setOpen(false);
                  }}>
                  <Text style={styles.modalOptionText}>{opt.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 64,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  labeledInput: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    padding: 10,
  },
  selectButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  selectChevron: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  modalOptionText: {
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  primaryButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2f95dc',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  resetButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#a33',
  },
});
