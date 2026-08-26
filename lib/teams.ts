import type { CodeSchedule, RosterEntry, ScanRecord, TeamGroup } from '@/types';

// Identifiant fixe de "ma" ligne dans un planning : app à usage personnel,
// pas besoin d'un réglage dédié (ni de la page qui allait avec) — il suffit
// de saisir "Moi" comme nom dans la grille pour que l'app retrouve la ligne.
export const MY_NAME = 'Moi';

/** Un salarié régulier (par défaut, champ absent) est ajouté automatiquement à chaque nouveau planning ; un intérimaire (`regular: false`) ne l'est pas. */
export function isRegular(entry: RosterEntry): boolean {
  return entry.regular !== false;
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Ordre "hiérarchique" des postes, du plus prioritaire au moins prioritaire,
// utilisé pour attribuer un poste majoritaire à chaque salarié (tri dans
// Réglages > Salariés) et pour grouper le roster d'un jour (voir
// computeDayRoster) : E1-E3 d'abord, puis D1-D4, C6-C8, C2-C5, B1, puis les
// codes de weekend/férié F1-F3 (= C6-C8) et F4-F5 (= D1-D2), dans cet ordre
// entre eux — sans quoi ils étaient à égalité et s'affichaient dans un ordre
// dépendant juste de qui apparaît en premier dans la grille ce jour-là.
export const CODE_DISPLAY_ORDER = [
  'E1', 'E2', 'E3',
  'D1', 'D2', 'D3', 'D4',
  'C6', 'C7', 'C8',
  'C2', 'C3', 'C4', 'C5',
  'B1',
  'F1', 'F2', 'F3', 'F4', 'F5',
];

/**
 * Parmi les codes habituels d'un salarié, renvoie le plus prioritaire selon
 * CODE_DISPLAY_ORDER ("poste majoritaire"). Un code hors de cette liste est
 * gardé en dernier recours (ordre alphabétique entre eux).
 */
export function majorityCode(codes: string[]): string | undefined {
  if (codes.length === 0) return undefined;
  const normalized = codes.map(normalizeCode);
  for (const code of CODE_DISPLAY_ORDER) {
    if (normalized.includes(code)) return code;
  }
  return normalized.slice().sort()[0];
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

export type DayRosterGroup = {
  group: TeamGroup | undefined; // undefined = codes sans groupe configuré ("Autres")
  members: Teammate[];
};

/**
 * Pour un jour donné, liste tout le monde qui a un code renseigné, regroupé
 * par groupe de postes (contrairement à computeDayPlanning, qui ne regarde
 * que les coéquipiers d'une seule personne) : une vue d'équipe complète.
 */
export function computeDayRoster(scan: ScanRecord, dayIndex: number, groups: TeamGroup[]): DayRosterGroup[] {
  const byGroupId = new Map<string, DayRosterGroup>();
  const others: DayRosterGroup = { group: undefined, members: [] };

  scan.grid.forEach((row, rowIndex) => {
    const code = normalizeCode(row[dayIndex] ?? '');
    if (!code) return;
    const name = scan.employees[rowIndex] ?? `Ligne ${rowIndex + 1}`;
    const group = findGroupForCode(code, groups);
    if (!group) {
      others.members.push({ name, code });
      return;
    }
    if (!byGroupId.has(group.id)) byGroupId.set(group.id, { group, members: [] });
    byGroupId.get(group.id)!.members.push({ name, code });
  });

  const result = Array.from(byGroupId.values());
  for (const g of result) {
    g.members.sort((a, b) => a.code.localeCompare(b.code) || a.name.localeCompare(b.name));
  }
  // Groupes triés selon CODE_DISPLAY_ORDER (E1-E3, puis D1-D4, C6-C8, C2-C5,
  // B1), via le code le plus prioritaire de chaque groupe.
  result.sort((a, b) => groupRank(a.group) - groupRank(b.group));
  if (others.members.length > 0) {
    others.members.sort((a, b) => a.code.localeCompare(b.code) || a.name.localeCompare(b.name));
    result.push(others);
  }
  return result;
}

function groupRank(group: TeamGroup | undefined): number {
  if (!group) return CODE_DISPLAY_ORDER.length;
  let best = CODE_DISPLAY_ORDER.length;
  for (const code of group.codes) {
    const idx = CODE_DISPLAY_ORDER.indexOf(normalizeCode(code));
    if (idx !== -1 && idx < best) best = idx;
  }
  return best;
}
