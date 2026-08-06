import { fireEvent, render, screen } from '@testing-library/react-native';

import MonthCalendarView from '@/components/MonthCalendarView';
import type { DayPlanning } from '@/lib/teams';
import type { ScanRecord, TeamGroup } from '@/types';

const planning: DayPlanning[] = [
  { date: '2026-07-01', code: 'D1', teammates: [], schedule: { codes: ['D1'], start: '08:00', end: '16:00' } },
  {
    date: '2026-07-02',
    code: 'D1',
    teammates: [{ name: 'Coéquipier', code: 'D2' }],
    schedule: undefined,
  },
];

const groups: TeamGroup[] = [{ id: 'd1-d4', label: 'D1-D4', codes: ['D1', 'D2', 'D3', 'D4'] }];

const scan: ScanRecord = {
  id: 'scan-1',
  year: 2026,
  month: 7,
  createdAt: 0,
  days: ['2026-07-01', '2026-07-02'],
  employees: ['Moi', 'Coéquipier'],
  grid: [
    ['D1', 'D1'],
    ['', 'D2'],
  ],
};

describe('MonthCalendarView', () => {
  it('affiche le quantième et le code de chaque jour', async () => {
    await render(<MonthCalendarView planning={planning} holidays={[]} showHours={false} scan={scan} groups={groups} />);

    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getAllByText('D1')).toHaveLength(2);
  });

  it("affiche l'horaire et le roster groupé par équipe dans le détail au clic sur un jour", async () => {
    await render(<MonthCalendarView planning={planning} holidays={[]} showHours={true} scan={scan} groups={groups} />);

    await fireEvent.press(screen.getByText('1'));

    expect(screen.getByText('Mercredi 1 Juillet 2026')).toBeTruthy();
    expect(screen.getByText('8h-16h')).toBeTruthy();
    expect(screen.getByText('D1-D4')).toBeTruthy();
    expect(screen.getByText('Moi')).toBeTruthy();
  });

  it("liste tous les membres de l'équipe (pas juste les coéquipiers d'une seule personne)", async () => {
    await render(<MonthCalendarView planning={planning} holidays={[]} showHours={false} scan={scan} groups={groups} />);

    await fireEvent.press(screen.getByText('2'));

    expect(screen.getByText('Moi')).toBeTruthy();
    expect(screen.getByText('Coéquipier')).toBeTruthy();
    expect(screen.getByText('D2')).toBeTruthy();
  });

  it("n'affiche pas l'horaire dans le détail quand showHours est désactivé", async () => {
    await render(<MonthCalendarView planning={planning} holidays={[]} showHours={false} scan={scan} groups={groups} />);

    await fireEvent.press(screen.getByText('1'));

    expect(screen.getByText('Mercredi 1 Juillet 2026')).toBeTruthy();
    expect(screen.queryByText('8h-16h')).toBeNull();
  });

  it("range les codes sans groupe dans 'Autres'", async () => {
    const noGroupPlanning: DayPlanning[] = [{ date: '2026-07-01', code: 'RTT', teammates: [], schedule: undefined }];
    const noGroupScan: ScanRecord = {
      ...scan,
      days: ['2026-07-01'],
      grid: [['RTT'], ['']],
    };
    await render(
      <MonthCalendarView planning={noGroupPlanning} holidays={[]} showHours={false} scan={noGroupScan} groups={groups} />
    );

    await fireEvent.press(screen.getByText('1'));

    expect(screen.getByText('Autres')).toBeTruthy();
    expect(screen.getByText('Moi')).toBeTruthy();
    // 'RTT' apparaît trois fois : la case du jour, le badge "mon poste", et le badge du roster.
    expect(screen.getAllByText('RTT').length).toBe(3);
  });

  it('affiche un badge "Férié" dans le détail quand le jour est férié', async () => {
    await render(
      <MonthCalendarView planning={planning} holidays={['2026-07-01']} showHours={false} scan={scan} groups={groups} />
    );

    await fireEvent.press(screen.getByText('1'));

    expect(screen.getByText('Férié')).toBeTruthy();
  });
});
