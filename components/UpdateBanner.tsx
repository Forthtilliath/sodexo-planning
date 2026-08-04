import { compareVersions } from '@forthtilliath/expo-release-updates/compareVersions';
import { downloadAndInstallApk } from '@forthtilliath/expo-release-updates/downloadAndInstallApk';
import { fetchLatestRelease, type LatestRelease } from '@forthtilliath/expo-release-updates/githubReleases';
import Constants from 'expo-constants';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';

const REPO = { owner: 'Forthtilliath', repo: 'reactnative-planning' };

/** Vérifie une fois par lancement s'il existe une version plus récente sur GitHub, et propose de l'installer. */
export default function UpdateBanner() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [release, setRelease] = useState<LatestRelease | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const currentVersion = Constants.expoConfig?.version ?? '0.0.0';
    fetchLatestRelease(REPO)
      .then((latest) => {
        if (latest && compareVersions(latest.version, currentVersion) > 0) {
          setRelease(latest);
        }
      })
      .catch(() => {
        // Pas de réseau, ou repo injoignable : ce n'est qu'une notification de confort, on ignore silencieusement.
      });
  }, []);

  async function handleInstall() {
    if (!release || installing) return;
    setInstalling(true);
    setProgress(0);
    try {
      await downloadAndInstallApk({
        apkUrl: release.apkUrl,
        fileName: `sodexo-planning-${release.version}.apk`,
        onProgress: setProgress,
      });
    } catch (err) {
      Alert.alert('Échec de la mise à jour', err instanceof Error ? err.message : "Une erreur inconnue s'est produite.");
      setInstalling(false);
    }
  }

  if (!release || dismissed) return null;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Pressable style={styles.banner} onPress={handleInstall} disabled={installing}>
        {installing ? (
          <>
            <ActivityIndicator size="small" color={colors.onTint} />
            <Text style={styles.text}>Téléchargement… {Math.round(progress * 100)}%</Text>
          </>
        ) : (
          <>
            <Text style={styles.text}>🆕 Version {release.version} disponible — touche pour installer</Text>
            <Pressable
              onPress={() => setDismissed(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Masquer la notification de mise à jour">
              <Text style={styles.dismiss}>×</Text>
            </Pressable>
          </>
        )}
      </Pressable>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      backgroundColor: colors.tint,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    text: {
      flex: 1,
      color: colors.onTint,
      fontWeight: '600',
      fontSize: 13,
    },
    dismiss: {
      color: colors.onTint,
      fontWeight: '700',
      fontSize: 18,
      paddingHorizontal: 4,
    },
  });
}
