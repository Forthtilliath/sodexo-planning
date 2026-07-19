import { computeDayPlanning, computeMonthPlanning, findMyRowIndex } from '@/lib/teams';
import type { ScanRecord, TeamGroup } from '@/types';

const groups: TeamGroup[] = [
  { id: 'd1-d4', label: 'D1-D4', codes: ['D1', 'D2', 'D3', 'D4'] },
  { id: 'c6-c8', label: 'C6-C8', codes: ['C6', 'C7', 'C8'] },
];

// Reprend la logique de l'exemple réel : D1 fait équipe avec D2/D3/D4,
// C6 avec C7/C8.
const scan: ScanRecord = {
  id: 'scan-1',
  year: 2026,
  month: 7,
  createdAt: 0,
  days: ['2026-07-01', '2026-07-02', '2026-07-03'],
  employees: ['Moi', 'D2 Person', 'D3 Person', 'D4 Person', 'C7 Person', 'C8 Person', 'Autre Person'],
  grid: [
    ['D1', 'C6', 'RTT'],
    ['D2', 'X', 'X'],
    ['D3', 'X', 'X'],
    ['D4', 'X', 'X'],
    ['X', 'C7', 'X'],
    ['X', 'C8', 'X'],
    ['X', 'X', 'X'],
  ],
};

describe('findMyRowIndex', () => {
  it('trouve la ligne en ignorant casse et espaces superflus', () => {
    expect(findMyRowIndex(scan, '  moi  ')).toBe(0);
    expect(findMyRowIndex(scan, 'MOI')).toBe(0);
  });

  it("renvoie -1 si le nom n'existe pas", () => {
    expect(findMyRowIndex(scan, 'Inconnu')).toBe(-1);
  });
});

describe('computeDayPlanning', () => {
  it('retrouve les coéquipiers du groupe D1-D4 le premier jour', () => {
    const day = computeDayPlanning(scan, 0, 0, groups);
    expect(day.code).toBe('D1');
    expect(day.group?.id).toBe('d1-d4');
    expect(day.teammates.map((t) => t.name).sort()).toEqual(['D2 Person', 'D3 Person', 'D4 Person']);
  });

  it('retrouve les coéquipiers du groupe C6-C8 le deuxième jour', () => {
    const day = computeDayPlanning(scan, 1, 0, groups);
    expect(day.code).toBe('C6');
    expect(day.group?.id).toBe('c6-c8');
    expect(day.teammates.map((t) => t.name).sort()).toEqual(['C7 Person', 'C8 Person']);
  });

  it("ne renvoie aucune équipe pour un code hors groupe (ex: RTT)", () => {
    const day = computeDayPlanning(scan, 2, 0, groups);
    expect(day.code).toBe('RTT');
    expect(day.group).toBeUndefined();
    expect(day.teammates).toEqual([]);
  });
});

describe('computeMonthPlanning', () => {
  it('calcule un jour par colonne du scan', () => {
    const month = computeMonthPlanning(scan, 0, groups);
    expect(month).toHaveLength(3);
    expect(month.map((d) => d.code)).toEqual(['D1', 'C6', 'RTT']);
  });
});
