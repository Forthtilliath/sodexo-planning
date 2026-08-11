import { downloadAndInstallApk as downloadAndInstallApkBase } from '@forthtilliath/expo-release-updates/downloadAndInstallApk';
import {
  fetchLatestRelease as fetchLatestReleaseBase,
  fetchReleaseHistory as fetchReleaseHistoryBase,
} from '@forthtilliath/expo-release-updates/githubReleases';

export { compareVersions } from '@forthtilliath/expo-release-updates/compareVersions';
export type { LatestRelease, ReleaseHistoryEntry } from '@forthtilliath/expo-release-updates/githubReleases';

const REPO = { owner: 'Forthtilliath', repo: 'sodexo-planning' };
const APK_FILE_NAME = 'sodexo-planning-update.apk';

export function fetchLatestRelease() {
  return fetchLatestReleaseBase(REPO);
}

// Historique des releases (notes de version), affiché dans Réglages > Mise à
// jour en plus de la vérification — mêmes notes que le CHANGELOG.md du
// dépôt, puisqu'elles sont recopiées dedans à chaque release (voir
// scripts/release.js).
export function fetchReleaseHistory(limit = 10) {
  return fetchReleaseHistoryBase({ ...REPO, limit });
}

export function downloadAndInstallApk(apkUrl: string, onProgress?: (fraction: number) => void) {
  return downloadAndInstallApkBase({ apkUrl, fileName: APK_FILE_NAME, onProgress });
}
