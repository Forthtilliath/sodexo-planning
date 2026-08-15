import { UpdateSettingsScreen } from '@forthtilliath/react-native-kit/components/settings/UpdateSettingsScreen';
import Constants from 'expo-constants';
import { ScrollView } from 'react-native';

import { compareVersions, downloadAndInstallApk, fetchLatestRelease, fetchReleaseHistory } from '@/lib/appUpdate';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function UpdateScreen() {
  const colors = useThemeColors();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <UpdateSettingsScreen
        currentVersion={Constants.expoConfig?.version ?? '?'}
        checkForUpdate={fetchLatestRelease}
        compareVersions={compareVersions}
        downloadAndInstallApk={downloadAndInstallApk}
        fetchReleaseHistory={fetchReleaseHistory}
        styles={{
          infoBox: { backgroundColor: colors.card, borderColor: colors.border },
          infoLabel: { color: colors.text },
          infoValue: { color: colors.text },
          helpText: { color: colors.text },
          errorText: { color: colors.danger },
          button: { backgroundColor: colors.tint },
          buttonText: { color: colors.onTint },
          activityIndicatorColor: colors.onTint,
          updateAvailableBox: { backgroundColor: colors.card, borderColor: colors.border },
          updateAvailableTitle: { color: colors.text },
          changelogTitle: { color: colors.text },
          changelogEntry: { backgroundColor: colors.card, borderColor: colors.border },
          changelogVersion: { color: colors.text },
          changelogDate: { color: colors.text },
        }}
      />
    </ScrollView>
  );
}
