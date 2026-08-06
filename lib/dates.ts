/** Index du jour de la semaine avec lundi = 0 ... dimanche = 6 (au lieu du dimanche = 0 par défaut de JS). */
export function mondayFirstWeekday(iso: string): number {
  const jsDay = new Date(`${iso}T00:00:00`).getDay();
  return (jsDay + 6) % 7;
}

export function dayNumber(iso: string): number {
  return new Date(`${iso}T00:00:00`).getDate();
}

/** "2026-07-01" -> "mercredi 1", pour l'en-tête du détail d'un jour. */
export function formatFullDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  const weekday = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][date.getDay()];
  return `${weekday} ${date.getDate()}`;
}

/** true si la date ISO (YYYY-MM-DD) correspond au jour courant. */
export function isToday(iso: string): boolean {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return iso === todayIso;
}

/** Horodatage compact YYYYMMDDHHMMSS (heure locale), utilisé dans les noms de fichiers exportés. */
export function timestampCompact(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}
