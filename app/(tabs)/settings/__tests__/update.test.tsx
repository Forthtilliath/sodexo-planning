import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('expo-constants', () => ({ expoConfig: { version: '1.0.0' } }));

jest.mock('@/lib/appUpdate', () => {
  const actual = jest.requireActual('@/lib/appUpdate');
  return {
    ...actual,
    fetchLatestRelease: jest.fn(),
    fetchReleaseHistory: jest.fn(),
    downloadAndInstallApk: jest.fn(),
  };
});

import UpdateScreen from '@/app/(tabs)/settings/update';
import { downloadAndInstallApk, fetchLatestRelease, fetchReleaseHistory } from '@/lib/appUpdate';

const fetchLatestReleaseMock = fetchLatestRelease as jest.Mock;
const fetchReleaseHistoryMock = fetchReleaseHistory as jest.Mock;
const downloadAndInstallApkMock = downloadAndInstallApk as jest.Mock;

describe('UpdateScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchReleaseHistoryMock.mockResolvedValue([]);
  });

  it("affiche la version installée et vérifie automatiquement dès l'ouverture", async () => {
    fetchLatestReleaseMock.mockResolvedValue(null);
    await render(<UpdateScreen />);

    expect(screen.getByText('Version installée')).toBeTruthy();
    await waitFor(() => expect(fetchLatestReleaseMock).toHaveBeenCalled());
    expect(await screen.findByText('Tu as déjà la dernière version.')).toBeTruthy();
  });

  it('propose le téléchargement quand une version plus récente est disponible', async () => {
    fetchLatestReleaseMock.mockResolvedValue({
      version: '99.0.0',
      notes: '- Nouveauté',
      apkUrl: 'https://example.com/app.apk',
    });
    downloadAndInstallApkMock.mockResolvedValue(undefined);

    await render(<UpdateScreen />);
    expect(await screen.findByText('Version 99.0.0 disponible')).toBeTruthy();

    await fireEvent.press(screen.getByText('Télécharger et installer'));

    expect(downloadAndInstallApkMock).toHaveBeenCalledWith('https://example.com/app.apk', expect.any(Function));
  });

  it('affiche un message d\'erreur si la vérification échoue', async () => {
    fetchLatestReleaseMock.mockRejectedValue(new Error('network error'));
    await render(<UpdateScreen />);

    expect(await screen.findByText('Impossible de vérifier les mises à jour.')).toBeTruthy();
  });

  it("affiche l'historique des releases", async () => {
    fetchLatestReleaseMock.mockResolvedValue(null);
    fetchReleaseHistoryMock.mockResolvedValue([
      { version: '1.2.0', notes: '- Amélioration', publishedAt: '2026-08-01T00:00:00.000Z' },
      { version: '1.1.0', notes: '- Correctif', publishedAt: '2026-07-01T00:00:00.000Z' },
    ]);

    await render(<UpdateScreen />);

    expect(await screen.findByText('v1.2.0')).toBeTruthy();
    expect(screen.getByText('v1.1.0')).toBeTruthy();
  });
});
