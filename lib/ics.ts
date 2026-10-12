import { escapeIcsText } from '@forthtilliath/ts-kit/ics/escapeIcsText';
import { foldIcsLine } from '@forthtilliath/ts-kit/ics/foldIcsLine';
import { icsTimestamp } from '@forthtilliath/ts-kit/ics/icsTimestamp';
import { toIcsDate } from '@forthtilliath/ts-kit/ics/toIcsDate';
import { toIcsDateTime } from '@forthtilliath/ts-kit/ics/toIcsDateTime';
import { slugify } from '@forthtilliath/ts-kit/string/slugify';

import { buildPlanningEvents, endsNextDay, nextDay } from '@/lib/planningEvents';
import type { CodeSchedule, ScanRecord, TeamGroup } from '@/types';

// Secondes depuis l'epoch : toujours croissant, ce qui satisfait la sémantique
// RFC5545 de SEQUENCE sans mémoriser de compteur.
function sequenceNumber(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * UID basé sur la personne et la date, pas sur le scan : stable d'un export à
 * l'autre même après un nouveau scan du mois, pour que le calendrier remplace
 * l'événement au lieu de le dupliquer. Le nom évite que deux collègues exportés
 * dans le même agenda s'écrasent.
 */
export function buildEventUid(employeeName: string, isoDate: string): string {
  return `${slugify(employeeName) || 'planning'}-${isoDate}@rn-planning`;
}

/**
 * Génère un fichier .ics avec un événement par jour du scan, pour la ligne
 * `myRowIndex`. Évènement avec heure réelle quand l'horaire du code est connu
 * (Réglages), sinon journée entière.
 */
export function buildIcs(
  scan: ScanRecord,
  groups: TeamGroup[],
  myRowIndex: number,
  schedules: CodeSchedule[] = []
): string {
  const employeeName = scan.employees[myRowIndex] ?? '';
  const stamp = icsTimestamp();
  const sequence = sequenceNumber();

  const events = buildPlanningEvents(scan, groups, myRowIndex, schedules).map((event) => {
    const lines = [
      'BEGIN:VEVENT',
      `UID:${buildEventUid(employeeName, event.date)}`,
      `DTSTAMP:${stamp}`,
      `SEQUENCE:${sequence}`,
    ];
    if (event.start && event.end) {
      const endDate = endsNextDay(event.start, event.end) ? nextDay(event.date) : event.date;
      lines.push(`DTSTART:${toIcsDateTime(event.date, event.start)}`);
      lines.push(`DTEND:${toIcsDateTime(endDate, event.end)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${toIcsDate(event.date)}`);
      lines.push(`DTEND;VALUE=DATE:${toIcsDate(nextDay(event.date))}`);
    }
    lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    }
    lines.push('END:VEVENT');
    return lines.map((line) => foldIcsLine(line)).join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//rn-planning//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}
