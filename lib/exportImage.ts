import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';

/** "2026, 7, D2 Person" -> "sodexo-planning-202607-D2-Person.png" (espaces remplacés par des tirets). */
export function buildImageFilename(year: number, month: number, employeeName: string): string {
  const yearMonth = `${year}${String(month).padStart(2, '0')}`;
  const slug = employeeName.trim().replace(/\s+/g, '-') || 'planning';
  return `sodexo-planning-${yearMonth}-${slug}.png`;
}

/** Demande la permission d'écriture puis enregistre le PNG capturé dans la galerie. */
export async function savePlanningImage(uri: string): Promise<void> {
  const perm = await requestPermissionsAsync(true);
  if (!perm.granted) {
    throw new Error("Autorise l'accès aux photos pour enregistrer l'image.");
  }
  await Asset.create(uri);
}

/** Ouvre le partage natif avec le PNG capturé. */
export async function sharePlanningImage(uri: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Le partage n'est pas disponible sur cet appareil.");
  }
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Partager le planning' });
}
