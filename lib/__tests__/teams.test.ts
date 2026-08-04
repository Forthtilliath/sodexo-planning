import {
  computeDayPlanning,
  computeDayRoster,
  computeMonthPlanning,
  findGroupForCode,
  findMyRowIndex,
  findScheduleForCode,
  formatScheduleHours,
  majorityCode,
  normalizeCode,
  normalizeName,
} from '@/lib/teams';
import type { CodeSchedule, ScanRecord, TeamGroup } from '@/types';

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

describe('normalizeCode / normalizeName', () => {
  it('normalizeCode retire les espaces et met en majuscules', () => {
    expect(normalizeCode('  d1 ')).toBe('D1');
    expect(normalizeCode('')).toBe('');
  });

  it('normalizeName met en minuscules et réduit les espaces multiples', () => {
    expect(normalizeName('  Jean   Dupont ')).toBe('jean dupont');
  });
});

describe('majorityCode', () => {
  it('renvoie le code le plus prioritaire selon CODE_DISPLAY_ORDER', () => {
    expect(majorityCode(['C2', 'D1'])).toBe('D1');
    expect(majorityCode(['B1', 'E2'])).toBe('E2');
    expect(majorityCode(['C4', 'C3'])).toBe('C3');
  });

  it("est insensible à l'ordre d'entrée et à la casse", () => {
    expect(majorityCode(['d1', 'e1'])).toBe('E1');
    expect(majorityCode(['e1', 'd1'])).toBe('E1');
  });

  it("garde un code hors-liste en dernier recours", () => {
    expect(majorityCode(['RTT', 'CP'])).toBe('CP');
  });

  it('renvoie undefined pour une liste vide', () => {
    expect(majorityCode([])).toBeUndefined();
  });
});

describe('findGroupForCode', () => {
  it('retrouve le groupe contenant le code, insensible à la casse', () => {
    expect(findGroupForCode('d2', groups)?.id).toBe('d1-d4');
    expect(findGroupForCode('C7', groups)?.id).toBe('c6-c8');
  });

  it("renvoie undefined pour un code inconnu ou vide", () => {
    expect(findGroupForCode('RTT', groups)).toBeUndefined();
    expect(findGroupForCode('', groups)).toBeUndefined();
  });
});

describe('findScheduleForCode / formatScheduleHours', () => {
  const schedules: CodeSchedule[] = [
    { codes: ['E1'], start: '08:00', end: '16:24' },
    { codes: ['C6', 'C7', 'C8'], start: '09:00', end: '17:00' },
  ];

  it('retrouve un horaire par code, quel que soit le nombre de codes du groupe', () => {
    expect(findScheduleForCode('e1', schedules)?.end).toBe('16:24');
    expect(findScheduleForCode('C7', schedules)?.start).toBe('09:00');
    expect(findScheduleForCode('RTT', schedules)).toBeUndefined();
  });

  it('formate les horaires façon "8h-16h24" (minutes omises si :00)', () => {
    expect(formatScheduleHours({ codes: ['E1'], start: '08:00', end: '16:24' })).toBe('8h-16h24');
    expect(formatScheduleHours({ codes: ['C6'], start: '09:00', end: '17:00' })).toBe('9h-17h');
  });
});

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

  it('trie les coéquipiers par code alphabétique, peu importe leur ordre dans le tableau', () => {
    const fGroup: TeamGroup[] = [{ id: 'f1-f5', label: 'F1-F5', codes: ['F1', 'F2', 'F3', 'F4', 'F5'] }];
    const fScan: ScanRecord = {
      id: 'scan-f',
      year: 2026,
      month: 7,
      createdAt: 0,
      days: ['2026-07-01'],
      employees: ['Moi (F2)', 'F4 Person', 'F1 Person', 'F3 Person'],
      grid: [['F2'], ['F4'], ['F1'], ['F3']],
    };
    const day = computeDayPlanning(fScan, 0, 0, fGroup);
    expect(day.teammates.map((t) => t.code)).toEqual(['F1', 'F3', 'F4']);
  });
});

describe('computeDayRoster', () => {
  const rosterScan: ScanRecord = {
    id: 'scan-roster',
    year: 2026,
    month: 7,
    createdAt: 0,
    days: ['2026-07-01'],
    employees: ['Alice', 'Bob', 'Carla', 'Dan', 'Eve'],
    grid: [['D1'], ['D2'], ['C6'], ['C7'], ['RTT']],
  };

  it('regroupe tout le monde par équipe pour un jour donné', () => {
    const roster = computeDayRoster(rosterScan, 0, groups);

    expect(roster).toHaveLength(3);
    expect(roster[0]).toEqual({
      group: groups[0],
      members: [
        { name: 'Alice', code: 'D1' },
        { name: 'Bob', code: 'D2' },
      ],
    });
    expect(roster[1]).toEqual({
      group: groups[1],
      members: [
        { name: 'Carla', code: 'C6' },
        { name: 'Dan', code: 'C7' },
      ],
    });
  });

  it("trie les groupes selon CODE_DISPLAY_ORDER (E, D, C, B1), pas selon l'ordre de saisie des groupes", () => {
    // Groupes déclarés dans un ordre différent de la priorité E > D > C > B1.
    const scrambledGroups: TeamGroup[] = [
      { id: 'b1', label: 'B1', codes: ['B1'] },
      { id: 'c6-c8', label: 'C6-C8', codes: ['C6', 'C7', 'C8'] },
      { id: 'e1-e3', label: 'E1-E3', codes: ['E1', 'E2', 'E3'] },
      { id: 'd1-d4', label: 'D1-D4', codes: ['D1', 'D2', 'D3', 'D4'] },
    ];
    const scan: ScanRecord = {
      id: 'scan-scrambled',
      year: 2026,
      month: 7,
      createdAt: 0,
      days: ['2026-07-01'],
      employees: ['Alice', 'Bob', 'Carla', 'Dan'],
      grid: [['B1'], ['C6'], ['E1'], ['D1']],
    };

    const roster = computeDayRoster(scan, 0, scrambledGroups);

    expect(roster.map((g) => g.group?.id)).toEqual(['e1-e3', 'd1-d4', 'c6-c8', 'b1']);
  });

  it("range les codes sans groupe configuré dans un dernier bloc 'Autres'", () => {
    const roster = computeDayRoster(rosterScan, 0, groups);

    expect(roster[2]).toEqual({ group: undefined, members: [{ name: 'Eve', code: 'RTT' }] });
  });

  it('ignore les lignes sans code ce jour-là', () => {
    const scanWithGaps: ScanRecord = {
      ...rosterScan,
      grid: [['D1'], [''], ['C6'], [''], ['']],
    };

    const roster = computeDayRoster(scanWithGaps, 0, groups);

    expect(roster.flatMap((g) => g.members)).toEqual([
      { name: 'Alice', code: 'D1' },
      { name: 'Carla', code: 'C6' },
    ]);
  });

  it("renvoie un tableau vide si personne n'a de code ce jour-là", () => {
    const emptyScan: ScanRecord = { ...rosterScan, grid: rosterScan.grid.map(() => ['']) };
    expect(computeDayRoster(emptyScan, 0, groups)).toEqual([]);
  });
});

describe('computeMonthPlanning', () => {
  it('calcule un jour par colonne du scan', () => {
    const month = computeMonthPlanning(scan, 0, groups);
    expect(month).toHaveLength(3);
    expect(month.map((d) => d.code)).toEqual(['D1', 'C6', 'RTT']);
  });
});
