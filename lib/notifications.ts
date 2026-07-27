import * as Notifications from 'expo-notifications';

import { getScans, getSettings, getTeamGroups } from './db';
import { computeDayPlanning, findMyRowIndex } from './teams';

export const DEFAULT_REMINDER_HOUR = 19;
// Au-delà, plus la peine de programmer : les plannings sont saisis un mois à
// l'avance tout au plus, pas besoin d'aller chercher plus loin.
const MAX_DAYS_AHEAD = 60;

// Les rappels de travail et le rappel de sauvegarde sont deux catégories
// indépendantes de notifications programmées : on les identifie par préfixe
// pour pouvoir annuler/reprogrammer l'une sans toucher à l'autre.
const WORK_REMINDER_PREFIX = 'work-reminder-';
const BACKUP_REMINDER_ID = 'backup-reminder';
export const BACKUP_REMINDER_INTERVAL_DAYS = 14;

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

// Annule tout ce qui est programmé à part le rappel de sauvegarde. Plus
// robuste qu'un filtre par préfixe : ça nettoie aussi les rappels de travail
// programmés par une version antérieure de l'app (identifiants générés
// automatiquement, sans le préfixe "work-reminder-"), qui sinon restaient
// coincés indéfiniment et doublonnaient avec les nouveaux.
async function cancelWorkReminderNotifications(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.identifier !== BACKUP_REMINDER_ID)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

/**
 * Annule tous les rappels de travail programmés puis reprogramme, pour
 * chaque jour à venir où "Mon nom" a un poste renseigné, un rappel la veille
 * (heure choisie dans Réglages > Notifications, 19h par défaut), en
 * mentionnant les coéquipiers du même groupe ce jour-là.
 */
export async function rescheduleWorkReminders(): Promise<void> {
  await cancelWorkReminderNotifications();

  const [scans, settings, groups] = await Promise.all([getScans(), getSettings(), getTeamGroups()]);
  const reminderHour = settings.reminderHour ?? DEFAULT_REMINDER_HOUR;
  const now = Date.now();
  const cutoff = now + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000;

  const schedules: Promise<unknown>[] = [];

  for (const scan of scans) {
    const myRowIndex = findMyRowIndex(scan, settings.myName);
    if (myRowIndex < 0) continue;

    scan.days.forEach((iso, dayIndex) => {
      const day = computeDayPlanning(scan, dayIndex, myRowIndex, groups);
      if (!day.code) return;

      const triggerDate = new Date(`${iso}T00:00:00`);
      triggerDate.setDate(triggerDate.getDate() - 1);
      triggerDate.setHours(reminderHour, 0, 0, 0);
      const triggerTime = triggerDate.getTime();
      if (triggerTime <= now || triggerTime > cutoff) return;

      const body =
        day.teammates.length > 0
          ? `Poste : ${day.code} · Avec ${day.teammates.map((t) => t.name).join(', ')}`
          : `Poste : ${day.code}`;

      schedules.push(
        Notifications.scheduleNotificationAsync({
          identifier: `${WORK_REMINDER_PREFIX}${scan.id}-${dayIndex}`,
          content: {
            title: 'Tu travailles demain',
            body,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
        })
      );
    });
  }

  await Promise.all(schedules);
}

export async function cancelWorkReminders(): Promise<void> {
  await cancelWorkReminderNotifications();
}

/**
 * Programme un rappel récurrent (tous les BACKUP_REMINDER_INTERVAL_DAYS
 * jours) pour inciter à exporter une sauvegarde : c'est la seule protection
 * contre une perte de données (réinstallation, changement de package...).
 */
export async function scheduleBackupReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(BACKUP_REMINDER_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: BACKUP_REMINDER_ID,
    content: {
      title: 'Pense à sauvegarder tes données',
      body: 'Exporte une sauvegarde depuis Réglages > Sauvegarde, au cas où.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: BACKUP_REMINDER_INTERVAL_DAYS * 24 * 60 * 60,
      repeats: true,
    },
  });
}

export async function cancelBackupReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(BACKUP_REMINDER_ID).catch(() => {});
}
