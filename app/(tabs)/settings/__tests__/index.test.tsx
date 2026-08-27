import { fireEvent, render, screen } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

import SettingsMenu from '@/app/(tabs)/settings/index';

describe('SettingsMenu', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('affiche toutes les entrées du menu', async () => {
    await render(<SettingsMenu />);

    expect(screen.getByText('Mon nom')).toBeTruthy();
    expect(screen.getByText('Sauvegarde')).toBeTruthy();
    expect(screen.getByText('Groupes de postes')).toBeTruthy();
    expect(screen.getByText('Salariés')).toBeTruthy();
    expect(screen.getByText('Notifications')).toBeTruthy();
    expect(screen.getByText('À propos')).toBeTruthy();
    expect(screen.getByText('Contact')).toBeTruthy();
    expect(screen.getByText('Confidentialité')).toBeTruthy();
  });

  it('navigue vers la bonne route au clic sur une entrée', async () => {
    await render(<SettingsMenu />);

    await fireEvent.press(screen.getByText('Sauvegarde'));

    expect(mockPush).toHaveBeenCalledWith('/settings/backup');

    await fireEvent.press(screen.getByText('Mon nom'));

    expect(mockPush).toHaveBeenCalledWith('/settings/me');
  });
});
