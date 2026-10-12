import { shareTextFile } from '@forthtilliath/react-native-kit/utils/helpers/shareTextFile';

/** "2026, 7, D2 Person" -> "sodexo-planning-202607-D2-Person.ics" (espaces remplacés par des tirets). */
export function buildIcsFilename(year: number, month: number, employeeName: string): string {
  const yearMonth = `${year}${String(month).padStart(2, '0')}`;
  const slug = employeeName.trim().replace(/\s+/g, '-');
  return `sodexo-planning-${yearMonth}-${slug}.ics`;
}

/** Écrit le contenu .ics dans le cache et ouvre le partage natif pour l'importer dans un agenda. */
export function shareIcs(filename: string, content: string): Promise<void> {
  return shareTextFile(filename, content, { mimeType: 'text/calendar', dialogTitle: 'Exporter le planning' });
}
