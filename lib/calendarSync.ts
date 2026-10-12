import {
  type CalendarSyncResult,
  syncDedicatedCalendar,
} from '@forthtilliath/react-native-kit/utils/calendar/syncDedicatedCalendar';
import {
  type CalendarEventDetails,
  toCalendarEventDetails,
} from '@forthtilliath/react-native-kit/utils/calendar/toCalendarEventDetails';

import { buildPlanningEvents, type PlanningEvent } from '@/lib/planningEvents';
import type { CodeSchedule, ScanRecord, TeamGroup } from '@/types';

export type { CalendarSyncResult };

// Nom interne (Android) du calendrier dédié : sert à le retrouver d'une synchro à l'autre.
const PLANNING_CALENDAR = { name: 'sodexo-planning', title: 'Sodexo Planning', color: '#293897' };

/**
 * Convertit un évènement du planning au format attendu par l'agenda natif
 * (journée entière à minuit UTC pour Android, service de nuit fini le lendemain).
 */
export function toNativeEventDetails(event: PlanningEvent, timeZone?: string): CalendarEventDetails {
  return toCalendarEventDetails(
    { title: event.title, notes: event.description, date: event.date, start: event.start, end: event.end },
    timeZone
  );
}

/**
 * Écrit le planning du mois dans le calendrier dédié "Sodexo Planning" du
 * téléphone. Les évènements déjà présents pour ce mois dans ce calendrier sont
 * supprimés avant réécriture : une nouvelle synchro remplace l'ancienne, sans
 * doublon, et un jour retiré du planning disparaît aussi de l'agenda.
 */
export function syncPlanningToCalendar(
  scan: ScanRecord,
  groups: TeamGroup[],
  rowIndex: number,
  schedules: CodeSchedule[] = []
): Promise<CalendarSyncResult> {
  return syncDedicatedCalendar({
    calendar: PLANNING_CALENDAR,
    from: new Date(scan.year, scan.month - 1, 1),
    to: new Date(scan.year, scan.month, 1),
    events: buildPlanningEvents(scan, groups, rowIndex, schedules).map((event) => toNativeEventDetails(event)),
  });
}
