import type { CodeSchedule, ScanRecord, TeamGroup } from '@/types';

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function findGroupForCode(code: string, groups: TeamGroup[]): TeamGroup | undefined {
  const norm = normalizeCode(code);
  if (!norm) return undefined;
  return groups.find((group) => group.codes.some((c) => normalizeCode(c) === norm));
}

export function findScheduleForCode(code: string, schedules: CodeSchedule[]): CodeSchedule | undefined {
  const norm = normalizeCode(code);
  if (!norm) return undefined;
  return schedules.find((s) => s.codes.some((c) => normalizeCode(c) === norm));
}

/** "08:00" -> "8h", "16:24" -> "16h24" (même notation que dans Réglages). */
function formatHour(hhmm: string): string {
  const [h, m] = hhmm.split(':');
  const hour = String(Number(h));
  return m === '00' ? `${hour}h` : `${hour}h${m}`;
}

export function formatScheduleHours(schedule: CodeSchedule): string {
  return `${formatHour(schedule.start)}-${formatHour(schedule.end)}`;
}

export function findMyRowIndex(scan: ScanRecord, myName: string): number {
  const norm = normalizeName(myName);
  if (!norm) return -1;
  return scan.employees.findIndex((name) => normalizeName(name) === norm);
}

export type Teammate = { name: string; code: string };

export type DayPlanning = {
  date: string;
  code: string;
  group?: TeamGroup;
  teammates: Teammate[];
  schedule?: CodeSchedule;
};

/**
 * Pour un jour donné, retrouve le code de la personne (myRowIndex), le groupe
 * d'équipe auquel ce code appartient (si configuré), les collègues dont le
 * code ce jour-là fait partie du même groupe, et l'horaire du code (si connu).
 */
export function computeDayPlanning(
  scan: ScanRecord,
  dayIndex: number,
  myRowIndex: number,
  groups: TeamGroup[],
  schedules: CodeSchedule[] = []
): DayPlanning {
  const date = scan.days[dayIndex] ?? '';
  const code = normalizeCode(scan.grid[myRowIndex]?.[dayIndex] ?? '');
  const group = findGroupForCode(code, groups);
  const schedule = findScheduleForCode(code, schedules);

  if (!group) {
    return { date, code, group: undefined, teammates: [], schedule };
  }

  const teammates: Teammate[] = [];
  scan.grid.forEach((row, rowIndex) => {
    if (rowIndex === myRowIndex) return;
    const rowCode = normalizeCode(row[dayIndex] ?? '');
    if (!rowCode) return;
    if (group.codes.some((c) => normalizeCode(c) === rowCode)) {
      teammates.push({ name: scan.employees[rowIndex] ?? `Ligne ${rowIndex + 1}`, code: rowCode });
    }
  });
  teammates.sort((a, b) => a.code.localeCompare(b.code));

  return { date, code, group, teammates, schedule };
}

export function computeMonthPlanning(
  scan: ScanRecord,
  myRowIndex: number,
  groups: TeamGroup[],
  schedules: CodeSchedule[] = []
): DayPlanning[] {
  return scan.days.map((_, dayIndex) => computeDayPlanning(scan, dayIndex, myRowIndex, groups, schedules));
}
