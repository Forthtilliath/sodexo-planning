import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

jest.mock('@/lib/appUpdate', () => {
  const actual = jest.requireActual('@/lib/appUpdate');
  return { ...actual, fetchLatestRelease: jest.fn() };
});

import UpdateBanner from '@/components/UpdateBanner';
import { fetchLatestRelease } from '@/lib/appUpdate';

const fetchLatestReleaseMock = fetchLatestRelease as jest.Mock;

describe('UpdateBanner', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it("n'affiche rien si aucune release ou si la version installée est déjà à jour", async () => {
    fetchLatestReleaseMock.mockResolvedValue(null);
    await render(<UpdateBanner />);

    await waitFor(() => expect(fetchLatestReleaseMock).toHaveBeenCalled());
    expect(screen.queryByText(/disponible/)).toBeNull();
  });

  it("n'affiche rien si le réseau est indisponible", async () => {
    fetchLatestReleaseMock.mockRejectedValue(new Error('network error'));
    await render(<UpdateBanner />);

    await waitFor(() => expect(fetchLatestReleaseMock).toHaveBeenCalled());
    expect(screen.queryByText(/disponible/)).toBeNull();
  });

  it('affiche le bandeau quand une version plus récente est disponible', async () => {
    fetchLatestReleaseMock.mockResolvedValue({
      version: '99.0.0',
      notes: 'Nouveautés',
      apkUrl: 'https://example.com/app.apk',
    });

    await render(<UpdateBanner />);

    expect(await screen.findByText('Version 99.0.0 disponible')).toBeTruthy();
  });

  it('navigue vers l\'écran de mise à jour au clic sur "Voir"', async () => {
    fetchLatestReleaseMock.mockResolvedValue({
      version: '99.0.0',
      notes: 'Nouveautés',
      apkUrl: 'https://example.com/app.apk',
    });

    await render(<UpdateBanner />);
    await screen.findByText('Version 99.0.0 disponible');
    await fireEvent.press(screen.getByText('Voir'));

    expect(mockPush).toHaveBeenCalledWith('/settings/update');
  });

  it('mémorise la version fermée au clic sur "Fermer", pour ne plus la reproposer', async () => {
    fetchLatestReleaseMock.mockResolvedValue({
      version: '99.0.0',
      notes: 'Nouveautés',
      apkUrl: 'https://example.com/app.apk',
    });

    await render(<UpdateBanner />);
    await screen.findByText('Version 99.0.0 disponible');
    await fireEvent.press(screen.getByText('Fermer'));

    expect(screen.queryByText(/disponible/)).toBeNull();
    const raw = await AsyncStorage.getItem('@rn-planning/settings');
    expect(JSON.parse(raw ?? '{}').dismissedUpdateVersion).toBe('99.0.0');
  });
});
