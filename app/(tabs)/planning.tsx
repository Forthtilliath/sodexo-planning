import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { captureRef } from 'react-native-view-shot';

import DayListRow from '@/components/DayListRow';
import MonthCalendarView from '@/components/MonthCalendarView';
import PickerListSheet from '@/components/PickerListSheet';
import ScanMonthSelector from '@/components/ScanMonthSelector';
import type { ThemeColors } from '@/constants/Colors';
import { useMyName } from '@/hooks/useMyName';
import { useThemeColors } from '@/hooks/useThemeColors';
import { isToday, monthYearLabel } from '@/lib/dates';
import { getCodeSchedules, getEmployeeRoster, getScans, getTeamGroups } from '@/lib/db';
import { buildIcsFilename, shareIcs } from '@/lib/exportIcs';
import { savePlanningImage, sharePlanningImage } from '@/lib/exportImage';
import { buildIcs } from '@/lib/ics';
import { computeMonthPlanning, findMyRowIndex, normalizeName, type DayPlanning } from '@/lib/teams';
import type { CodeSchedule, RosterEntry, ScanRecord, TeamGroup } from '@/types';

type ViewMode = 'list' | 'calendar';

export default function PlanningScreen() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const { myName } = useMyName();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [schedules, setSchedules] = useState<CodeSchedule[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [manualRowIndex, setManualRowIndex] = useState<number | null>(null);
  const [viewingName, setViewingName] = useState<string | null>(null);
  const [colleaguePickerOpen, setColleaguePickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showHours, setShowHours] = useState(false);
  const captureAreaRef = useRef<View>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [loadedScans, loadedGroups, loadedSchedules, loadedRoster] = await Promise.all([
          getScans(),
          getTeamGroups(),
          getCodeSchedules(),
          getEmployeeRoster(),
        ]);
        setScans(loadedScans);
        setGroups(loadedGroups);
        setSchedules(loadedSchedules);
        setRoster(loadedRoster);
        setSelectedScanId((prev) => {
          if (prev) return prev;
          const now = new Date();
          const currentYear = now.getFullYear();
          const currentMonth = now.getMonth() + 1;
          const currentMonthScan = loadedScans.find((s) => s.year === currentYear && s.month === currentMonth);
          return currentMonthScan?.id ?? loadedScans[0]?.id ?? null;
        });
        setManualRowIndex(null);
      })();
    }, [])
  );

  const selectedScan = useMemo(() => scans.find((s) => s.id === selectedScanId) ?? null, [scans, selectedScanId]);

  // Tri chronologique (du plus ancien au plus récent) pour le sélecteur de
  // plannings — l'ordre de stockage (par date de scan) ne correspond pas
  // forcément à l'ordre des mois.
  const sortedScans = useMemo(() => {
    return [...scans].sort((a, b) => a.year - b.year || a.month - b.month);
  }, [scans]);

  const myRowIndex = useMemo(() => {
    if (!selectedScan) return -1;
    if (manualRowIndex !== null) return manualRowIndex;
    return findMyRowIndex(selectedScan, myName);
  }, [selectedScan, manualRowIndex, myName]);

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

  // Même regroupement que Réglages > Salariés / l'éditeur de saisie : les
  // groupes de postes assignables dans l'ordre, "Sans catégorie" en dernier,
  // catégories vides masquées. L'ordre des salariés au sein d'une catégorie
  // suit celui de la liste `employees` (pas de tri alphabétique ici).
  const colleagueSections = useMemo(() => {
    const employees = selectedScan?.employees ?? [];
    const groupIdByName = new Map(roster.map((r) => [normalizeName(r.name), r.groupId]));
    const assignableGroups = groups.filter((g) => !g.weekendVariant);
    const defs = [
      ...assignableGroups.map((g) => ({ key: g.id, label: g.label || 'Groupe sans nom', color: g.color, groupId: g.id as string | undefined })),
      { key: 'none', label: 'Sans catégorie', color: undefined, groupId: undefined as string | undefined },
    ];
    return defs
      .map((def) => ({
        key: def.key,
        label: def.label,
        color: def.color,
        items: employees
          .map((name, index) => ({ name, index }))
          .filter(({ name }) => {
            const groupId = groupIdByName.get(normalizeName(name));
            return def.groupId ? groupId === def.groupId : !assignableGroups.some((g) => g.id === groupId);
          })
          .map(({ name, index }) => ({
            key: String(index),
            label: `${name || `Ligne ${index + 1}`}${index === myRowIndex ? ' (moi)' : ''}`,
            highlight: index === myRowIndex,
          })),
      }))
      .filter((section) => section.items.length > 0);
  }, [selectedScan, roster, groups, myRowIndex]);

  const planning: DayPlanning[] = useMemo(() => {
    if (!selectedScan || displayRowIndex < 0) return [];
    return computeMonthPlanning(selectedScan, displayRowIndex, groups, schedules);
  }, [selectedScan, displayRowIndex, groups, schedules]);

  function handleEdit() {
    if (!selectedScan || displayRowIndex < 0) return;
    router.push({ pathname: '/', params: { scanId: selectedScan.id, editRow: String(displayRowIndex) } });
  }

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

  async function handleImage() {
    if (!selectedScan || displayRowIndex < 0 || !captureAreaRef.current) return;
    setImageBusy(true);
    try {
      const uri = await captureRef(captureAreaRef, { format: 'png', quality: 1, result: 'tmpfile' });
      const showErr = (err: unknown) =>
        Alert.alert('Action impossible', err instanceof Error ? err.message : "Une erreur s'est produite.");
      Alert.alert('Planning en image', 'Que veux-tu faire ?', [
        { text: 'Enregistrer', onPress: () => savePlanningImage(uri).catch(showErr) },
        { text: 'Partager', onPress: () => sharePlanningImage(uri).catch(showErr) },
        { text: 'Annuler', style: 'cancel' },
      ]);
    } catch (err) {
      Alert.alert('Image impossible', err instanceof Error ? err.message : "Une erreur s'est produite.");
    } finally {
      setImageBusy(false);
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
      <ScanMonthSelector scans={sortedScans} selectedScanId={selectedScanId} onSelect={setSelectedScanId} />

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

      <PickerListSheet
        visible={colleaguePickerOpen}
        onClose={() => setColleaguePickerOpen(false)}
        sections={colleagueSections}
        onSelect={(key) => setViewingName(selectedScan?.employees[Number(key)] ?? null)}
      />

      {selectedScan && !viewingSomeoneElse && myRowIndex < 0 && (
        <View style={styles.notFoundBox}>
          <Text style={styles.notFoundText}>
            Aucune ligne "{myName}" dans ce planning. Choisis la tienne :
          </Text>
          {selectedScan.employees.map((name, index) => (
            <Pressable
              key={index}
              style={[styles.employeeRow, index > 0 && styles.employeeRowDivider]}
              onPress={() => setManualRowIndex(index)}>
              <Text style={styles.employeeRowText}>{name || `Ligne ${index + 1}`}</Text>
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

          <Pressable style={styles.imageButton} disabled={imageBusy} onPress={handleImage}>
            <Text style={styles.imageButtonText}>
              {imageBusy ? 'Génération de l’image…' : '🖼️ Planning en image'}
            </Text>
          </Pressable>

          <Pressable style={styles.exportButton} disabled={exporting} onPress={handleExport}>
            <Text style={styles.exportButtonText}>
              {exporting
                ? 'Export en cours…'
                : viewingSomeoneElse
                  ? `📤 Exporter le planning de ${selectedScan.employees[viewingIndex] || 'ce/cette collègue'}`
                  : '📤 Exporter en agenda (.ics)'}
            </Text>
          </Pressable>
          <Text style={styles.exportHint}>
            Un ré-export met à jour les événements déjà importés (même jour = même événement). Si ton appli
            calendrier crée quand même des doublons, supprime l'ancien import avant de réimporter.
          </Text>
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
      borderColor: colors.border,
      alignItems: 'center',
    },
    viewerButtonActive: {
      backgroundColor: colors.tint,
      borderColor: colors.tint,
    },
    viewerButtonText: {
      fontWeight: '600',
      color: colors.text,
    },
    viewerButtonTextActive: {
      color: colors.onTint,
    },
    notFoundBox: {
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.dangerSoft,
      marginBottom: 16,
    },
    notFoundText: {
      marginBottom: 8,
      color: colors.text,
    },
    employeeRow: {
      paddingVertical: 12,
      paddingHorizontal: 20,
    },
    employeeRowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: colors.divider,
    },
    employeeRowText: {
      color: colors.text,
    },
    viewModeRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    viewModeButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    viewModeButtonActive: {
      backgroundColor: colors.tint,
      borderColor: colors.tint,
    },
    viewModeText: {
      fontWeight: '600',
      color: colors.text,
    },
    viewModeTextActive: {
      color: colors.onTint,
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
    imageButton: {
      marginTop: 16,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.tint,
      alignItems: 'center',
    },
    imageButtonText: {
      color: colors.tint,
      fontWeight: '700',
    },
    exportButton: {
      marginTop: 12,
      paddingVertical: 14,
      borderRadius: 8,
      backgroundColor: colors.tint,
      alignItems: 'center',
    },
    exportButtonText: {
      color: colors.onTint,
      fontWeight: '700',
    },
    exportHint: {
      fontSize: 11,
      opacity: 0.6,
      marginTop: 8,
      textAlign: 'center',
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
