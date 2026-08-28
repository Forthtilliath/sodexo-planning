import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import {
  exportAllData,
  FULL_BACKUP_SELECTION,
  importAllData,
  resolveImportedCategories,
  type BackupData,
  type BackupSelection,
} from './db';
import { timestampCompact } from './dates';

/** Libellés affichés pour chaque catégorie triable d'une sauvegarde. */
export const BACKUP_CATEGORY_LABELS: Record<keyof BackupSelection, string> = {
  employees: 'les salariés',
  groups: 'les groupes de postes',
  plannings: 'les plannings',
  settings: 'les réglages',
};

function isValidBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (d.version !== 1) return false;
  const isObject = (v: unknown) => typeof v === 'object' && v !== null && !Array.isArray(v);
  const checks: Array<[string, (v: unknown) => boolean]> = [
    ['settings', isObject],
    ['teamGroups', Array.isArray],
    ['roster', Array.isArray],
    ['codeOptions', isObject],
    ['codeSchedules', Array.isArray],
    ['scans', Array.isArray],
  ];
  let present = 0;
  for (const [key, ok] of checks) {
    if (d[key] === undefined) continue;
    if (!ok(d[key])) return false;
    present += 1;
  }
  // Un fichier valide contient au moins une catégorie de données.
  return present > 0;
}

/** "2026-07-22T09:38:00" -> "sodexo-planning-sauvegarde-20260722093800.json". */
export function buildBackupFilename(date = new Date()): string {
  return `sodexo-planning-sauvegarde-${timestampCompact(date)}.json`;
}

/** Exporte les catégories cochées dans un fichier JSON et ouvre le partage natif (mail, Drive, fichiers...). */
export async function shareBackup(selection: BackupSelection = FULL_BACKUP_SELECTION): Promise<void> {
  const data = await exportAllData(selection);
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

export type BackupImportResult = {
  /** Catégories réellement remplacées, sous forme de libellés (ex: "les salariés"). */
  restored: string[];
};

/**
 * Ouvre le sélecteur de fichier système, lit le JSON choisi et remplace les
 * catégories cochées (et présentes dans le fichier). Retourne `null` si
 * l'utilisateur annule le choix du fichier.
 */
export async function pickAndImportBackup(
  selection: BackupSelection = FULL_BACKUP_SELECTION
): Promise<BackupImportResult | null> {
  const picked = await File.pickFileAsync({ mimeTypes: 'application/json' });
  if (picked.canceled) return null;

  const raw = await picked.result.text();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Ce fichier n'est pas un JSON valide.");
  }
  if (!isValidBackup(data)) {
    throw new Error("Ce fichier ne semble pas être une sauvegarde valide de l'app.");
  }

  const categories = resolveImportedCategories(data, selection);
  if (categories.length === 0) {
    throw new Error('Aucune des catégories cochées ne figure dans ce fichier.');
  }

  await importAllData(data, selection);
  return { restored: categories.map((key) => BACKUP_CATEGORY_LABELS[key]) };
}
