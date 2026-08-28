jest.mock('expo-media-library', () => ({
  Asset: { create: jest.fn() },
  requestPermissionsAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';

import { buildImageFilename, savePlanningImage, sharePlanningImage } from '@/lib/exportImage';

const mockAssetCreate = Asset.create as jest.Mock;
const mockRequestPermissions = requestPermissionsAsync as jest.Mock;
const mockShareAsync = Sharing.shareAsync as jest.Mock;
const mockIsAvailableAsync = Sharing.isAvailableAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

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

describe('savePlanningImage', () => {
  it("enregistre l'image dans la galerie quand la permission est accordée", async () => {
    mockRequestPermissions.mockResolvedValue({ granted: true });

    await savePlanningImage('file:///tmp/capture.png');

    expect(mockRequestPermissions).toHaveBeenCalledWith(true);
    expect(mockAssetCreate).toHaveBeenCalledWith('file:///tmp/capture.png');
  });

  it("échoue explicitement et n'écrit rien si la permission est refusée", async () => {
    mockRequestPermissions.mockResolvedValue({ granted: false });

    await expect(savePlanningImage('file:///tmp/capture.png')).rejects.toThrow(/photos/i);
    expect(mockAssetCreate).not.toHaveBeenCalled();
  });
});

describe('sharePlanningImage', () => {
  it('ouvre le partage natif avec le PNG capturé', async () => {
    mockIsAvailableAsync.mockResolvedValue(true);
    mockShareAsync.mockResolvedValue(undefined);

    await sharePlanningImage('file:///tmp/capture.png');

    expect(mockShareAsync).toHaveBeenCalledWith(
      'file:///tmp/capture.png',
      expect.objectContaining({ mimeType: 'image/png' })
    );
  });

  it('échoue explicitement si le partage est indisponible', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);

    await expect(sharePlanningImage('file:///tmp/capture.png')).rejects.toThrow(/partage/i);
    expect(mockShareAsync).not.toHaveBeenCalled();
  });
});
