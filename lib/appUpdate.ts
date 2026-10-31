import {
  downloadAndInstallApk as downloadAndInstallApkBase,
  fetchLatestRelease as fetchLatestReleaseBase,
  fetchReleaseHistory as fetchReleaseHistoryBase,
  releaseDownloadUrlPrefix,
} from '@forthtilliath/expo-release-updates';

export {
  compareVersions,
  type LatestRelease,
  type ReleaseHistoryEntry,
} from '@forthtilliath/expo-release-updates';

const REPO = { owner: 'Forthtilliath', repo: 'sodexo-planning' };
const APK_FILE_NAME = 'sodexo-planning-update.apk';

// Seules les versions dont GitHub donne l'empreinte SHA-256 de l'APK sont proposées : une release
// sans empreinte, ou dont l'APK est hors des releases du dépôt, est sautée au profit de la suivante.
export function fetchLatestRelease() {
  return fetchLatestReleaseBase({ ...REPO, requireVerifiedApk: true });
}

// Historique des releases affiché dans Réglages > Mise à jour ; mêmes notes que
// le CHANGELOG.md (recopiées à chaque release, voir scripts/release.js).
export function fetchReleaseHistory(limit = 10) {
  return fetchReleaseHistoryBase({ ...REPO, limit });
}

// Téléchargement limité aux releases du dépôt, et refusé si l'APK n'a pas l'empreinte annoncée par
// GitHub (l'installeur d'Android refuse en plus un APK signé avec une autre clé).
export function downloadAndInstallApk(
  apkUrl: string,
  onProgress?: (fraction: number) => void,
  apkSha256?: string,
) {
  if (!apkSha256) {
    return Promise.reject(new Error('Empreinte de la mise à jour absente : installation refusée.'));
  }
  return downloadAndInstallApkBase({
    apkUrl,
    fileName: APK_FILE_NAME,
    onProgress,
    expectedSha256: apkSha256,
    allowedUrlPrefix: releaseDownloadUrlPrefix(REPO),
  });
}
