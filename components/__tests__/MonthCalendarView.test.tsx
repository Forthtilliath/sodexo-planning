import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

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

  it("affiche l'horaire et le roster groupé par équipe dans l'alerte au clic sur un jour", async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(<MonthCalendarView planning={planning} holidays={[]} showHours={true} scan={scan} groups={groups} />);

    await fireEvent.press(screen.getByText('1'));

    expect(alertSpy).toHaveBeenCalledWith('mercredi 1', 'Code : D1\nHoraire : 8h-16h\n\nD1-D4 : Moi (D1)');

    alertSpy.mockRestore();
  });

  it("liste tous les membres de l'équipe (pas juste les coéquipiers d'une seule personne)", async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(<MonthCalendarView planning={planning} holidays={[]} showHours={false} scan={scan} groups={groups} />);

    await fireEvent.press(screen.getByText('2'));

    expect(alertSpy).toHaveBeenCalledWith('jeudi 2', 'Code : D1\n\nD1-D4 : Moi (D1), Coéquipier (D2)');

    alertSpy.mockRestore();
  });

  it("n'affiche pas l'horaire dans l'alerte quand showHours est désactivé", async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(<MonthCalendarView planning={planning} holidays={[]} showHours={false} scan={scan} groups={groups} />);

    await fireEvent.press(screen.getByText('1'));

    expect(alertSpy).toHaveBeenCalledWith('mercredi 1', 'Code : D1\n\nD1-D4 : Moi (D1)');

    alertSpy.mockRestore();
  });

  it("range les codes sans groupe dans 'Autres'", async () => {
    const noGroupPlanning: DayPlanning[] = [{ date: '2026-07-01', code: 'RTT', teammates: [], schedule: undefined }];
    const noGroupScan: ScanRecord = {
      ...scan,
      days: ['2026-07-01'],
      grid: [['RTT'], ['']],
    };
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(
      <MonthCalendarView planning={noGroupPlanning} holidays={[]} showHours={false} scan={noGroupScan} groups={groups} />
    );

    await fireEvent.press(screen.getByText('1'));

    expect(alertSpy).toHaveBeenCalledWith('mercredi 1', 'Code : RTT\n\nAutres : Moi (RTT)');

    alertSpy.mockRestore();
  });
});
