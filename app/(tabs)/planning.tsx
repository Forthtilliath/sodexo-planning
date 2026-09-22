import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useFocusEffect, useNavigation } from 'expo-router';

import DayListRow from '@/components/DayListRow';
import MonthCalendarView from '@/components/MonthCalendarView';
import MyRowPicker from '@/components/MyRowPicker';
import PlanningExportActions from '@/components/PlanningExportActions';
import PlanningViewerSwitch from '@/components/PlanningViewerSwitch';
import ScanMonthSelector from '@/components/ScanMonthSelector';
import SegmentedToggle from '@/components/SegmentedToggle';
import type { ThemeColors } from '@/constants/Colors';
import { useDbData } from '@/hooks/useDbData';
import { useMyName } from '@/hooks/useMyName';
import { useThemeColors } from '@/hooks/useThemeColors';
import { isToday, monthYearLabel } from '@/lib/dates';
import { getCodeSchedules, getEmployeeRoster, getScans, getTeamGroups } from '@/lib/db';
import { computeMonthPlanning, type DayPlanning, findMyRowIndex } from '@/lib/teams';
import type { CodeSchedule, RosterEntry, ScanRecord, TeamGroup } from '@/types';

type ViewMode = 'list' | 'calendar';

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: 'calendar', label: '📅 Calendrier' },
  { value: 'list', label: '📋 Liste' },
];

const EMPTY_SCANS: ScanRecord[] = [];
const EMPTY_GROUPS: TeamGroup[] = [];
const EMPTY_SCHEDULES: CodeSchedule[] = [];
const EMPTY_ROSTER: RosterEntry[] = [];

