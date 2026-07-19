import type { ScanRecord, TeamGroup } from '@/types';

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
};

/**
 * Pour un jour donné, retrouve le code de la personne (myRowIndex), le groupe
 * d'équipe auquel ce code appartient (si configuré), et les collègues dont le
 * code ce jour-là fait partie du même groupe.
 */
export function computeDayPlanning(
  scan: ScanRecord,
  dayIndex: number,
  myRowIndex: number,
  groups: TeamGroup[]
): DayPlanning {
  const date = scan.days[dayIndex] ?? '';
  const code = normalizeCode(scan.grid[myRowIndex]?.[dayIndex] ?? '');
  const group = findGroupForCode(code, groups);

  if (!group) {
    return { date, code, group: undefined, teammates: [] };
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

  return { date, code, group, teammates };
}

export function computeMonthPlanning(
  scan: ScanRecord,
  myRowIndex: number,
  groups: TeamGroup[]
): DayPlanning[] {
  return scan.days.map((_, dayIndex) => computeDayPlanning(scan, dayIndex, myRowIndex, groups));
}
