import { buildPlanningEvents, endsNextDay, nextDay } from '@/lib/planningEvents';
import type { CodeSchedule, ScanRecord, TeamGroup } from '@/types';

function toIcsDate(isoDate: string): string {
  return isoDate.replace(/-/g, '');
}

function toIcsDateTime(isoDate: string, hhmm: string): string {
  const [h, m] = hhmm.split(':');
  return `${toIcsDate(isoDate)}T${h.padStart(2, '0')}${m.padStart(2, '0')}00`;
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function foldLine(line: string): string {
  // RFC5545 : les lignes de plus de 75 octets doivent être repliées.
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = ' ' + rest.slice(75);
  }
  parts.push(rest);
  return parts.join('\r\n');
}

function dtstamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// Secondes depuis l'epoch : toujours croissant, ce qui satisfait la sémantique
// RFC5545 de SEQUENCE sans mémoriser de compteur.
function sequenceNumber(): number {
  return Math.floor(Date.now() / 1000);
}

/** "Marie-Hélène  Dupont" -> "marie-helene-dupont" (sans accents ni caractères spéciaux). */
export function slugifyName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * UID basé sur la personne et la date, pas sur le scan : stable d'un export à
 * l'autre même après un nouveau scan du mois, pour que le calendrier remplace
 * l'événement au lieu de le dupliquer. Le nom évite que deux collègues exportés
 * dans le même agenda s'écrasent.
 */
export function buildEventUid(employeeName: string, isoDate: string): string {
  return `${slugifyName(employeeName) || 'planning'}-${isoDate}@rn-planning`;
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
  const stamp = dtstamp();
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
    return lines.map(foldLine).join('\r\n');
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
