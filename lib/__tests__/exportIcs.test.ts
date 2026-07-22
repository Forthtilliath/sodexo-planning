import { buildIcsFilename } from '@/lib/exportIcs';

describe('buildIcsFilename', () => {
  it('formate "sodexo-planning-YYYYMM-nom-du-salarie.ics" avec les espaces remplacés par des tirets', () => {
    expect(buildIcsFilename(2026, 7, 'D2 Person')).toBe('sodexo-planning-202607-D2-Person.ics');
  });

  it('remplace les espaces multiples par un seul tiret et retire les espaces en trop', () => {
    expect(buildIcsFilename(2026, 7, '  Jean   Dupont  ')).toBe('sodexo-planning-202607-Jean-Dupont.ics');
  });

  it('complète le mois sur deux chiffres', () => {
    expect(buildIcsFilename(2026, 3, 'Moi')).toBe('sodexo-planning-202603-Moi.ics');
  });

  it("utilise le mois et l'année du planning, pas la date courante", () => {
    // Peu importe quand ce test tourne, le nom de fichier doit rester figé sur 2024-01.
    expect(buildIcsFilename(2024, 1, 'Moi')).toBe('sodexo-planning-202401-Moi.ics');
  });
});
