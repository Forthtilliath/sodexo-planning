import { UpdateAvailableBanner } from '@forthtilliath/react-native-kit/components/update/UpdateAvailableBanner';
import { useUpdateCheck } from '@forthtilliath/react-native-kit/hooks/useUpdateCheck';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { compareVersions, fetchLatestRelease } from '@/lib/appUpdate';
import { dismissUpdateVersion, getSettings, recordUpdateCheck } from '@/lib/db';
import type { Settings } from '@/types';

/** Vérifie une fois par lancement s'il existe une version plus récente sur GitHub, et propose de l'installer. */
export default function UpdateBanner() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  // Hook de vérification monté seulement après chargement des réglages :
  // getLastCheck n'est lu qu'au montage.
  if (!settings) return null;
  return <UpdateNotifier settings={settings} />;
}

function UpdateNotifier({ settings }: { settings: Settings }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const update = useUpdateCheck({
    currentVersion: Constants.expoConfig?.version ?? '0.0.0',
    checkForUpdate: fetchLatestRelease,
    compareVersions,
    getLastCheck: () => ({
      lastCheckedAt: settings.lastUpdateCheckAt ?? null,
      dismissedVersion: settings.dismissedUpdateVersion ?? null,
    }),
    onChecked: (lastCheckedAt) => {
      recordUpdateCheck(lastCheckedAt).catch(() => {});
    },
  });

  if (update.status !== 'available') return null;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <UpdateAvailableBanner
          version={update.release.version}
          notes={update.release.notes}
          styles={{
            container: styles.card,
            title: styles.title,
            actionButton: styles.actionButton,
            actionButtonText: styles.actionButtonText,
            dismissButton: styles.dismissButton,
            dismissButtonText: styles.dismissButtonText,
          }}
          onPress={() => {
            router.push('/settings/update');
            // Ferme le bandeau sans mémoriser la version en base : s'il revient
            // sans installer, le bandeau peut réapparaître au prochain lancement
            // (voulu, distinct d'un vrai "Fermer" via onDismiss).
            update.dismiss();
          }}
          onDismiss={() => {
            dismissUpdateVersion(update.release.version).catch(() => {});
            update.dismiss();
          }}
        />
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    },
    container: {
      paddingHorizontal: 12,
      paddingTop: 8,
    },
    card: {
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
    title: {
      color: colors.text,
    },
    actionButton: {
      backgroundColor: colors.tint,
    },
    actionButtonText: {
      color: colors.onTint,
    },
    dismissButton: {},
    dismissButtonText: {
      color: colors.text,
      opacity: 0.6,
    },
  });
}
