import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { exportAllData, importAllData, type BackupData } from './db';
import { timestampCompact } from './dates';

function isValidBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    d.version === 1 &&
    typeof d.settings === 'object' &&
    Array.isArray(d.teamGroups) &&
    Array.isArray(d.roster) &&
    typeof d.codeOptions === 'object' &&
    Array.isArray(d.scans)
  );
}

/** "2026-07-22T09:38:00" -> "sodexo-planning-sauvegarde-20260722093800.json". */
export function buildBackupFilename(date = new Date()): string {
  return `sodexo-planning-sauvegarde-${timestampCompact(date)}.json`;
}

/** Exporte toutes les données de l'app dans un fichier JSON et ouvre le partage natif (mail, Drive, fichiers...). */
export async function shareBackup(): Promise<void> {
  const data = await exportAllData();
  const filename = buildBackupFilename();
  const file = new File(Paths.cache, filename);
  if (file.exists) {
    file.delete();
  }
  file.create({ overwrite: true });
  file.write(JSON.stringify(data, null, 2));

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Le partage n'est pas disponible sur cet appareil.");
  }
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Exporter mes données' });
}

/** Ouvre le sélecteur de fichier système, lit le JSON choisi et remplace toutes les données locales. */
export async function pickAndImportBackup(): Promise<boolean> {
  const picked = await File.pickFileAsync({ mimeTypes: 'application/json' });
  if (picked.canceled) return false;

  const raw = await picked.result.text();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Ce fichier n\'est pas un JSON valide.');
  }
  if (!isValidBackup(data)) {
    throw new Error("Ce fichier ne semble pas être une sauvegarde valide de l'app.");
  }
  await importAllData(data);
  return true;
}
