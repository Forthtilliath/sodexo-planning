import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import MonthCalendarView from '@/components/MonthCalendarView';
import type { DayPlanning } from '@/lib/teams';

const planning: DayPlanning[] = [
  { date: '2026-07-01', code: 'D1', teammates: [], schedule: { codes: ['D1'], start: '08:00', end: '16:00' } },
  {
    date: '2026-07-02',
    code: 'D1',
    teammates: [{ name: 'Coéquipier', code: 'D2' }],
    schedule: undefined,
  },
];

describe('MonthCalendarView', () => {
  it('affiche le quantième et le code de chaque jour', async () => {
    await render(<MonthCalendarView planning={planning} holidays={[]} showHours={false} />);

    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getAllByText('D1')).toHaveLength(2);
  });

  it("affiche l'horaire et les coéquipiers dans l'alerte au clic sur un jour", async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(<MonthCalendarView planning={planning} holidays={[]} showHours={true} />);

    await fireEvent.press(screen.getByText('1'));

    expect(alertSpy).toHaveBeenCalledWith('mercredi 1', 'Code : D1\nHoraire : 8h-16h');

    alertSpy.mockRestore();
  });

  it("liste les coéquipiers dans l'alerte quand il y en a", async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(<MonthCalendarView planning={planning} holidays={[]} showHours={false} />);

    await fireEvent.press(screen.getByText('2'));

    expect(alertSpy).toHaveBeenCalledWith('jeudi 2', 'Code : D1\nAvec Coéquipier');

    alertSpy.mockRestore();
  });

  it("n'affiche pas l'horaire dans l'alerte quand showHours est désactivé", async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(<MonthCalendarView planning={planning} holidays={[]} showHours={false} />);

    await fireEvent.press(screen.getByText('1'));

    expect(alertSpy).toHaveBeenCalledWith('mercredi 1', 'Code : D1');

    alertSpy.mockRestore();
  });
});
