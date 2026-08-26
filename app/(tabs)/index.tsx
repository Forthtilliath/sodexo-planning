import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';

import GridEditor from '@/components/GridEditor';
import HolidayPicker from '@/components/HolidayPicker';
import PersonDayEditor from '@/components/PersonDayEditor';
import SwipeableRow from '@/components/SwipeableRow';
import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  deleteScan,
  getEmployeeCodeOptions,
  getEmployeeRoster,
  getScans,
  getSettings,
  getTeamGroups,
  saveScan,
} from '@/lib/db';
import { rescheduleWorkReminders } from '@/lib/notifications';
import { isRegular, MY_NAME } from '@/lib/teams';
import type { RosterEntry, ScanRecord, TeamGroup } from '@/types';

/** Fait remonter "Moi" en tête de liste, sans changer l'ordre des autres. */
function putMyNameFirst(names: string[]): string[] {
  const index = names.findIndex((n) => n.trim().toLowerCase() === MY_NAME.toLowerCase());
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

const UNDO_TOAST_DURATION_MS = 4000;

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Un mois est "terminé" dès qu'il est strictement antérieur au mois courant. */
function isMonthFinished(year: number, month: number): boolean {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return year < currentYear || (year === currentYear && month < currentMonth);
}

type ScanCategory = 'current' | 'future' | 'past';

function categorizeScan(scan: ScanRecord): ScanCategory {
  const now = new Date();
  const currentKey = now.getFullYear() * 12 + (now.getMonth() + 1);
  const scanKey = scan.year * 12 + scan.month;
  if (scanKey === currentKey) return 'current';
  return scanKey > currentKey ? 'future' : 'past';
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

export default function PlanningEditorScreen() {
  const navigation = useNavigation();
  const editParams = useLocalSearchParams<{ scanId?: string; editRow?: string }>();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const existingScan = useMemo(
    () => scans.find((s) => s.year === year && s.month === month) ?? null,
    [scans, year, month]
  );
  const [showPastMonths, setShowPastMonths] = useState(false);
  // Mois en cours en tête, puis les mois à venir dans l'ordre chronologique,
  // et enfin les mois passés du plus récent au plus ancien (affichés en muted).
  const sortedScans = useMemo(() => {
    const rank = { current: 0, future: 1, past: 2 } as const;
    return scans
      .map((scan) => ({ scan, category: categorizeScan(scan), key: scan.year * 12 + scan.month }))
      .sort((a, b) => {
        if (a.category !== b.category) return rank[a.category] - rank[b.category];
        return a.category === 'past' ? b.key - a.key : a.key - b.key;
      });
  }, [scans]);
  const pastScanCount = useMemo(() => sortedScans.filter((s) => s.category === 'past').length, [sortedScans]);
  const visibleSortedScans = useMemo(
    () => sortedScans.filter((s) => showPastMonths || s.category !== 'past'),
    [sortedScans, showPastMonths]
  );
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const allCodes = useMemo(() => Array.from(new Set(groups.flatMap((g) => g.codes))).sort(), [groups]);
  const [codeOptions, setCodeOptions] = useState<Record<string, string[]>>({});
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  // Bandeau "Annuler" après une suppression par swipe, auto-masqué après
  // quelques secondes (voir showUndoToast/handleUndoDelete).
  const [undoToast, setUndoToast] = useState<ScanRecord | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  }, []);

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
        setGroups(teamGroups);
        setRemindersEnabled(settings.remindersEnabled === true);
        // Rattrape le décalage si l'app n'a pas été ouverte depuis un moment.
        if (settings.remindersEnabled) {
          rescheduleWorkReminders().catch((err) => console.error('reschedule reminders failed', err));
        }
      })();
    }, [])
  );

  // Un salarié régulier ajouté (ou réactivé) dans Réglages pendant qu'un
  // planning est déjà ouvert doit y apparaître directement, sans passer par
  // "+ Ajouter une ligne" à la main. Un intérimaire (non régulier), lui, doit
  // être ajouté à la main — sinon il finirait sur tous les mois.
  useEffect(() => {
    if (step !== 'review') return;
    const activeNames = roster.filter((r) => r.active && isRegular(r)).map((r) => r.name.trim()).filter(Boolean);
    const missing = activeNames.filter(
      (name) => !employees.some((e) => e.trim().toLowerCase() === name.toLowerCase())
    );
    if (missing.length === 0) return;
    setEmployees((prev) => [...prev, ...missing]);
    setGrid((prev) => [...prev, ...missing.map(() => Array(days.length).fill(''))]);
  }, [roster, step, employees, days.length]);

  // Le titre natif de l'écran affiche directement "Planning de X" (personne
  // éditée, ou mois/année en liste), plutôt qu'un second titre en double. En
  // revue, une flèche de retour apparaît à gauche (liste des salariés → liste
  // des plannings) : elle remplace l'ancien lien texte "← Liste des plannings".
  useEffect(() => {
    let title = 'Saisie';
    if (step === 'review') {
      title =
        editingRow !== null
          ? `Planning de ${employees[editingRow] || 'Employé sans nom'}`
          : `Planning de ${MONTH_NAMES[month - 1]} ${year}`;
    }
    navigation.setOptions({
      title,
      headerTitleAlign: 'center',
      headerLeft:
        step === 'review'
          ? () => (
              <Pressable
                onPress={editingRow !== null ? handleClosePersonEditor : goToPlanningsList}
                hitSlop={12}
                style={styles.headerBackButton}
                accessibilityRole="button"
                accessibilityLabel="Retour">
                <Text style={styles.headerBackButtonText}>←</Text>
              </Pressable>
            )
          : undefined,
    });
  }, [navigation, step, editingRow, employees, month, year, styles]);

  function toggleHoliday(iso: string) {
    setHolidays((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  }

  // La liste des salariés actifs et réguliers gérée dans Réglages prime ; à
  // défaut, celle du dernier planning. Les intérimaires (non réguliers) ne
  // sont jamais ajoutés automatiquement, seulement à la main.
  // Dans tous les cas, "Moi" remonte en tête pour se retrouver plus vite.
  function defaultEmployees(): string[] {
    const activeNames = roster.filter((r) => r.active && isRegular(r)).map((r) => r.name);
    if (activeNames.length > 0) return putMyNameFirst(activeNames);
    if (scans[0]?.employees.length) return putMyNameFirst(scans[0].employees);
    return Array(5).fill('');
  }

  // Créer un planning pour un mois déjà terminé n'a normalement aucun intérêt :
  // on demande confirmation plutôt que de bloquer, au cas où ce serait volontaire.
  function handleCreateOrEditPress() {
    if (existingScan) {
      openScanForEditing(existingScan);
      return;
    }
    if (isMonthFinished(year, month)) {
      Alert.alert(
        'Mois déjà terminé',
        `${MONTH_NAMES[month - 1]} ${year} est déjà passé. Créer un planning pour ce mois n'a normalement aucun intérêt.`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Créer quand même', style: 'destructive', onPress: createManualPlanning },
        ]
      );
      return;
    }
    createManualPlanning();
  }

  // Suppression déclenchée par le swipe (≥60% de la largeur de la carte) :
  // pas de confirmation avant coup (ça casserait l'intérêt du swipe direct),
  // mais un petit bandeau après coup avec "Annuler" pour rattraper un geste
  // involontaire — auto-masqué après quelques secondes, pas besoin de le fermer.
  function handleDeleteScan(scan: ScanRecord) {
    deleteScan(scan.id)
      .then(() => {
        setScans((prev) => prev.filter((s) => s.id !== scan.id));
        showUndoToast(scan);
      })
      .catch((err) => {
        console.error('deleteScan failed', err);
        Alert.alert(
          'Échec de la suppression',
          err instanceof Error ? err.message : "Une erreur inconnue s'est produite."
        );
      });
  }

  function showUndoToast(scan: ScanRecord) {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setUndoToast(scan);
    undoTimeoutRef.current = setTimeout(() => setUndoToast(null), UNDO_TOAST_DURATION_MS);
  }

  async function handleUndoDelete() {
    if (!undoToast) return;
    const scan = undoToast;
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setUndoToast(null);
    try {
      await saveScan(scan);
      setScans((prev) => (prev.some((s) => s.id === scan.id) ? prev : [scan, ...prev]));
    } catch (err) {
      console.error('undo deleteScan failed', err);
      Alert.alert("Échec de l'annulation", err instanceof Error ? err.message : "Une erreur inconnue s'est produite.");
    }
  }

  function createManualPlanning() {
    const monthDays = buildDays(year, month);
    const fill = defaultEmployees();
    skipNextAutosaveRef.current = true;
    setDays(monthDays);
    setEmployees(fill);
    setGrid(fill.map(() => Array(monthDays.length).fill('')));
    setCurrentScanId(null);
    setHolidays(new Set());
    setStep('review');
  }

  /** Reprend un planning déjà enregistré (même en plusieurs fois, sur plusieurs jours). */
  const openScanForEditing = useCallback((scan: ScanRecord) => {
    skipNextAutosaveRef.current = true;
    setYear(scan.year);
    setMonth(scan.month);
    setDays(scan.days);
    setEmployees(scan.employees);
    setGrid(scan.grid.map((row) => [...row]));
    setHolidays(new Set(scan.holidays ?? []));
    setCurrentScanId(scan.id);
    setEditingRow(null);
    setStep('review');
  }, []);

  // Arrivée depuis "Mon planning" (bouton "✏️ Modifier") : ouvre directement
  // le bon planning sur la bonne personne, sans repasser par la sélection
  // mois/salarié à la main. Les params sont retirés une fois consommés, sinon
  // revenir sur cet onglet plus tard nous ramènerait toujours au même endroit.
  useEffect(() => {
    if (!editParams.scanId || !editParams.editRow) return;
    const scan = scans.find((s) => s.id === editParams.scanId);
    if (!scan) return;
    const rowIndex = Number(editParams.editRow);
    openScanForEditing(scan);
    setEditingRow(Number.isNaN(rowIndex) ? null : rowIndex);
    router.setParams({ scanId: undefined, editRow: undefined });
  }, [editParams, scans, openScanForEditing]);

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

  /** Enregistre l'état courant sans confirmation ; utilisé par l'auto-save et les retours arrière. */
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
    if (remindersEnabled) {
      rescheduleWorkReminders().catch((err) => console.error('reschedule reminders failed', err));
    }
    return scan;
  }

  // Auto-save : toute modif du planning en revue s'enregistre seule, avec un
  // léger débounce pour ne pas écrire à chaque frappe. `skipNextAutosaveRef`
  // évite un enregistrement parasite juste après avoir chargé un planning
  // (createManualPlanning / openScanForEditing changent aussi days/employees/
  // grid, sans que ce soit une vraie modif de l'utilisateur).
  const skipNextAutosaveRef = useRef(false);
  useEffect(() => {
    if (step !== 'review') return;
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      persistScan().catch((err) => console.error('auto-save failed', err));
    }, 600);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, days, employees, grid, holidays]);

  /** Retour à la liste des salariés depuis l'éditeur d'une personne : enregistre immédiatement, sans alerte. */
  function handleClosePersonEditor() {
    setEditingRow(null);
    persistScan().catch((err) => console.error('auto-save failed', err));
  }

  /** Retour à la liste des plannings (accueil) : enregistre automatiquement avant de quitter. */
  function goToPlanningsList() {
    persistScan().catch((err) => console.error('auto-save failed', err));
    reset();
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

          <Pressable style={styles.primaryButton} onPress={handleCreateOrEditPress}>
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
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Reprendre un planning</Text>
                {pastScanCount > 0 && (
                  <View style={styles.pastToggle}>
                    <Text style={styles.pastToggleLabel}>Mois passés</Text>
                    <Switch value={showPastMonths} onValueChange={setShowPastMonths} />
                  </View>
                )}
              </View>
              {visibleSortedScans.map(({ scan, category }) => (
                <SwipeableRow key={scan.id} onDelete={() => handleDeleteScan(scan)}>
                  <Pressable style={styles.savedRow} onPress={() => openScanForEditing(scan)}>
                    <View>
                      <Text style={[styles.savedRowTitle, category === 'past' && styles.savedRowTitlePast]}>
                        {MONTH_NAMES[scan.month - 1]} {scan.year}
                      </Text>
                      <Text style={[styles.savedRowHint, category === 'past' && styles.savedRowHintPast]}>
                        {scan.employees.length} salarié(s)
                      </Text>
                    </View>
                    <Text style={[styles.savedRowAction, category === 'past' && styles.savedRowActionPast]}>
                      Modifier →
                    </Text>
                  </Pressable>
                </SwipeableRow>
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
              groups={groups}
              holidays={holidays}
              onChangeCode={(colIndex, value) => updateCell(editingRow, colIndex, value)}
            />
          ) : (
            <>
              <HolidayPicker days={days} holidays={holidays} onToggle={toggleHoliday} />
              <GridEditor
                days={days}
                employees={employees}
                grid={grid}
                onAddEmployee={goToRoster}
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

      {undoToast && (
        <View style={styles.undoToast}>
          <Text style={styles.undoToastText} numberOfLines={1}>
            {MONTH_NAMES[undoToast.month - 1]} {undoToast.year} supprimé
          </Text>
          <Pressable onPress={handleUndoDelete} hitSlop={8}>
            <Text style={styles.undoToastAction}>Annuler</Text>
          </Pressable>
        </View>
      )}
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    undoToast: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 24,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: '#1f1f1f',
      elevation: 4,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    undoToastText: {
      flex: 1,
      color: '#fff',
      fontSize: 14,
    },
    undoToastAction: {
      color: '#7cc0ff',
      fontWeight: '700',
      fontSize: 14,
    },
    headerBackButton: {
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    headerBackButtonText: {
      fontSize: 22,
      fontWeight: '600',
      color: colors.tint,
    },
    container: {
      flex: 1,
    },
    content: {
      padding: 16,
      paddingBottom: 64,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    pastToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    pastToggleLabel: {
      fontSize: 12,
      opacity: 0.7,
      color: colors.text,
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
      color: colors.text,
    },
    selectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
    },
    selectButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    selectChevron: {
      opacity: 0.5,
      color: colors.text,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: {
      width: '100%',
      maxHeight: '70%',
      backgroundColor: colors.modalCard,
      borderRadius: 12,
      paddingVertical: 8,
    },
    modalOption: {
      paddingVertical: 14,
      paddingHorizontal: 20,
    },
    modalOptionText: {
      fontSize: 16,
      color: colors.text,
    },
    hint: {
      fontSize: 12,
      opacity: 0.7,
      marginTop: 4,
      color: colors.text,
    },
    separator: {
      height: 1,
      marginVertical: 20,
      backgroundColor: colors.borderSubtle,
    },
    savedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      // Opaque (pas borderSubtle, translucide) : sinon le rouge de
      // SwipeableRow transparaît à travers le trait de bordure lui-même.
      borderColor: colors.divider,
      borderRadius: 8,
      padding: 12,
      // Fond opaque : cette ligne glisse par-dessus le bouton "Supprimer"
      // (SwipeableRow) et doit le masquer complètement tant qu'on ne swipe pas.
      backgroundColor: colors.card,
    },
    savedRowTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    savedRowTitlePast: {
      fontWeight: '400',
      opacity: 0.55,
    },
    savedRowHint: {
      fontSize: 12,
      opacity: 0.7,
      marginTop: 2,
      color: colors.text,
    },
    savedRowHintPast: {
      opacity: 0.45,
    },
    savedRowAction: {
      color: colors.tint,
      fontWeight: '600',
    },
    savedRowActionPast: {
      opacity: 0.55,
    },
    primaryButton: {
      marginTop: 16,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: colors.tint,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    primaryButtonText: {
      color: colors.onTint,
      fontWeight: '700',
    },
    resetButton: {
      marginTop: 24,
      alignItems: 'center',
    },
    resetButtonText: {
      color: colors.danger,
    },
  });
}
