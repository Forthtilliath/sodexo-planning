jest.mock('expo-media-library', () => ({
  Asset: { create: jest.fn() },
  requestPermissionsAsync: jest.fn(),
}));

import { buildImageFilename } from '@/lib/exportImage';

describe('buildImageFilename', () => {
  it('formate "sodexo-planning-YYYYMM-nom-du-salarie.png" avec les espaces remplacés par des tirets', () => {
    expect(buildImageFilename(2026, 7, 'D2 Person')).toBe('sodexo-planning-202607-D2-Person.png');
  });

  it('remplace les espaces multiples par un seul tiret et retire les espaces en trop', () => {
    expect(buildImageFilename(2026, 7, '  Jean   Dupont  ')).toBe('sodexo-planning-202607-Jean-Dupont.png');
  });

  it('complète le mois sur deux chiffres', () => {
    expect(buildImageFilename(2026, 3, 'Moi')).toBe('sodexo-planning-202603-Moi.png');
  });

  it('retombe sur "planning" quand le nom est vide', () => {
    expect(buildImageFilename(2026, 1, '   ')).toBe('sodexo-planning-202601-planning.png');
  });
});
