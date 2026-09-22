import * as Calendar from 'expo-calendar';

import { buildPlanningEvents, endsNextDay, nextDay, type PlanningEvent } from '@/lib/planningEvents';
import type { CodeSchedule, ScanRecord, TeamGroup } from '@/types';

// Nom interne (Android) du calendrier dédié : sert à le retrouver d'une synchro à l'autre.
const CALENDAR_NAME = 'sodexo-planning';
const CALENDAR_TITLE = 'Sodexo Planning';
const CALENDAR_COLOR = '#293897';

export type CalendarSyncResult = { status: 'denied' } | { status: 'done'; count: number };

type NativeEventDetails = {
  title: string;
  notes: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  timeZone: string;
};

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
}

function localDateTime(isoDate: string, hhmm: string): Date {
  const [y, mo, d] = isoDate.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi);
}

function utcMidnight(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

/**
 * Convertit un évènement du planning au format attendu par l'agenda natif.
 * Android exige qu'une journée entière soit à minuit UTC avec le fuseau "UTC",
 * sinon elle s'affiche décalée d'un jour selon le fuseau de l'appareil.
 */
export function toNativeEventDetails(event: PlanningEvent, timeZone = deviceTimeZone()): NativeEventDetails {
  if (event.start && event.end) {
    const endDay = endsNextDay(event.start, event.end) ? nextDay(event.date) : event.date;
    return {
      title: event.title,
      notes: event.description,
      startDate: localDateTime(event.date, event.start),
      endDate: localDateTime(endDay, event.end),
      allDay: false,
      timeZone,
    };
  }
  return {
    title: event.title,
    notes: event.description,
    startDate: utcMidnight(event.date),
    endDate: utcMidnight(nextDay(event.date)),
    allDay: true,
    timeZone: 'UTC',
  };
}

async function getOrCreatePlanningCalendar(): Promise<Calendar.ExpoCalendar> {
  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const existing = calendars.find((c) => c.name === CALENDAR_NAME);
  if (existing) return existing;

  return Calendar.createCalendar({
    title: CALENDAR_TITLE,
    name: CALENDAR_NAME,
    color: CALENDAR_COLOR,
    entityType: Calendar.EntityTypes.EVENT,
    // Compte local au téléphone : pas de synchro vers un compte Google, et
    // l'utilisateur peut masquer ce calendrier d'un geste dans son appli agenda.
    source: { isLocalAccount: true, name: CALENDAR_TITLE, type: 'LOCAL' },
    ownerAccount: CALENDAR_TITLE,
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
}

/**
 * Écrit le planning du mois dans le calendrier dédié "Sodexo Planning" du
 * téléphone. Les évènements déjà présents pour ce mois dans ce calendrier sont
 * supprimés avant réécriture : une nouvelle synchro remplace l'ancienne, sans
 * doublon, et un jour retiré du planning disparaît aussi de l'agenda.
 */
export async function syncPlanningToCalendar(
  scan: ScanRecord,
  groups: TeamGroup[],
  rowIndex: number,
  schedules: CodeSchedule[] = []
): Promise<CalendarSyncResult> {
  const { granted } = await Calendar.requestCalendarPermissions();
  if (!granted) return { status: 'denied' };

  const calendar = await getOrCreatePlanningCalendar();

  const monthStart = new Date(scan.year, scan.month - 1, 1);
  const nextMonthStart = new Date(scan.year, scan.month, 1);
  const previous = await calendar.listEvents(monthStart, nextMonthStart);
  for (const event of previous) {
    await event.delete();
  }

  const events = buildPlanningEvents(scan, groups, rowIndex, schedules);
  for (const event of events) {
    await calendar.createEvent(toNativeEventDetails(event));
  }
  return { status: 'done', count: events.length };
}
