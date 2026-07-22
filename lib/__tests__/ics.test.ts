import { buildIcs } from '@/lib/ics';
import type { CodeSchedule, ScanRecord, TeamGroup } from '@/types';

const groups: TeamGroup[] = [{ id: 'd1-d4', label: 'D1-D4', codes: ['D1', 'D2', 'D3', 'D4'] }];

const scan: ScanRecord = {
  id: 'scan-1',
  year: 2026,
  month: 7,
  createdAt: 0,
  days: ['2026-07-01', '2026-07-02'],
  employees: ['Moi', 'D2 Person'],
  grid: [
    ['D1', 'X'],
    ['D2', 'X'],
  ],
};

describe('buildIcs', () => {
  it('génère un VCALENDAR valide avec un VEVENT par jour', () => {
    const ics = buildIcs(scan, groups, 0);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('DTSTART;VALUE=DATE:20260701');
    expect(ics).toContain('DTEND;VALUE=DATE:20260702');
  });

  it('met seulement le code dans le résumé, les coéquipiers restent dans la description', () => {
    const ics = buildIcs(scan, groups, 0);
    expect(ics).toContain('SUMMARY:D1');
    expect(ics).not.toContain('avec D2 Person');
    expect(ics).toContain('DESCRIPTION:Équipe : D2 Person (D2)');
  });

  it("utilise juste le code quand il n'y a pas de coéquipier", () => {
    const ics = buildIcs(scan, groups, 0);
    expect(ics).toContain('SUMMARY:X');
  });

  it("utilise l'horaire réel du code quand il est connu, au lieu d'une journée entière", () => {
    const schedules: CodeSchedule[] = [{ codes: ['D1'], start: '08:00', end: '16:24' }];
    const ics = buildIcs(scan, groups, 0, schedules);

    expect(ics).toContain('DTSTART:20260701T080000');
    expect(ics).toContain('DTEND:20260701T162400');
    expect(ics).not.toContain('DTSTART;VALUE=DATE:20260701');
  });

  it('échappe les virgules et points-virgules dans la description', () => {
    const specialScan: ScanRecord = {
      ...scan,
      employees: ['Moi', 'Dupont, Marie;Test'],
    };
    const ics = buildIcs(specialScan, groups, 0);
    expect(ics).toContain('DESCRIPTION:Équipe : Dupont\\, Marie\\;Test (D2)');
  });

  it('replie les lignes de plus de 75 caractères (RFC5545)', () => {
    const longNameScan: ScanRecord = {
      ...scan,
      employees: ['Moi', 'Un Nom De Coéquipier Vraiment Très Long Pour Forcer Le Pliage De Ligne'],
    };
    const ics = buildIcs(longNameScan, groups, 0);
    const descriptionLine = ics.split('\r\n').find((l) => l.startsWith('DESCRIPTION:'));
    expect(descriptionLine?.length).toBeLessThanOrEqual(75);
    // La suite de la ligne repliée commence par un espace, comme l'exige RFC5545.
    expect(ics).toMatch(/DESCRIPTION:[\s\S]*\r\n /);
  });
});
