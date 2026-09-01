import {
  downloadAndInstallApk as downloadAndInstallApkBase,
  fetchLatestRelease as fetchLatestReleaseBase,
  fetchReleaseHistory as fetchReleaseHistoryBase,
} from '@forthtilliath/expo-release-updates';

export { compareVersions, type LatestRelease, type ReleaseHistoryEntry } from '@forthtilliath/expo-release-updates';

const REPO = { owner: 'Forthtilliath', repo: 'sodexo-planning' };
const APK_FILE_NAME = 'sodexo-planning-update.apk';

export function fetchLatestRelease() {
  return fetchLatestReleaseBase(REPO);
}

// Historique des releases affiché dans Réglages > Mise à jour ; mêmes notes que
// le CHANGELOG.md (recopiées à chaque release, voir scripts/release.js).
export function fetchReleaseHistory(limit = 10) {
  return fetchReleaseHistoryBase({ ...REPO, limit });
}

export function downloadAndInstallApk(apkUrl: string, onProgress?: (fraction: number) => void) {
  return downloadAndInstallApkBase({ apkUrl, fileName: APK_FILE_NAME, onProgress });
}
