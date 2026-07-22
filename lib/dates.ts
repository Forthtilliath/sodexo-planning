/** Index du jour de la semaine avec lundi = 0 ... dimanche = 6 (au lieu du dimanche = 0 par défaut de JS). */
export function mondayFirstWeekday(iso: string): number {
  const jsDay = new Date(`${iso}T00:00:00`).getDay();
  return (jsDay + 6) % 7;
}

export function dayNumber(iso: string): number {
  return new Date(`${iso}T00:00:00`).getDate();
}

/** Horodatage compact YYYYMMDDHHMMSS (heure locale), utilisé dans les noms de fichiers exportés. */
export function timestampCompact(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}
