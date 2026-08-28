import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Mocks des modules natifs -------------------------------------------------

type MockFile = {
  dir: string;
  name: string;
  uri: string;
  exists: boolean;
  created: boolean;
  deleted: boolean;
  written: string | null;
};

jest.mock('expo-file-system', () => {
  const instances: MockFile[] = [];
  // Simule l'état réel du système de fichiers : `new File(uri)` reflète
  // l'existence d'un fichier déjà écrit à cette uri.
  const onDisk = new Set<string>();
  class File {
    dir: string;
    name: string;
    uri: string;
    created = false;
    deleted = false;
    written: string | null = null;
    static pickFileAsync = jest.fn();
    static __onDisk = onDisk;

    constructor(dir: string, name: string) {
      this.dir = dir;
      this.name = name;
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

import { File as MockFileClass, Paths as _Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const mockPickFileAsync = (MockFileClass as unknown as { pickFileAsync: jest.Mock }).pickFileAsync;
const mockShareAsync = Sharing.shareAsync as jest.Mock;
const mockIsAvailableAsync = Sharing.isAvailableAsync as jest.Mock;
const mockFileInstances = (jest.requireMock('expo-file-system') as { __instances: MockFile[] }).__instances;
void _Paths;

import {
  BACKUP_CATEGORY_LABELS,
  buildBackupFilename,
  pickAndImportBackup,
  shareBackup,
} from '@/lib/backup';
import { FULL_BACKUP_SELECTION, getEmployeeRoster, getScans, getSettings, saveScan, saveSettings } from '@/lib/db';
import type { BackupData } from '@/lib/db';

function fileTextResult(text: string) {
  return { canceled: false, result: { text: () => Promise.resolve(text) } };
}

/** Sauvegarde JSON complète et valide, telle qu'`exportAllData` la produit. */
function makeBackup(overrides: Partial<BackupData> = {}): BackupData {
  return {
    version: 1,
    exportedAt: 1,
    settings: { reminderHour: 21 },
    roster: [{ name: 'Alice', active: true }],
    codeOptions: { Alice: ['C2'] },
    teamGroups: [{ id: 'g', label: 'G', codes: ['C2'] }],
    codeSchedules: [{ codes: ['C2'], start: '06:45', end: '14:45' }],
    scans: [],
    ...overrides,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockFileInstances.length = 0;
  (MockFileClass as unknown as { __onDisk: Set<string> }).__onDisk.clear();
  mockIsAvailableAsync.mockResolvedValue(true);
  mockShareAsync.mockResolvedValue(undefined);
});

describe('buildBackupFilename', () => {
  it('formate "sodexo-planning-sauvegarde-YYYYMMDDHHMMSS.json"', () => {
    const date = new Date(2026, 6, 22, 9, 38, 0); // 22 juillet 2026, 09:38:00
    expect(buildBackupFilename(date)).toBe('sodexo-planning-sauvegarde-20260722093800.json');
  });

  it('utilise la date courante par défaut', () => {
    expect(buildBackupFilename()).toMatch(/^sodexo-planning-sauvegarde-\d{14}\.json$/);
  });
});

describe('BACKUP_CATEGORY_LABELS', () => {
  it('couvre exactement les quatre catégories triables', () => {
    expect(Object.keys(BACKUP_CATEGORY_LABELS).sort()).toEqual(
      ['employees', 'groups', 'plannings', 'settings'].sort()
    );
  });
});

describe('shareBackup', () => {
  it('écrit le JSON des catégories cochées dans le cache puis ouvre le partage natif', async () => {
    await saveSettings({ reminderHour: 21 });

    await shareBackup(FULL_BACKUP_SELECTION);

    const file = mockFileInstances.at(-1)!;
    expect(file.dir).toBe('file:///cache');
    expect(file.name).toMatch(/^sodexo-planning-sauvegarde-\d{14}\.json$/);
    expect(file.created).toBe(true);

    const written = JSON.parse(file.written!);
    expect(written.version).toBe(1);
    expect(written.settings).toEqual({ reminderHour: 21 });

    expect(mockShareAsync).toHaveBeenCalledWith(
      file.uri,
      expect.objectContaining({ mimeType: 'application/json' })
    );
  });

  it("n'exporte que les catégories cochées", async () => {
    await saveSettings({ reminderHour: 21 });

    await shareBackup({ settings: false, employees: true, groups: false, plannings: false });

    const written = JSON.parse(mockFileInstances.at(-1)!.written!);
    expect(written.settings).toBeUndefined();
    expect(written.roster).toBeDefined();
    expect(written.teamGroups).toBeUndefined();
    expect(written.scans).toBeUndefined();
  });

  it('supprime un fichier de cache homonyme déjà présent avant de réécrire', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 22, 9, 38, 0));
    try {
      // 1er export : le fichier n'existe pas encore, il est créé.
      await shareBackup(FULL_BACKUP_SELECTION);
      const first = mockFileInstances.at(-1)!;
      expect(first.deleted).toBe(false);
      expect(first.created).toBe(true);

      // 2e export à la même seconde -> même nom de fichier, déjà sur le disque.
      await shareBackup(FULL_BACKUP_SELECTION);
      const second = mockFileInstances.at(-1)!;
      expect(second.uri).toBe(first.uri);
      expect(second.deleted).toBe(true);
      expect(second.created).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('échoue explicitement si le partage est indisponible sur l\'appareil', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);

    await expect(shareBackup(FULL_BACKUP_SELECTION)).rejects.toThrow(/partage/i);
    expect(mockShareAsync).not.toHaveBeenCalled();
  });

  it('exporte toutes les catégories par défaut (sans argument)', async () => {
    await shareBackup();

    const written = JSON.parse(mockFileInstances.at(-1)!.written!);
    expect(written.settings).toBeDefined();
    expect(written.roster).toBeDefined();
    expect(written.teamGroups).toBeDefined();
    expect(written.scans).toBeDefined();
  });
});

describe('pickAndImportBackup', () => {
  it('renvoie null si l\'utilisateur annule le choix du fichier', async () => {
    mockPickFileAsync.mockResolvedValue({ canceled: true });

    expect(await pickAndImportBackup()).toBeNull();
  });

  it('rejette un fichier qui n\'est pas du JSON', async () => {
    mockPickFileAsync.mockResolvedValue(fileTextResult('pas du json {'));

    await expect(pickAndImportBackup()).rejects.toThrow(/JSON/i);
  });

  it('rejette un JSON valide qui n\'a pas la forme d\'une sauvegarde', async () => {
    mockPickFileAsync.mockResolvedValue(fileTextResult(JSON.stringify({ hello: 'world' })));

    await expect(pickAndImportBackup()).rejects.toThrow(/sauvegarde valide/i);
  });

  it('rejette une sauvegarde d\'une version inconnue', async () => {
    mockPickFileAsync.mockResolvedValue(fileTextResult(JSON.stringify({ ...makeBackup(), version: 2 })));

    await expect(pickAndImportBackup()).rejects.toThrow(/sauvegarde valide/i);
  });

  it('rejette une sauvegarde dont une catégorie présente a le mauvais type', async () => {
    mockPickFileAsync.mockResolvedValue(
      fileTextResult(JSON.stringify({ version: 1, exportedAt: 1, roster: 'pas un tableau' }))
    );

    await expect(pickAndImportBackup()).rejects.toThrow(/sauvegarde valide/i);
  });

  it('rejette quand aucune des catégories cochées ne figure dans le fichier', async () => {
    // Fichier ne contenant que les salariés...
    mockPickFileAsync.mockResolvedValue(
      fileTextResult(JSON.stringify({ version: 1, exportedAt: 1, roster: [{ name: 'Alice', active: true }] }))
    );

    // ...mais on ne coche que les réglages.
    await expect(
      pickAndImportBackup({ settings: true, employees: false, groups: false, plannings: false })
    ).rejects.toThrow(/aucune des catégories cochées/i);
  });

  it('restaure les catégories cochées et présentes, et renvoie leurs libellés', async () => {
    await saveSettings({ reminderHour: 8 });
    mockPickFileAsync.mockResolvedValue(fileTextResult(JSON.stringify(makeBackup())));

    const result = await pickAndImportBackup({
      settings: false,
      employees: true,
      groups: false,
      plannings: false,
    });

    expect(result).toEqual({ restored: ['les salariés'] });
    // Salariés remplacés...
    expect(await getEmployeeRoster()).toEqual([
      { name: 'Moi', active: true },
      { name: 'Alice', active: true },
    ]);
    // ...réglages laissés intacts (non cochés).
    expect(await getSettings()).toEqual({ reminderHour: 8 });
  });

  it('remplace effectivement les plannings existants par ceux du fichier', async () => {
    await saveScan({
      id: 'ancien',
      year: 2025,
      month: 1,
      createdAt: 0,
      days: [],
      employees: [],
      grid: [],
    });
    const scan = {
      id: 'importe',
      year: 2026,
      month: 7,
      createdAt: 1,
      days: ['2026-07-01'],
      employees: ['Moi'],
      grid: [['D1']],
      holidays: [],
    };
    mockPickFileAsync.mockResolvedValue(fileTextResult(JSON.stringify(makeBackup({ scans: [scan] }))));

    const result = await pickAndImportBackup({
      settings: false,
      employees: false,
      groups: false,
      plannings: true,
    });

    expect(result).toEqual({ restored: ['les plannings'] });
    expect(await getScans()).toEqual([scan]);
  });
});
