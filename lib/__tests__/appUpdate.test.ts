const mockFetchLatestRelease = jest.fn();
const mockFetchReleaseHistory = jest.fn();
const mockDownloadAndInstallApk = jest.fn();

jest.mock('@forthtilliath/expo-release-updates', () => ({
  fetchLatestRelease: (...args: unknown[]) => mockFetchLatestRelease(...args),
  fetchReleaseHistory: (...args: unknown[]) => mockFetchReleaseHistory(...args),
  downloadAndInstallApk: (...args: unknown[]) => mockDownloadAndInstallApk(...args),
  compareVersions: jest.fn(),
}));

import { downloadAndInstallApk, fetchLatestRelease, fetchReleaseHistory } from '@/lib/appUpdate';

const REPO = { owner: 'Forthtilliath', repo: 'sodexo-planning' };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fetchLatestRelease', () => {
  it('interroge le dépôt sodexo-planning', () => {
    mockFetchLatestRelease.mockReturnValue('latest');
    expect(fetchLatestRelease()).toBe('latest');
    expect(mockFetchLatestRelease).toHaveBeenCalledWith(REPO);
  });
});

describe('fetchReleaseHistory', () => {
  it('limite l\'historique à 10 entrées par défaut', () => {
    fetchReleaseHistory();
    expect(mockFetchReleaseHistory).toHaveBeenCalledWith({ ...REPO, limit: 10 });
  });

  it('transmet une limite personnalisée', () => {
    fetchReleaseHistory(3);
    expect(mockFetchReleaseHistory).toHaveBeenCalledWith({ ...REPO, limit: 3 });
  });
});

describe('downloadAndInstallApk', () => {
  it('passe l\'url, le nom de fichier fixe et le callback de progression', () => {
    const onProgress = jest.fn();
    downloadAndInstallApk('https://example.com/app.apk', onProgress);

    expect(mockDownloadAndInstallApk).toHaveBeenCalledWith({
      apkUrl: 'https://example.com/app.apk',
      fileName: 'sodexo-planning-update.apk',
      onProgress,
    });
  });
});
