import type { CodeSchedule, ScanRecord, TeamGroup } from '@/types';
import { computeMonthPlanning } from '@/lib/teams';

function toIcsDate(isoDate: string): string {
  return isoDate.replace(/-/g, '');
}

function toIcsDateTime(isoDate: string, hhmm: string): string {
  const [h, m] = hhmm.split(':');
  return `${toIcsDate(isoDate)}T${h.padStart(2, '0')}${m.padStart(2, '0')}00`;
}

function nextDay(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
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

/**
 * Génère un fichier .ics avec un événement par jour du scan, pour la ligne de
 * l'utilisateur (myRowIndex). Évènement avec heure réelle quand l'horaire du
 * code est connu (Réglages), sinon journée entière. La description liste les
 * coéquipiers détectés (même groupe de code ce jour-là).
 */
export function buildIcs(
  scan: ScanRecord,
  groups: TeamGroup[],
  myRowIndex: number,
  schedules: CodeSchedule[] = []
): string {
  const planning = computeMonthPlanning(scan, myRowIndex, groups, schedules);
  const stamp = dtstamp();

  const events = planning
    .filter((day) => day.code)
    .map((day, index) => {
      const summary = day.teammates.length
        ? `${day.code} (avec ${day.teammates.map((t) => t.name).join(', ')})`
        : day.code;
      const description =
        day.teammates.length > 0
          ? `Équipe : ${day.teammates.map((t) => `${t.name} (${t.code})`).join(', ')}`
          : '';

      const lines = ['BEGIN:VEVENT', `UID:${scan.id}-${day.date}-${index}@rn-planning`, `DTSTAMP:${stamp}`];
      if (day.schedule) {
        lines.push(`DTSTART:${toIcsDateTime(day.date, day.schedule.start)}`);
        lines.push(`DTEND:${toIcsDateTime(day.date, day.schedule.end)}`);
      } else {
        lines.push(`DTSTART;VALUE=DATE:${toIcsDate(day.date)}`);
        lines.push(`DTEND;VALUE=DATE:${toIcsDate(nextDay(day.date))}`);
      }
      lines.push(`SUMMARY:${escapeIcsText(summary)}`);
      if (description) {
        lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
      }
      lines.push('END:VEVENT');
      return lines.map(foldLine).join('\r\n');
    });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//rn-planning//FR',
    'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}
