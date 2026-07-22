import * as Notifications from 'expo-notifications';

import { getScans, getSettings } from './db';
import { findMyRowIndex, normalizeCode } from './teams';

export const DEFAULT_REMINDER_HOUR = 19;
// Au-delà, plus la peine de programmer : les plannings sont saisis un mois à
// l'avance tout au plus, pas besoin d'aller chercher plus loin.
const MAX_DAYS_AHEAD = 60;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Annule tous les rappels programmés puis reprogramme, pour chaque jour à
 * venir où "Mon nom" a un poste renseigné, un rappel la veille (heure
 * choisie dans Réglages > Notifications, 19h par défaut).
 */
export async function rescheduleWorkReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const [scans, settings] = await Promise.all([getScans(), getSettings()]);
  const reminderHour = settings.reminderHour ?? DEFAULT_REMINDER_HOUR;
  const now = Date.now();
  const cutoff = now + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000;

  const schedules: Promise<unknown>[] = [];

  for (const scan of scans) {
    const myRowIndex = findMyRowIndex(scan, settings.myName);
    if (myRowIndex < 0) continue;

    scan.days.forEach((iso, dayIndex) => {
      const code = normalizeCode(scan.grid[myRowIndex]?.[dayIndex] ?? '');
      if (!code) return;

      const triggerDate = new Date(`${iso}T00:00:00`);
      triggerDate.setDate(triggerDate.getDate() - 1);
      triggerDate.setHours(reminderHour, 0, 0, 0);
      const triggerTime = triggerDate.getTime();
      if (triggerTime <= now || triggerTime > cutoff) return;

      schedules.push(
        Notifications.scheduleNotificationAsync({
          content: {
            title: 'Tu travailles demain',
            body: `Poste : ${code}`,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
        })
      );
    });
  }

  await Promise.all(schedules);
}

export async function cancelWorkReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
