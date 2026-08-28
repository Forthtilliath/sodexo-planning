import { BackupSettingsScreen } from '@forthtilliath/react-native-kit/components/settings/BackupSettingsScreen';
import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { pickAndImportBackup, shareBackup } from '@/lib/backup';
import { FULL_BACKUP_SELECTION, getSettings, saveSettings, type BackupSelection } from '@/lib/db';
import {
  BACKUP_REMINDER_INTERVAL_DAYS,
  cancelBackupReminder,
  requestNotificationPermission,
  scheduleBackupReminder,
} from '@/lib/notifications';

const CATEGORIES: { key: keyof BackupSelection; label: string; hint: string }[] = [
  { key: 'employees', label: 'Les salariés', hint: 'Liste des salariés, statuts, catégories et codes habituels.' },
  { key: 'groups', label: 'Les groupes de postes', hint: 'Groupes de postes, couleurs et horaires des codes.' },
  { key: 'plannings', label: 'Les plannings', hint: 'Tous les plannings enregistrés.' },
  { key: 'settings', label: 'Les réglages', hint: 'Thème, nom, rappels et notifications.' },
];

export default function BackupScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [selection, setSelection] = useState<BackupSelection>(FULL_BACKUP_SELECTION);

  const selectedCount = Object.values(selection).filter(Boolean).length;

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const settings = await getSettings();
        setReminderEnabled(settings.backupReminderEnabled === true);
      })();
    }, [])
  );

  function toggleCategory(key: keyof BackupSelection) {
    setSelection((prev) => ({ ...prev, [key]: !prev[key] }));
  }

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

  async function handleExport() {
    if (selectedCount === 0) {
      Alert.alert('Rien à exporter', 'Coche au moins une catégorie à sauvegarder.');
      return;
    }
    await shareBackup(selection);
  }

  async function handleImport() {
    if (selectedCount === 0) {
      throw new Error('Coche au moins une catégorie à restaurer.');
    }
    const result = await pickAndImportBackup(selection);
    if (result) {
      Alert.alert('Importé', `Restauré depuis le fichier : ${result.restored.join(', ')}.`);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.sectionTitle}>À sauvegarder / restaurer</Text>
      <Text style={styles.sectionHint}>
        Ces cases s'appliquent aux deux boutons ci-dessous : l'export ne met dans le fichier que les catégories
        cochées, l'import ne restaure que celles cochées et présentes dans le fichier.
      </Text>

      {CATEGORIES.map((cat) => (
        <View key={cat.key} style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{cat.label}</Text>
            <Text style={styles.rowHint}>{cat.hint}</Text>
          </View>
          <Switch
            value={selection[cat.key]}
            onValueChange={() => toggleCategory(cat.key)}
            accessibilityLabel={cat.label}
          />
        </View>
      ))}

      {selectedCount === 0 && (
        <Text style={styles.warning}>Coche au moins une catégorie.</Text>
      )}

      <View style={styles.separator} />

      <BackupSettingsScreen
        onExport={handleExport}
        onImport={handleImport}
        reminder={{
          enabled: reminderEnabled,
          busy: reminderBusy,
          onToggle: handleToggleReminder,
          intervalDays: BACKUP_REMINDER_INTERVAL_DAYS,
        }}
        labels={{
          hint: "Les données sont stockées uniquement sur cet appareil et sont perdues en cas de réinstallation ou de mise à jour incompatible. Exporte-les régulièrement (mail, Drive, Bluetooth...) pour pouvoir les restaurer.",
          importConfirmMessage:
            "Les catégories cochées ci-dessus seront restaurées depuis le fichier choisi et REMPLACERONT définitivement les données correspondantes de l'app (aucune fusion). Les catégories décochées ou absentes du fichier ne sont pas touchées.",
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    sectionHint: {
      fontSize: 13,
      opacity: 0.7,
      color: colors.text,
      marginBottom: 12,
      lineHeight: 18,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
    },
    rowText: {
      flex: 1,
    },
    rowLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    rowHint: {
      fontSize: 13,
      opacity: 0.7,
      color: colors.text,
    },
    warning: {
      fontSize: 13,
      color: colors.danger,
      marginBottom: 8,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: 12,
    },
  });
}
