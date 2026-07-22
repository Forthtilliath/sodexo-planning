import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';

import BottomSheet from '@/components/BottomSheet';
import MonthCalendarView from '@/components/MonthCalendarView';
import { getCodeSchedules, getScans, getSettings, getTeamGroups } from '@/lib/db';
import { buildIcsFilename, shareIcs } from '@/lib/exportIcs';
import { buildIcs } from '@/lib/ics';
import { computeMonthPlanning, findMyRowIndex, formatScheduleHours, type DayPlanning } from '@/lib/teams';
import type { CodeSchedule, ScanRecord, Settings, TeamGroup } from '@/types';

type ViewMode = 'list' | 'calendar';

const MONTH_NAMES = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  const weekday = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'][date.getDay()];
  return `${weekday} ${date.getDate()}`;
}

function monthYearLabel(scan: ScanRecord): string {
  const month = MONTH_NAMES[scan.month - 1];
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${scan.year}`;
}

export default function PlanningScreen() {
  const navigation = useNavigation();
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [settings, setSettings] = useState<Settings>({ myName: '' });
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [schedules, setSchedules] = useState<CodeSchedule[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [manualRowIndex, setManualRowIndex] = useState<number | null>(null);
  const [viewingName, setViewingName] = useState<string | null>(null);
  const [colleaguePickerOpen, setColleaguePickerOpen] = useState(false);
  const [pastMonthsPickerOpen, setPastMonthsPickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showHours, setShowHours] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [loadedScans, loadedSettings, loadedGroups, loadedSchedules] = await Promise.all([
          getScans(),
          getSettings(),
          getTeamGroups(),
          getCodeSchedules(),
        ]);
        setScans(loadedScans);
        setSettings(loadedSettings);
        setGroups(loadedGroups);
        setSchedules(loadedSchedules);
        setSelectedScanId((prev) => prev ?? loadedScans[0]?.id ?? null);
        setManualRowIndex(null);
      })();
    }, [])
  );

  const selectedScan = useMemo(() => scans.find((s) => s.id === selectedScanId) ?? null, [scans, selectedScanId]);

  // Sépare les plannings du mois courant/à venir (affichés en haut) de ceux
  // déjà passés (rangés dans une popup dédiée, plus loin dans la page).
  const { visibleScans, pastScans } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const visible: ScanRecord[] = [];
    const past: ScanRecord[] = [];
    for (const scan of scans) {
      const isPast = scan.year < currentYear || (scan.year === currentYear && scan.month < currentMonth);
      (isPast ? past : visible).push(scan);
    }
    past.sort((a, b) => b.year - a.year || b.month - a.month);
    return { visibleScans: visible, pastScans: past };
  }, [scans]);

  const myRowIndex = useMemo(() => {
    if (!selectedScan) return -1;
    if (manualRowIndex !== null) return manualRowIndex;
    return findMyRowIndex(selectedScan, settings.myName);
  }, [selectedScan, settings.myName, manualRowIndex]);

  // Le nom du collègue consulté est conservé (pas son index de ligne), pour
  // rester sur la même personne quand on change de planning plutôt que de
  // revenir sur "moi" à chaque fois.
  const viewingIndex = useMemo(() => {
    if (!selectedScan || viewingName === null) return -1;
    return findMyRowIndex(selectedScan, viewingName);
  }, [selectedScan, viewingName]);

  const viewingSomeoneElse = viewingIndex >= 0 && viewingIndex !== myRowIndex;
  const displayRowIndex = viewingSomeoneElse ? viewingIndex : myRowIndex;

  // Le titre natif de l'écran affiche "Planning de X" quand on consulte un
  // collègue, plutôt qu'un second titre en double dans la page.
  useEffect(() => {
    navigation.setOptions({
      title: viewingSomeoneElse ? `Planning de ${selectedScan?.employees[viewingIndex] || '—'}` : 'Mon planning',
    });
  }, [navigation, viewingSomeoneElse, selectedScan, viewingIndex]);

  const planning: DayPlanning[] = useMemo(() => {
    if (!selectedScan || displayRowIndex < 0) return [];
    return computeMonthPlanning(selectedScan, displayRowIndex, groups, schedules);
  }, [selectedScan, displayRowIndex, groups, schedules]);

  async function handleExport() {
    if (!selectedScan || displayRowIndex < 0) return;
    setExporting(true);
    try {
      const ics = buildIcs(selectedScan, groups, displayRowIndex, schedules);
      const filename = buildIcsFilename(
        selectedScan.year,
        selectedScan.month,
        selectedScan.employees[displayRowIndex]
      );
      await shareIcs(filename, ics);
    } catch (err) {
      Alert.alert('Export impossible', err instanceof Error ? err.message : "Une erreur s'est produite.");
    } finally {
      setExporting(false);
    }
  }

  if (scans.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Aucun planning pour l'instant.</Text>
        <Text style={styles.emptyHint}>Va dans l'onglet Planning pour en créer un.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.scanPickerRow}>
        {pastScans.length > 0 && (
          <Pressable style={styles.pastMonthsButton} onPress={() => setPastMonthsPickerOpen(true)}>
            <Text style={styles.pastMonthsButtonText}>🕓</Text>
          </Pressable>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scanPicker}>
          {visibleScans.map((scan) => (
            <Pressable
              key={scan.id}
              style={[styles.scanChip, scan.id === selectedScanId && styles.scanChipActive]}
              onPress={() => setSelectedScanId(scan.id)}>
              <Text style={[styles.scanChipText, scan.id === selectedScanId && styles.scanChipTextActive]}>
                {monthYearLabel(scan)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {selectedScan && selectedScan.employees.length > 0 && (
        <View style={styles.viewerRow}>
          <Pressable
            style={[styles.viewerButton, viewingSomeoneElse && styles.viewerButtonActive]}
            onPress={() => setColleaguePickerOpen(true)}>
            <Text
              style={[styles.viewerButtonText, viewingSomeoneElse && styles.viewerButtonTextActive]}
              numberOfLines={1}>
              {viewingSomeoneElse ? `👥 ${selectedScan.employees[viewingIndex] || 'Collègue'}` : '👥 Un collègue'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.viewerButton, !viewingSomeoneElse && styles.viewerButtonActive]}
            onPress={() => setViewingName(null)}>
            <Text style={[styles.viewerButtonText, !viewingSomeoneElse && styles.viewerButtonTextActive]}>
              🙋 Mon planning
            </Text>
          </Pressable>
        </View>
      )}

      <BottomSheet visible={colleaguePickerOpen} onClose={() => setColleaguePickerOpen(false)}>
        {selectedScan?.employees.map((name, index) => (
          <Pressable
            key={index}
            style={[styles.employeeRow, index > 0 && styles.employeeRowDivider]}
            onPress={() => {
              setViewingName(name);
              setColleaguePickerOpen(false);
            }}>
            <Text>
              {name || `Ligne ${index + 1}`}
              {index === myRowIndex ? ' (moi)' : ''}
            </Text>
          </Pressable>
        ))}
      </BottomSheet>

      <BottomSheet visible={pastMonthsPickerOpen} onClose={() => setPastMonthsPickerOpen(false)}>
        {pastScans.map((scan, index) => (
          <Pressable
            key={scan.id}
            style={[styles.employeeRow, index > 0 && styles.employeeRowDivider]}
            onPress={() => {
              setSelectedScanId(scan.id);
              setPastMonthsPickerOpen(false);
            }}>
            <Text>{monthYearLabel(scan)}</Text>
          </Pressable>
        ))}
      </BottomSheet>

      {selectedScan && !viewingSomeoneElse && myRowIndex < 0 && (
        <View style={styles.notFoundBox}>
          <Text style={styles.notFoundText}>
            Nom "{settings.myName || '(non renseigné)'}" introuvable dans ce planning. Choisis ta ligne :
          </Text>
          {selectedScan.employees.map((name, index) => (
            <Pressable
              key={index}
              style={[styles.employeeRow, index > 0 && styles.employeeRowDivider]}
              onPress={() => setManualRowIndex(index)}>
              <Text>{name || `Ligne ${index + 1}`}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {selectedScan && displayRowIndex >= 0 && (
        <>
          <View style={styles.viewModeRow}>
            <Pressable
              style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeButtonActive]}
              onPress={() => setViewMode('list')}>
              <Text style={[styles.viewModeText, viewMode === 'list' && styles.viewModeTextActive]}>📋 Liste</Text>
            </Pressable>
            <Pressable
              style={[styles.viewModeButton, viewMode === 'calendar' && styles.viewModeButtonActive]}
              onPress={() => setViewMode('calendar')}>
              <Text style={[styles.viewModeText, viewMode === 'calendar' && styles.viewModeTextActive]}>
                📅 Calendrier
              </Text>
            </Pressable>
          </View>

          <Pressable style={styles.hoursToggleRow} onPress={() => setShowHours((v) => !v)}>
            <Text style={styles.hoursToggleLabel}>🕐 Afficher les horaires</Text>
            <Switch value={showHours} onValueChange={setShowHours} />
          </Pressable>

          {viewMode === 'list' ? (
            planning.map((day) => {
              const isHoliday = selectedScan?.holidays?.includes(day.date) ?? false;
              return (
                <View key={day.date} style={[styles.dayRow, isHoliday && styles.dayRowHoliday]}>
                  <View style={styles.dayDate}>
                    <Text style={styles.dayDateText}>{formatDate(day.date)}</Text>
                  </View>
                  <View style={styles.dayInfo}>
                    <View style={styles.dayCodeRow}>
                      {day.group?.color && <View style={[styles.groupDot, { backgroundColor: day.group.color }]} />}
                      <Text style={styles.dayCode}>
                        {day.code || '—'}
                        {showHours && day.schedule && (
                          <Text style={styles.daySchedule}> ({formatScheduleHours(day.schedule)})</Text>
                        )}
                        {day.teammates.length > 0 && (
                          <Text style={styles.dayTeammates}>
                            {' '}
                            · {day.teammates.map((t) => `${t.code} ${t.name}`).join(', ')}
                          </Text>
                        )}
                      </Text>
                    </View>
                  </View>
                  {isHoliday && <Text style={styles.dayHolidayTag}>Férié</Text>}
                </View>
              );
            })
          ) : (
            <MonthCalendarView planning={planning} holidays={selectedScan?.holidays ?? []} showHours={showHours} />
          )}

          <Pressable style={styles.exportButton} disabled={exporting} onPress={handleExport}>
            <Text style={styles.exportButtonText}>
              {exporting
                ? 'Export en cours…'
                : viewingSomeoneElse
                  ? `📤 Exporter le planning de ${selectedScan.employees[viewingIndex] || 'ce/cette collègue'}`
                  : '📤 Exporter en agenda (.ics)'}
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  scanPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  pastMonthsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#999',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  pastMonthsButtonText: {
    fontSize: 16,
  },
  scanPicker: {
    flex: 1,
  },
  scanChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#999',
    marginRight: 8,
  },
  scanChipActive: {
    backgroundColor: '#2f95dc',
    borderColor: '#2f95dc',
  },
  scanChipText: {
    fontWeight: '600',
  },
  scanChipTextActive: {
    color: '#fff',
  },
  viewerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  viewerButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#999',
    alignItems: 'center',
  },
  viewerButtonActive: {
    backgroundColor: '#2f95dc',
    borderColor: '#2f95dc',
  },
  viewerButtonText: {
    fontWeight: '600',
  },
  viewerButtonTextActive: {
    color: '#fff',
  },
  notFoundBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(200,50,50,0.08)',
    marginBottom: 16,
  },
  notFoundText: {
    marginBottom: 8,
  },
  employeeRow: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  employeeRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
  viewModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  viewModeButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#999',
  },
  viewModeButtonActive: {
    backgroundColor: '#2f95dc',
    borderColor: '#2f95dc',
  },
  viewModeText: {
    fontWeight: '600',
  },
  viewModeTextActive: {
    color: '#fff',
  },
  hoursToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  hoursToggleLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
  dayRowHoliday: {
    borderLeftWidth: 3,
    borderLeftColor: '#e08a00',
    paddingLeft: 8,
  },
  dayHolidayTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e08a00',
  },
  dayDate: {
    width: 64,
  },
  dayDateText: {
    fontWeight: '600',
  },
  dayInfo: {
    flex: 1,
  },
  dayCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dayCode: {
    fontWeight: 'bold',
  },
  daySchedule: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
  },
  dayTeammates: {
    fontSize: 13,
    fontWeight: '400',
    opacity: 0.8,
  },
  exportButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#2f95dc',
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyHint: {
    textAlign: 'center',
    opacity: 0.7,
  },
});
