import { BackupSettingsScreen } from '@forthtilliath/react-native-kit/components/settings/BackupSettingsScreen';
import { useCallback, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { useThemeColors } from '@/hooks/useThemeColors';
import { pickAndImportBackup, shareBackup } from '@/lib/backup';
import { getSettings, saveSettings } from '@/lib/db';
import {
  BACKUP_REMINDER_INTERVAL_DAYS,
  cancelBackupReminder,
  requestNotificationPermission,
  scheduleBackupReminder,
} from '@/lib/notifications';

export default function BackupScreen() {
  const colors = useThemeColors();
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const settings = await getSettings();
        setReminderEnabled(settings.backupReminderEnabled === true);
      })();
    }, [])
  );

  async function handleToggleReminder(value: boolean) {
    if (reminderBusy) return;
    setReminderBusy(true);
    try {
      if (value) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          Alert.alert(
            'Notifications refusées',
            "Autorise les notifications pour cette app dans les réglages Android si tu changes d'avis."
          );
          return;
        }
        await scheduleBackupReminder();
      } else {
        await cancelBackupReminder();
      }
      const settings = await getSettings();
      await saveSettings({ ...settings, backupReminderEnabled: value });
      setReminderEnabled(value);
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : "Une erreur inconnue s'est produite.");
    } finally {
      setReminderBusy(false);
    }
  }

  async function handleImport() {
    const imported = await pickAndImportBackup();
    if (imported) {
      Alert.alert('Importé', 'Tes données ont été restaurées.');
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16 }}>
      <BackupSettingsScreen
        onExport={shareBackup}
        onImport={handleImport}
        reminder={{
          enabled: reminderEnabled,
          busy: reminderBusy,
          onToggle: handleToggleReminder,
          intervalDays: BACKUP_REMINDER_INTERVAL_DAYS,
        }}
        labels={{
          hint: "Les données sont stockées uniquement sur cet appareil et sont perdues en cas de réinstallation ou de mise à jour incompatible. Exporte-les régulièrement (mail, Drive, Bluetooth...) pour pouvoir les restaurer.",
          importConfirmMessage: 'Toutes les données actuelles (salariés, groupes, plannings) seront remplacées par celles du fichier choisi.',
        }}
        styles={{
          hint: { color: colors.text },
          button: { borderColor: colors.tint },
          buttonText: { color: colors.tint },
          reminderLabel: { color: colors.text },
          reminderHint: { color: colors.text },
        }}
      />
    </ScrollView>
  );
}
