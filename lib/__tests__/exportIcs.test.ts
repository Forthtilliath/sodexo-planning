type MockFile = { uri: string; created: boolean; deleted: boolean; written: string | null };

jest.mock('expo-file-system', () => {
  const instances: MockFile[] = [];
  const onDisk = new Set<string>();
  class File {
    uri: string;
    created = false;
    deleted = false;
    written: string | null = null;
    static __onDisk = onDisk;
    constructor(dir: string, name: string) {
      this.uri = `${dir}/${name}`;
      instances.push(this as unknown as MockFile);
    }
    get exists() {
      return onDisk.has(this.uri);
    }
    create() {
      this.created = true;
      onDisk.add(this.uri);
    }
    delete() {
      this.deleted = true;
      onDisk.delete(this.uri);
    }
    write(content: string) {
      this.written = content;
    }
  }
  return { File, Paths: { cache: 'file:///cache' }, __instances: instances };
});

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

import * as Sharing from 'expo-sharing';

import { buildIcsFilename, shareIcs } from '@/lib/exportIcs';

const mockShareAsync = Sharing.shareAsync as jest.Mock;
const mockIsAvailableAsync = Sharing.isAvailableAsync as jest.Mock;
const mockFileInstances = (jest.requireMock('expo-file-system') as { __instances: MockFile[] }).__instances;
const mockOnDisk = (jest.requireMock('expo-file-system') as { File: { __onDisk: Set<string> } }).File.__onDisk;

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

describe('shareIcs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFileInstances.length = 0;
    mockOnDisk.clear();
    mockIsAvailableAsync.mockResolvedValue(true);
    mockShareAsync.mockResolvedValue(undefined);
  });

  it('écrit le .ics dans le cache puis ouvre le partage natif', async () => {
    await shareIcs('planning.ics', 'BEGIN:VCALENDAR');

    const file = mockFileInstances.at(-1)!;
    expect(file.uri).toBe('file:///cache/planning.ics');
    expect(file.created).toBe(true);
    expect(file.written).toBe('BEGIN:VCALENDAR');
    expect(mockShareAsync).toHaveBeenCalledWith(
      file.uri,
      expect.objectContaining({ mimeType: 'text/calendar' })
    );
  });

  it('remplace un fichier homonyme déjà en cache', async () => {
    await shareIcs('planning.ics', 'v1');
    await shareIcs('planning.ics', 'v2');

    const second = mockFileInstances.at(-1)!;
    expect(second.deleted).toBe(true);
    expect(second.written).toBe('v2');
  });

  it('échoue explicitement si le partage est indisponible', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);

    await expect(shareIcs('planning.ics', 'x')).rejects.toThrow(/partage/i);
    expect(mockShareAsync).not.toHaveBeenCalled();
  });
});