export default function PlanningScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const { myName } = useMyName();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // Données lues en direct : toute modif faite ailleurs se répercute ici.
  const scans = useDbData(getScans, EMPTY_SCANS);
  const groups = useDbData(getTeamGroups, EMPTY_GROUPS);
  const schedules = useDbData(getCodeSchedules, EMPTY_SCHEDULES);
  const roster = useDbData(getEmployeeRoster, EMPTY_ROSTER);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [manualRowIndex, setManualRowIndex] = useState<number | null>(null);
  const [viewingName, setViewingName] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [showHours, setShowHours] = useState(false);
  const captureAreaRef = useRef<View>(null);

  // Sélection par défaut : le mois courant s'il a un planning, sinon le premier.
  // Recalculée si le planning sélectionné disparaît (suppression ailleurs) —
  // `scans` vient de useDbData (synchronisation externe), pas d'un state local.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, @eslint-react/set-state-in-effect
    setSelectedScanId((prev) => {
      if (prev && scans.some((s) => s.id === prev)) return prev;
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentMonthScan = scans.find((s) => s.year === currentYear && s.month === currentMonth);
      return currentMonthScan?.id ?? scans[0]?.id ?? null;
    });
  }, [scans]);

  // Au retour sur l'onglet, on repart sur "ma" ligne, pas sur le choix manuel précédent.
  useFocusEffect(
    useCallback(() => {
      setManualRowIndex(null);
    }, [])
  );

  const selectedScan = useMemo(() => scans.find((s) => s.id === selectedScanId) ?? null, [scans, selectedScanId]);

  // Tri chronologique pour le sélecteur : l'ordre de stockage (par date de
  // scan) ne suit pas forcément l'ordre des mois.
  const sortedScans = useMemo(() => {
    return [...scans].sort((a, b) => a.year - b.year || a.month - b.month);
  }, [scans]);

  const myRowIndex = useMemo(() => {
    if (!selectedScan) return -1;
    if (manualRowIndex !== null) return manualRowIndex;
    return findMyRowIndex(selectedScan, myName);
  }, [selectedScan, manualRowIndex, myName]);

  // On conserve le nom du collègue consulté (pas son index) pour rester sur la
  // même personne quand on change de planning.
  const viewingIndex = useMemo(() => {
    if (!selectedScan || viewingName === null) return -1;
    return findMyRowIndex(selectedScan, viewingName);
  }, [selectedScan, viewingName]);

  const viewingSomeoneElse = viewingIndex >= 0 && viewingIndex !== myRowIndex;
  const displayRowIndex = viewingSomeoneElse ? viewingIndex : myRowIndex;

  // Titre natif "Planning de X" quand on consulte un collègue.
  useEffect(() => {
    navigation.setOptions({
      title: viewingSomeoneElse ? `Planning de ${selectedScan?.employees[viewingIndex] || '—'}` : 'Mon planning',
    });
  }, [navigation, viewingSomeoneElse, selectedScan, viewingIndex]);

  const planning: DayPlanning[] = useMemo(() => {
    if (!selectedScan || displayRowIndex < 0) return [];
    return computeMonthPlanning(selectedScan, displayRowIndex, groups, schedules);
  }, [selectedScan, displayRowIndex, groups, schedules]);

  function handleEdit() {
    if (!selectedScan || displayRowIndex < 0) return;
    router.push({ pathname: '/', params: { scanId: selectedScan.id, editRow: String(displayRowIndex) } });
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
      <ScanMonthSelector scans={sortedScans} selectedScanId={selectedScanId} onSelect={setSelectedScanId} />

      {selectedScan && (
        <PlanningViewerSwitch
          scan={selectedScan}
          roster={roster}
          groups={groups}
          myRowIndex={myRowIndex}
          viewingIndex={viewingIndex}
          viewingSomeoneElse={viewingSomeoneElse}
          onViewName={setViewingName}
        />
      )}

      {selectedScan && !viewingSomeoneElse && myRowIndex < 0 && (
        <MyRowPicker myName={myName} employees={selectedScan.employees} onPick={setManualRowIndex} />
      )}

      {selectedScan && displayRowIndex >= 0 && (
        <>
          <SegmentedToggle options={VIEW_MODES} value={viewMode} onChange={setViewMode} />

          <Pressable style={styles.editButton} onPress={handleEdit}>
            <Text style={styles.editButtonText}>
              {viewingSomeoneElse
                ? `✏️ Modifier le planning de ${selectedScan.employees[viewingIndex] || 'ce/cette collègue'}`
                : '✏️ Modifier ce planning'}
            </Text>
          </Pressable>

          <Pressable style={styles.hoursToggleRow} onPress={() => setShowHours((v) => !v)}>
            <Text style={styles.hoursToggleLabel}>🕐 Afficher les horaires</Text>
            <Switch value={showHours} onValueChange={setShowHours} />
          </Pressable>

          <View ref={captureAreaRef} collapsable={false} style={styles.captureArea}>
            <Text style={styles.captureTitle}>
              {viewingSomeoneElse
                ? `Planning de ${selectedScan.employees[viewingIndex] || 'ce/cette collègue'}`
                : `Planning de ${selectedScan.employees[displayRowIndex] || 'moi'}`}
            </Text>
            <Text style={styles.captureSubtitle}>
              {monthYearLabel(selectedScan.year, selectedScan.month)}
            </Text>

            {viewMode === 'list' ? (
              planning.map((day) => (
                <DayListRow
                  key={day.date}
                  day={day}
                  isHoliday={selectedScan?.holidays?.includes(day.date) ?? false}
                  isCurrentDay={isToday(day.date)}
                  showHours={showHours}
                />
              ))
            ) : (
              <MonthCalendarView
                planning={planning}
                holidays={selectedScan.holidays ?? []}
                showHours={showHours}
                scan={selectedScan}
                groups={groups}
              />
            )}
          </View>

          <PlanningExportActions
            scan={selectedScan}
            groups={groups}
            schedules={schedules}
            rowIndex={displayRowIndex}
            isColleague={viewingSomeoneElse}
            captureAreaRef={captureAreaRef}
          />
        </>
      )}
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
      paddingBottom: 48,
    },
    editButton: {
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.tint,
      alignItems: 'center',
      marginBottom: 12,
    },
    editButtonText: {
      color: colors.tint,
      fontWeight: '700',
      fontSize: 13,
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
      color: colors.text,
    },
    captureArea: {
      backgroundColor: colors.background,
      paddingTop: 4,
      paddingBottom: 8,
    },
    captureTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    captureSubtitle: {
      fontSize: 13,
      opacity: 0.7,
      marginBottom: 12,
      color: colors.text,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: colors.background,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 8,
      color: colors.text,
    },
    emptyHint: {
      textAlign: 'center',
      opacity: 0.7,
      color: colors.text,
    },
  });
}
