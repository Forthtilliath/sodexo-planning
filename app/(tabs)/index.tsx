import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import GridEditor from '@/components/GridEditor';
import HolidayPicker from '@/components/HolidayPicker';
import PersonDayEditor from '@/components/PersonDayEditor';
import { getEmployeeCodeOptions, getEmployeeRoster, getScans, getSettings, getTeamGroups, saveScan } from '@/lib/db';
import type { RosterEntry, ScanRecord, TeamGroup } from '@/types';

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
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);
  const existingScan = scans.find((s) => s.year === year && s.month === month) ?? null;
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const allCodes = Array.from(new Set(groups.flatMap((g) => g.codes))).sort();
  const [myName, setMyName] = useState('');
  const [codeOptions, setCodeOptions] = useState<Record<string, string[]>>({});
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [editingRow, setEditingRow] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [loadedScans, employeeRoster, options, settings, teamGroups] = await Promise.all([
          getScans(),
          getEmployeeRoster(),
          getEmployeeCodeOptions(),
          getSettings(),
          getTeamGroups(),
        ]);
        setScans(loadedScans);
        setRoster(employeeRoster);
        setCodeOptions(options);
        setMyName(settings.myName);
        setGroups(teamGroups);
      })();
    }, [])
  );

  // Un salarié ajouté (ou réactivé) dans Réglages pendant qu'un planning est
  // déjà ouvert doit y apparaître directement, sans passer par "+ Ajouter une
  // ligne" à la main.
  useEffect(() => {
    if (step !== 'review') return;
    const activeNames = roster.filter((r) => r.active).map((r) => r.name.trim()).filter(Boolean);
    const missing = activeNames.filter(
      (name) => !employees.some((e) => e.trim().toLowerCase() === name.toLowerCase())
    );
    if (missing.length === 0) return;
    setEmployees((prev) => [...prev, ...missing]);
    setGrid((prev) => [...prev, ...missing.map(() => Array(days.length).fill(''))]);
  }, [roster, step, employees, days.length]);

  function toggleHoliday(iso: string) {
    setHolidays((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  }

  // La liste des salariés actifs gérée dans Réglages prime ; à défaut, celle du dernier planning.
  // Dans tous les cas, "Mon nom" remonte en tête pour se retrouver plus vite.
  function defaultEmployees(): string[] {
    const activeNames = roster.filter((r) => r.active).map((r) => r.name);
    if (activeNames.length > 0) return putMyNameFirst(activeNames, myName);
    if (scans[0]?.employees.length) return putMyNameFirst(scans[0].employees, myName);
    return Array(5).fill('');
  }

  function createManualPlanning() {
    const monthDays = buildDays(year, month);
    const fill = defaultEmployees();
    setDays(monthDays);
    setEmployees(fill);
    setGrid(fill.map(() => Array(monthDays.length).fill('')));
    setCurrentScanId(null);
    setHolidays(new Set());
    setStep('review');
  }

  /** Reprend un planning déjà enregistré (même en plusieurs fois, sur plusieurs jours). */
  function openScanForEditing(scan: ScanRecord) {
    setYear(scan.year);
    setMonth(scan.month);
    setDays(scan.days);
    setEmployees(scan.employees);
    setGrid(scan.grid.map((row) => [...row]));
    setHolidays(new Set(scan.holidays ?? []));
    setCurrentScanId(scan.id);
    setEditingRow(null);
    setStep('review');
  }

  function updateCell(rowIndex: number, colIndex: number, value: string) {
    setGrid((prev) =>
      prev.map((row, r) => (r === rowIndex ? row.map((c, cI) => (cI === colIndex ? value : c)) : row))
    );
  }

  // Les noms viennent du roster (Réglages) et se synchronisent automatiquement
  // dans le planning ouvert : "+ Ajouter" y redirige plutôt que de créer une
  // ligne sans nom.
  function goToRoster() {
    router.push('/settings/roster');
  }

  function removeRow(rowIndex: number) {
    setEmployees((prev) => prev.filter((_, i) => i !== rowIndex));
    setGrid((prev) => prev.filter((_, i) => i !== rowIndex));
    setEditingRow(null);
  }

  /** Enregistre l'état courant sans confirmation ; réutilisé par le bouton "Enregistrer" et l'auto-save. */
  async function persistScan(): Promise<ScanRecord> {
    const existing = scans.find((s) => s.id === currentScanId);
    const scan: ScanRecord = {
      id: currentScanId ?? randomId(),
      year,
      month,
      createdAt: existing?.createdAt ?? Date.now(),
      days,
      employees,
      grid: grid.map((row) => row.map((cell) => cell.trim().toUpperCase())),
      holidays: Array.from(holidays),
    };
    await saveScan(scan);
    setCurrentScanId(scan.id);
    setScans((prev) => {
      const index = prev.findIndex((s) => s.id === scan.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = scan;
        return next;
      }
      return [scan, ...prev];
    });
    return scan;
  }

  // Toujours accessible sous le titre, sans avoir à remonter en haut de
  // l'écran : enregistre sur place et confirme brièvement, sans bloquer avec
  // une alerte (on peut ne pas avoir fini de tout saisir d'un coup).
  async function handleQuickSave() {
    if (saveState === 'saving') return;
    setSaveState('saving');
    try {
      await persistScan();
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1500);
    } catch (err) {
      console.error('handleQuickSave failed', err);
      setSaveState('idle');
      Alert.alert("Échec de l'enregistrement", err instanceof Error ? err.message : "Une erreur inconnue s'est produite.");
    }
  }

  /** Retour à la liste des salariés depuis l'éditeur d'une personne : enregistre automatiquement, sans alerte. */
  function handleClosePersonEditor() {
    setEditingRow(null);
    persistScan().catch((err) => console.error('auto-save failed', err));
  }

  function reset() {
    setStep('home');
    setEmployees([]);
    setDays([]);
    setGrid([]);
    setEditingRow(null);
    setHolidays(new Set());
    setCurrentScanId(null);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.headerArea}>
        <Text style={styles.title} numberOfLines={1}>
          {step === 'review' && editingRow !== null
            ? `Planning de ${employees[editingRow] || 'Employé sans nom'}`
            : 'Planning'}
        </Text>
        {step === 'review' && (
          <View style={styles.topActionBar}>
            {editingRow !== null && (
              <Pressable style={styles.topBackButton} onPress={handleClosePersonEditor} hitSlop={8}>
                <Text style={styles.topBackButtonText}>← Retour à la liste</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.topSaveButton, saveState === 'saving' && styles.buttonDisabled]}
              disabled={saveState === 'saving'}
              onPress={handleQuickSave}>
              {saveState === 'saving' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.topSaveButtonText}>{saveState === 'saved' ? '✓ Enregistré' : '💾 Enregistrer'}</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

          <Pressable
            style={styles.primaryButton}
            onPress={() => (existingScan ? openScanForEditing(existingScan) : createManualPlanning())}>
            <Text style={styles.primaryButtonText}>{existingScan ? '✏️ Modifier ce planning' : '✏️ Créer le planning'}</Text>
          </Pressable>
          <Text style={styles.hint}>
            {existingScan
              ? `Un planning existe déjà pour ${MONTH_NAMES[month - 1]} ${year} (${existingScan.employees.length} salarié(s)).`
              : 'Grille pré-remplie avec ta liste de salariés (Réglages) ; complète-la avec le mode sélection multiple.'}
          </Text>

          {scans.length > 0 && (
            <>
              <View style={styles.separator} />
              <Text style={styles.sectionTitle}>Reprendre un planning</Text>
              {scans.map((scan) => (
                <Pressable key={scan.id} style={styles.savedRow} onPress={() => openScanForEditing(scan)}>
                  <View>
                    <Text style={styles.savedRowTitle}>
                      {MONTH_NAMES[scan.month - 1]} {scan.year}
                    </Text>
                    <Text style={styles.savedRowHint}>{scan.employees.length} salarié(s)</Text>
                  </View>
                  <Text style={styles.savedRowAction}>Modifier →</Text>
                </Pressable>
              ))}
            </>
          )}
        </>
      )}

      {step === 'review' && (
        <>
          {editingRow !== null ? (
            <PersonDayEditor
              days={days}
              codes={grid[editingRow] ?? []}
              codeOptions={codeOptions[employees[editingRow] ?? ''] ?? []}
              allCodes={allCodes}
              holidays={holidays}
              onChangeCode={(colIndex, value) => updateCell(editingRow, colIndex, value)}
            />
          ) : (
            <>
              <Text style={styles.sectionTitle}>
                {MONTH_NAMES[month - 1]} {year} — {employees.length} ligne(s)
                {currentScanId ? ' · modification' : ''}
              </Text>
              <HolidayPicker days={days} holidays={holidays} onToggle={toggleHoliday} />
              <GridEditor
                days={days}
                employees={employees}
                grid={grid}
                onAddEmployee={goToRoster}
                onRemoveRow={removeRow}
                onOpenRow={setEditingRow}
              />
              <Pressable style={styles.resetButton} onPress={reset}>
                <Text style={styles.resetButtonText}>Recommencer</Text>
              </Pressable>
            </>
          )}
        </>
      )}
      </ScrollView>
    </View>
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
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerArea: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  topActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  topBackButton: {
    flexShrink: 1,
  },
  topBackButtonText: {
    color: '#2f95dc',
    fontWeight: '600',
  },
  topSaveButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#2f95dc',
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSaveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 64,
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
  separator: {
    height: 1,
    marginVertical: 20,
    backgroundColor: 'rgba(128,128,128,0.3)',
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  savedRowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  savedRowHint: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  savedRowAction: {
    color: '#2f95dc',
    fontWeight: '600',
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
