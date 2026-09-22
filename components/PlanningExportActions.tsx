import { type RefObject, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { syncPlanningToCalendar } from '@/lib/calendarSync';
import { buildIcsFilename, shareIcs } from '@/lib/exportIcs';
import { savePlanningImage, sharePlanningImage } from '@/lib/exportImage';
import { buildIcs } from '@/lib/ics';
import type { CodeSchedule, ScanRecord, TeamGroup } from '@/types';

type Props = {
  scan: ScanRecord;
  groups: TeamGroup[];
  schedules: CodeSchedule[];
  rowIndex: number;
  // Planning d'un/une collègue : export .ics seulement, la synchro directe
  // n'écrit que son propre planning dans l'agenda du téléphone.
  isColleague: boolean;
  captureAreaRef: RefObject<View | null>;
};

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Une erreur s'est produite.";
}

/** Boutons "Planning en image", "Synchroniser avec mon agenda" et "Exporter en .ics". */
export default function PlanningExportActions({ scan, groups, schedules, rowIndex, isColleague, captureAreaRef }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [imageBusy, setImageBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const personName = scan.employees[rowIndex] || 'ce/cette collègue';
  // Calendrier dédié créé sur un compte local : pris en charge sur Android seulement.
  const showSync = Platform.OS === 'android' && !isColleague;

  async function handleExportIcs() {
    setExporting(true);
    try {
      const ics = buildIcs(scan, groups, rowIndex, schedules);
      await shareIcs(buildIcsFilename(scan.year, scan.month, scan.employees[rowIndex]), ics);
    } catch (err) {
      Alert.alert('Export impossible', errorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const result = await syncPlanningToCalendar(scan, groups, rowIndex, schedules);
      if (result.status === 'denied') {
        Alert.alert(
          'Accès à l’agenda refusé',
          'Sans cette autorisation, tu peux exporter un fichier .ics à importer dans ton agenda. ' +
            'Tu peux aussi autoriser l’accès plus tard dans les réglages Android de l’appli.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Exporter en .ics', onPress: () => void handleExportIcs() },
          ]
        );
        return;
      }
      Alert.alert(
        'Agenda mis à jour',
        result.count === 0
          ? 'Aucun jour travaillé ce mois-ci : le mois est vide dans le calendrier « Sodexo Planning ».'
          : `${result.count} jour${result.count > 1 ? 's' : ''} dans le calendrier « Sodexo Planning » de ton téléphone.`
      );
    } catch (err) {
      Alert.alert('Synchronisation impossible', errorMessage(err));
    } finally {
      setSyncing(false);
    }
  }

  async function handleImage() {
    if (!captureAreaRef.current) return;
    setImageBusy(true);
    try {
      const uri = await captureRef(captureAreaRef, { format: 'png', quality: 1, result: 'tmpfile' });
      const showErr = (err: unknown) => Alert.alert('Action impossible', errorMessage(err));
      Alert.alert('Planning en image', 'Que veux-tu faire ?', [
        { text: 'Enregistrer', onPress: () => savePlanningImage(uri).catch(showErr) },
        { text: 'Partager', onPress: () => sharePlanningImage(uri).catch(showErr) },
        { text: 'Annuler', style: 'cancel' },
      ]);
    } catch (err) {
      Alert.alert('Image impossible', errorMessage(err));
    } finally {
      setImageBusy(false);
    }
  }

  return (
    <>
      <Pressable style={styles.outlineButton} disabled={imageBusy} onPress={handleImage}>
        <Text style={styles.outlineButtonText}>{imageBusy ? 'Génération de l’image…' : '🖼️ Planning en image'}</Text>
      </Pressable>

      {showSync && (
        <>
          <Pressable style={styles.primaryButton} disabled={syncing} onPress={handleSync}>
            <Text style={styles.primaryButtonText}>{syncing ? 'Synchronisation…' : '📅 Synchroniser avec mon agenda'}</Text>
          </Pressable>
          <Text style={styles.hint}>
            Écrit ton planning dans un calendrier « Sodexo Planning » du téléphone. Une nouvelle synchro remplace
            l’ancienne pour ce mois, sans doublon.
          </Text>
        </>
      )}

      <Pressable
        style={showSync ? styles.outlineButton : styles.primaryButton}
        disabled={exporting}
        onPress={handleExportIcs}>
        <Text style={showSync ? styles.outlineButtonText : styles.primaryButtonText}>
          {exporting
            ? 'Export en cours…'
            : isColleague
              ? `📤 Exporter le planning de ${personName} (.ics)`
              : '📤 Exporter en fichier agenda (.ics)'}
        </Text>
      </Pressable>
      <Text style={styles.hint}>
        Fichier à partager ou importer. Un ré-export, même après un nouveau scan, met à jour les jours déjà importés
        si l’appli agenda le permet ; sinon, supprime l’ancien import avant de réimporter.
      </Text>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    outlineButton: {
      marginTop: 12,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.tint,
      alignItems: 'center',
    },
    outlineButtonText: {
      color: colors.tint,
      fontWeight: '700',
    },
    primaryButton: {
      marginTop: 12,
      paddingVertical: 14,
      borderRadius: 8,
      backgroundColor: colors.tint,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: colors.onTint,
      fontWeight: '700',
    },
    hint: {
      fontSize: 11,
      opacity: 0.6,
      marginTop: 8,
      textAlign: 'center',
      color: colors.text,
    },
  });
}
