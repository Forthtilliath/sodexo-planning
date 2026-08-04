import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('@forthtilliath/expo-release-updates/githubReleases', () => ({
  fetchLatestRelease: jest.fn(),
}));

jest.mock('@forthtilliath/expo-release-updates/downloadAndInstallApk', () => ({
  downloadAndInstallApk: jest.fn(),
}));

import { downloadAndInstallApk } from '@forthtilliath/expo-release-updates/downloadAndInstallApk';
import { fetchLatestRelease } from '@forthtilliath/expo-release-updates/githubReleases';

import UpdateBanner from '@/components/UpdateBanner';

const fetchLatestReleaseMock = fetchLatestRelease as jest.Mock;
const downloadAndInstallApkMock = downloadAndInstallApk as jest.Mock;

describe('UpdateBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("n'affiche rien si aucune release ou si la version installée est déjà à jour", async () => {
    fetchLatestReleaseMock.mockResolvedValue(null);
    await render(<UpdateBanner />);

    expect(screen.queryByText(/disponible/)).toBeNull();
  });

  it("n'affiche rien si l'app est déjà silencieuse en cas d'erreur réseau", async () => {
    fetchLatestReleaseMock.mockRejectedValue(new Error('network error'));
    await render(<UpdateBanner />);

    expect(screen.queryByText(/disponible/)).toBeNull();
  });

  it('affiche le bandeau quand une version plus récente est disponible', async () => {
    fetchLatestReleaseMock.mockResolvedValue({
      version: '99.0.0',
      notes: 'Nouveautés',
      apkUrl: 'https://example.com/app.apk',
    });

    await render(<UpdateBanner />);

    expect(await screen.findByText('🆕 Version 99.0.0 disponible — touche pour installer')).toBeTruthy();
  });

  it('lance le téléchargement/installation au clic', async () => {
    fetchLatestReleaseMock.mockResolvedValue({
      version: '99.0.0',
      notes: 'Nouveautés',
      apkUrl: 'https://example.com/app.apk',
    });
    downloadAndInstallApkMock.mockResolvedValue(undefined);

    await render(<UpdateBanner />);
    const banner = await screen.findByText('🆕 Version 99.0.0 disponible — touche pour installer');
    await fireEvent.press(banner);

    expect(downloadAndInstallApkMock).toHaveBeenCalledWith(
      expect.objectContaining({ apkUrl: 'https://example.com/app.apk', fileName: 'sodexo-planning-99.0.0.apk' })
    );
  });

  it('masque le bandeau au clic sur la croix', async () => {
    fetchLatestReleaseMock.mockResolvedValue({
      version: '99.0.0',
      notes: 'Nouveautés',
      apkUrl: 'https://example.com/app.apk',
    });

    await render(<UpdateBanner />);
    await screen.findByText('🆕 Version 99.0.0 disponible — touche pour installer');
    await fireEvent.press(screen.getByLabelText('Masquer la notification de mise à jour'));

    expect(screen.queryByText(/disponible/)).toBeNull();
  });
});
