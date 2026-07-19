import { buildIcs } from '@/lib/ics';
import type { ScanRecord, TeamGroup } from '@/types';

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

  it("inclut les coéquipiers dans le résumé et la description", () => {
    const ics = buildIcs(scan, groups, 0);
    expect(ics).toContain('SUMMARY:D1 (avec D2 Person)');
    expect(ics).toContain('DESCRIPTION:Équipe : D2 Person (D2)');
  });

  it('utilise juste le code quand il n\'y a pas de coéquipier', () => {
    const ics = buildIcs(scan, groups, 0);
    expect(ics).toContain('SUMMARY:X');
  });
});
