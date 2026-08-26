/** Identifiant local simple (horodatage + suffixe aléatoire), pas besoin d'unicité cryptographique ici. */
export function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
