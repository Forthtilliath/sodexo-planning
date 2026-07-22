import { fireEvent, render, screen } from '@testing-library/react-native';

import HolidayPicker from '@/components/HolidayPicker';

const days = ['2026-07-01', '2026-07-02', '2026-07-03']; // mer, jeu, ven

describe('HolidayPicker', () => {
  it('reste replié par défaut, avec le nombre de jours fériés dans le bouton', async () => {
    await render(<HolidayPicker days={days} holidays={new Set(['2026-07-02'])} onToggle={jest.fn()} />);

    expect(screen.getByText('📅 Jours fériés (1) ▼')).toBeTruthy();
    expect(screen.queryByText('1')).toBeNull(); // la grille n'est pas montée tant que replié
  });

  it("affiche la grille des jours du mois une fois déplié", async () => {
    await render(<HolidayPicker days={days} holidays={new Set()} onToggle={jest.fn()} />);

    await fireEvent.press(screen.getByText('📅 Jours fériés (0) ▼'));

    expect(screen.getByText('📅 Jours fériés (0) ▲')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('appelle onToggle avec la date ISO du jour touché', async () => {
    const onToggle = jest.fn();
    await render(<HolidayPicker days={days} holidays={new Set()} onToggle={onToggle} />);

    await fireEvent.press(screen.getByText('📅 Jours fériés (0) ▼'));
    await fireEvent.press(screen.getByText('2'));

    expect(onToggle).toHaveBeenCalledWith('2026-07-02');
  });
});
