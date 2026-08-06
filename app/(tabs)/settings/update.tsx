import { ChangelogNotes } from '@forthtilliath/react-native-kit/components/update/ChangelogNotes';
import Constants from 'expo-constants';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  compareVersions,
  downloadAndInstallApk,
  fetchLatestRelease,
  fetchReleaseHistory,
  type ReleaseHistoryEntry,
} from '@/lib/appUpdate';
import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';

type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'up-to-date' }
  | { status: 'available'; version: string; notes: string; apkUrl: string }
  | { status: 'downloading'; progress: number }
  | { status: 'error'; message: string };

export default function UpdateScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const notesStyles = useMemo(
    () => ({
      heading: styles.notesHeading,
      itemRow: styles.notesItemRow,
      bullet: styles.notesBullet,
      itemText: styles.notesItemText,
      text: styles.helpText,
      bold: styles.notesBold,
    }),
    [styles]
  );
  const currentVersion = Constants.expoConfig?.version ?? '?';
  const [updateState, setUpdateState] = useState<UpdateState>({ status: 'idle' });
  const [releaseHistory, setReleaseHistory] = useState<ReleaseHistoryEntry[] | null>(null);

  useEffect(() => {
    fetchReleaseHistory()
      .then(setReleaseHistory)
      .catch(() => setReleaseHistory([]));
  }, []);

  const handleCheckForUpdate = useCallback(async () => {
    setUpdateState({ status: 'checking' });
    try {
      const release = await fetchLatestRelease();
      if (!release || compareVersions(release.version, currentVersion) <= 0) {
        setUpdateState({ status: 'up-to-date' });
        return;
      }
      setUpdateState({ status: 'available', version: release.version, notes: release.notes, apkUrl: release.apkUrl });
    } catch {
      setUpdateState({ status: 'error', message: 'Impossible de vérifier les mises à jour.' });
    }
  }, [currentVersion]);

  // Vérifie automatiquement à l'ouverture de l'écran (au lieu d'attendre un
  // tap sur "Rechercher une mise à jour") : le bandeau de _layout.tsx a déjà
  // pu prévenir qu'une mise à jour existe, inutile de refaire cliquer.
  useEffect(() => {
    handleCheckForUpdate();
  }, [handleCheckForUpdate]);

  async function handleInstallUpdate(apkUrl: string) {
    setUpdateState({ status: 'downloading', progress: 0 });
    try {
      await downloadAndInstallApk(apkUrl, (progress) => setUpdateState({ status: 'downloading', progress }));
      setUpdateState({ status: 'idle' });
    } catch {
      setUpdateState({ status: 'error', message: 'Le téléchargement a échoué.' });
    }
  }

  const isBusy = updateState.status === 'checking' || updateState.status === 'downloading';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>Version installée</Text>
        <Text style={styles.infoValue}>{currentVersion}</Text>
      </View>

      {updateState.status !== 'available' && updateState.status !== 'downloading' && (
        <Pressable
          style={[styles.button, isBusy && styles.buttonDisabled]}
          onPress={handleCheckForUpdate}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel="Rechercher une mise à jour">
          {updateState.status === 'checking' ? (
            <ActivityIndicator color={colors.onTint} />
          ) : (
            <Text style={styles.buttonText}>Rechercher une mise à jour</Text>
          )}
        </Pressable>
      )}

      {updateState.status === 'up-to-date' && <Text style={styles.helpText}>Tu as déjà la dernière version.</Text>}

      {updateState.status === 'error' && <Text style={styles.errorText}>{updateState.message}</Text>}

      {updateState.status === 'available' && (
        <View style={styles.updateAvailableBox}>
          <Text style={styles.updateAvailableTitle}>Version {updateState.version} disponible</Text>
          {updateState.notes ? <ChangelogNotes notes={updateState.notes} styles={notesStyles} /> : null}
          <Pressable
            style={styles.button}
            onPress={() => handleInstallUpdate(updateState.apkUrl)}
            accessibilityRole="button"
            accessibilityLabel={`Télécharger et installer la version ${updateState.version}`}>
            <Text style={styles.buttonText}>Télécharger et installer</Text>
          </Pressable>
        </View>
      )}

      {updateState.status === 'downloading' && (
        <View style={styles.updateAvailableBox}>
          <Text style={styles.helpText}>Téléchargement… {Math.round(updateState.progress * 100)}%</Text>
          <Text style={styles.helpText}>Android va ensuite te demander confirmation pour installer la mise à jour.</Text>
        </View>
      )}

      {releaseHistory && releaseHistory.length > 0 && (
        <View style={styles.changelog}>
          <Text style={styles.changelogTitle}>Historique des versions</Text>
          {releaseHistory.map((release) => (
            <View key={release.version} style={styles.changelogEntry}>
              <View style={styles.changelogEntryHeader}>
                <Text style={styles.changelogVersion}>v{release.version}</Text>
                {release.publishedAt ? (
                  <Text style={styles.changelogDate}>{new Date(release.publishedAt).toLocaleDateString('fr-FR')}</Text>
                ) : null}
              </View>
              {release.notes ? <ChangelogNotes notes={release.notes} styles={notesStyles} /> : null}
            </View>
          ))}
        </View>
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
      gap: 4,
    },
    infoBox: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
    },
    infoLabel: {
      fontSize: 13,
      fontWeight: '600',
      opacity: 0.7,
      color: colors.text,
    },
    infoValue: {
      fontSize: 18,
      fontWeight: '700',
      marginTop: 2,
      color: colors.text,
    },
    helpText: {
      fontSize: 12,
      opacity: 0.7,
      marginTop: 8,
      color: colors.text,
    },
    errorText: {
      fontSize: 12,
      marginTop: 8,
      color: colors.danger,
    },
    button: {
      backgroundColor: colors.tint,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: colors.onTint,
      fontSize: 16,
      fontWeight: '700',
    },
    updateAvailableBox: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 14,
      marginTop: 12,
      gap: 4,
    },
    updateAvailableTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    changelog: {
      marginTop: 28,
    },
    changelogTitle: {
      fontSize: 15,
      fontWeight: '700',
      marginBottom: 8,
      color: colors.text,
    },
    changelogEntry: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
    },
    changelogEntryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    changelogVersion: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    changelogDate: {
      fontSize: 12,
      opacity: 0.6,
      color: colors.text,
    },
    notesHeading: {
      fontSize: 13,
      fontWeight: '700',
      marginTop: 8,
      color: colors.text,
    },
    notesItemRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 4,
    },
    notesBullet: {
      fontSize: 13,
      opacity: 0.7,
      color: colors.text,
    },
    notesItemText: {
      flex: 1,
      fontSize: 13,
      opacity: 0.85,
      color: colors.text,
    },
    notesBold: {
      fontWeight: '700',
      color: colors.text,
    },
  });
}
