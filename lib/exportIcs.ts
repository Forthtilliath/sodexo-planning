import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** "2026, 7, D2 Person" -> "sodexo-planning-202607-D2-Person.ics" (espaces remplacés par des tirets). */
export function buildIcsFilename(year: number, month: number, employeeName: string): string {
  const yearMonth = `${year}${String(month).padStart(2, '0')}`;
  const slug = employeeName.trim().replace(/\s+/g, '-');
  return `sodexo-planning-${yearMonth}-${slug}.ics`;
}

/** Écrit le contenu .ics dans le cache et ouvre le partage natif pour l'importer dans un agenda. */
export async function shareIcs(filename: string, content: string): Promise<void> {
  const file = new File(Paths.cache, filename);
  if (file.exists) {
    file.delete();
  }
  file.create({ overwrite: true });
  file.write(content);

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Le partage n'est pas disponible sur cet appareil.");
  }
  await Sharing.shareAsync(file.uri, { mimeType: 'text/calendar', dialogTitle: 'Exporter le planning' });
}
