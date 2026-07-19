import type { ScanRecord, TeamGroup } from '@/types';
import { computeMonthPlanning } from '@/lib/teams';

function toIcsDate(isoDate: string): string {
  return isoDate.replace(/-/g, '');
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
 * Génère un fichier .ics avec un événement journée entière par jour du scan,
 * pour la ligne de l'utilisateur (myRowIndex). La description liste les
 * coéquipiers détectés (même groupe de code ce jour-là).
 */
export function buildIcs(scan: ScanRecord, groups: TeamGroup[], myRowIndex: number): string {
  const planning = computeMonthPlanning(scan, myRowIndex, groups);
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

      const lines = [
        'BEGIN:VEVENT',
        `UID:${scan.id}-${day.date}-${index}@rn-planning`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${toIcsDate(day.date)}`,
        `DTEND;VALUE=DATE:${toIcsDate(nextDay(day.date))}`,
        `SUMMARY:${escapeIcsText(summary)}`,
      ];
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
