import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getSettings, saveSettings } from '@/lib/db';
import {
  DEFAULT_REMINDER_HOUR,
  cancelWorkReminders,
  requestNotificationPermission,
  rescheduleWorkReminders,
} from '@/lib/notifications';

const HOUR_OPTIONS = Array.from({ length: 8 }, (_, i) => 16 + i); // 16h à 23h

export default function NotificationsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [enabled, setEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(DEFAULT_REMINDER_HOUR);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hourPickerOpen, setHourPickerOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const settings = await getSettings();
        setEnabled(settings.remindersEnabled === true);
        setReminderHour(settings.reminderHour ?? DEFAULT_REMINDER_HOUR);
        setLoaded(true);
      })();
    }, [])
  );

  async function handleToggle(value: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      if (value) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          Alert.alert(
            'Notifications refusées',
            "Autorise les notifications pour cette app dans les réglages Android si tu changes d'avis."
          );
          setBusy(false);
          return;
        }
        await rescheduleWorkReminders();
      } else {
        await cancelWorkReminders();
      }
      const settings = await getSettings();
      await saveSettings({ ...settings, remindersEnabled: value });
      setEnabled(value);
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : "Une erreur inconnue s'est produite.");
    } finally {
      setBusy(false);
    }
  }

  async function handleChangeHour(hour: number) {
    setHourPickerOpen(false);
    if (hour === reminderHour) return;
    setBusy(true);
    try {
      const settings = await getSettings();
      await saveSettings({ ...settings, reminderHour: hour });
      setReminderHour(hour);
      if (enabled) {
        await rescheduleWorkReminders();
      }
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : "Une erreur inconnue s'est produite.");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.row}>
        <View style={styles.textColumn}>
          <Text style={styles.label}>Rappel la veille</Text>
          <Text style={styles.hint}>
            Une notification la veille de chaque jour où tu as un poste renseigné dans un planning.
          </Text>
        </View>
        {busy ? <ActivityIndicator /> : <Switch value={enabled} onValueChange={handleToggle} />}
      </View>

      <View style={[styles.row, !enabled && styles.rowDisabled]}>
        <Text style={styles.label}>Heure du rappel</Text>
        <Pressable
          style={styles.hourButton}
          disabled={!enabled || busy}
          onPress={() => setHourPickerOpen(true)}>
          <Text style={styles.hourButtonText}>{reminderHour}h</Text>
        </Pressable>
      </View>

      <Text style={styles.hint}>
        Le rappel se met à jour à chaque enregistrement d'un planning. Si tu modifies un planning déjà passé
        l'heure du rappel, désactive puis réactive pour forcer une mise à jour.
      </Text>

      <Modal
        visible={hourPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setHourPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setHourPickerOpen(false)}>
          <View style={styles.modalCard}>
            <ScrollView>
              {HOUR_OPTIONS.map((hour) => (
                <Pressable key={hour} style={styles.modalOption} onPress={() => handleChangeHour(hour)}>
                  <Text style={styles.modalOptionText}>{hour}h</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
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
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    rowDisabled: {
      opacity: 0.4,
    },
    textColumn: {
      flex: 1,
    },
    label: {
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 4,
      color: colors.text,
    },
    hint: {
      fontSize: 13,
      opacity: 0.7,
      marginBottom: 8,
      color: colors.text,
    },
    hourButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.tint,
    },
    hourButtonText: {
      color: colors.tint,
      fontWeight: '700',
      fontSize: 15,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: {
      width: '100%',
      maxHeight: '70%',
      backgroundColor: colors.modalCard,
      borderRadius: 12,
      paddingVertical: 8,
    },
    modalOption: {
      paddingVertical: 14,
      paddingHorizontal: 20,
    },
    modalOptionText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
  });
}
