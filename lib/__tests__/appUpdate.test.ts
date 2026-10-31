const mockFetchLatestRelease = jest.fn();
const mockFetchReleaseHistory = jest.fn();
const mockDownloadAndInstallApk = jest.fn();

jest.mock('@forthtilliath/expo-release-updates', () => ({
  ...jest.requireActual('@forthtilliath/expo-release-updates'),
  fetchLatestRelease: (...args: unknown[]) => mockFetchLatestRelease(...args),
  fetchReleaseHistory: (...args: unknown[]) => mockFetchReleaseHistory(...args),
  downloadAndInstallApk: (...args: unknown[]) => mockDownloadAndInstallApk(...args),
}));

import { downloadAndInstallApk, fetchLatestRelease, fetchReleaseHistory } from '@/lib/appUpdate';

const REPO = { owner: 'Forthtilliath', repo: 'sodexo-planning' };
const APK_URL =
  'https://github.com/Forthtilliath/sodexo-planning/releases/download/v2.0.0/SodexoPlanning-2.0.0.apk';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fetchLatestRelease', () => {
  it('interroge le dépôt sodexo-planning, versions vérifiables seulement', () => {
    mockFetchLatestRelease.mockReturnValue('latest');
    expect(fetchLatestRelease()).toBe('latest');
    expect(mockFetchLatestRelease).toHaveBeenCalledWith({ ...REPO, requireVerifiedApk: true });
  });
});

describe('fetchReleaseHistory', () => {
  it("limite l'historique à 10 entrées par défaut", () => {
    fetchReleaseHistory();
    expect(mockFetchReleaseHistory).toHaveBeenCalledWith({ ...REPO, limit: 10 });
  });

  it('transmet une limite personnalisée', () => {
    fetchReleaseHistory(3);
    expect(mockFetchReleaseHistory).toHaveBeenCalledWith({ ...REPO, limit: 3 });
  });
});

describe('downloadAndInstallApk', () => {
  it("vérifie l'empreinte et limite le téléchargement aux releases du dépôt", async () => {
    const onProgress = jest.fn();
    await downloadAndInstallApk(APK_URL, onProgress, 'a'.repeat(64));

    expect(mockDownloadAndInstallApk).toHaveBeenCalledWith({
      apkUrl: APK_URL,
      fileName: 'sodexo-planning-update.apk',
      onProgress,
      expectedSha256: 'a'.repeat(64),
      allowedUrlPrefix: 'https://github.com/Forthtilliath/sodexo-planning/releases/download/',
    });
  });

  it('refuse une release sans empreinte, sans rien télécharger', async () => {
    await expect(downloadAndInstallApk(APK_URL)).rejects.toThrow('Empreinte');
    expect(mockDownloadAndInstallApk).not.toHaveBeenCalled();
  });
});
