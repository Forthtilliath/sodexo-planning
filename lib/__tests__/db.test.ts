import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  deleteScan,
  exportAllData,
  getCodeSchedules,
  getEmployeeRoster,
  getScans,
  getSettings,
  getTeamGroups,
  importAllData,
  saveEmployeeRoster,
  saveScan,
  saveSettings,
  saveTeamGroups,
} from '@/lib/db';
import type { ScanRecord } from '@/types';

const scan: ScanRecord = {
  id: 'scan-1',
  year: 2026,
  month: 7,
  createdAt: 1,
  days: ['2026-07-01', '2026-07-02'],
  employees: ['Moi'],
  grid: [['D1', 'X']],
  holidays: ['2026-07-02'],
};

describe('saveScan / getScans', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('conserve les jours fériés après enregistrement', async () => {
    await saveScan(scan);
    const scans = await getScans();

    expect(scans).toHaveLength(1);
    expect(scans[0].holidays).toEqual(['2026-07-02']);
  });

  it('met à jour les jours fériés quand on ré-enregistre le même planning (id identique)', async () => {
    await saveScan(scan);
    await saveScan({ ...scan, holidays: ['2026-07-01', '2026-07-02'] });
    const scans = await getScans();

    expect(scans).toHaveLength(1);
    expect(scans[0].holidays).toEqual(['2026-07-01', '2026-07-02']);
  });

  it('supprime uniquement le planning ciblé', async () => {
    await saveScan(scan);
    await saveScan({ ...scan, id: 'scan-2', month: 8 });

    await deleteScan('scan-1');
    const scans = await getScans();

    expect(scans).toHaveLength(1);
    expect(scans[0].id).toBe('scan-2');
  });

  it('ne fait rien si l\'id à supprimer est inconnu', async () => {
    await saveScan(scan);

    await deleteScan('inconnu');
    const scans = await getScans();

    expect(scans).toHaveLength(1);
  });
});

describe('getSettings / saveSettings', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("renvoie des réglages par défaut (vides) tant que rien n'a été sauvegardé", async () => {
    expect(await getSettings()).toEqual({});
  });

  it('conserve les réglages après enregistrement, y compris les rappels', async () => {
    await saveSettings({ remindersEnabled: true, reminderHour: 20 });
    expect(await getSettings()).toEqual({ remindersEnabled: true, reminderHour: 20 });
  });
});

describe('getTeamGroups', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('renvoie les groupes par défaut tant que rien n\'a été sauvegardé', async () => {
    const groups = await getTeamGroups();
    expect(groups.length).toBeGreaterThan(0);
    expect(groups.find((g) => g.id === 'e1-e3')?.color).toBe('#c9a227');
  });

  it('marque les variantes week-end (F1-F5) comme telles par défaut', async () => {
    const groups = await getTeamGroups();
    expect(groups.find((g) => g.id === 'f1-f3')?.weekendVariant).toBe(true);
    expect(groups.find((g) => g.id === 'f4-f5')?.weekendVariant).toBe(true);
    expect(groups.find((g) => g.id === 'c6-c8')?.weekendVariant).toBeUndefined();
  });

  it('conserve weekendVariant après enregistrement (groupes éditables)', async () => {
    const groups = await getTeamGroups();
    const edited = groups.map((g) => (g.id === 'e1-e3' ? { ...g, weekendVariant: true } : g));
    await saveTeamGroups(edited);

    const reloaded = await getTeamGroups();
    expect(reloaded.find((g) => g.id === 'e1-e3')?.weekendVariant).toBe(true);
  });

  it("rattrape weekendVariant sur F1-F5 pour une sauvegarde faite avant son ajout, sans écraser un choix explicite", async () => {
    // Simule une sauvegarde antérieure à l'ajout du champ : F1-F3 sans
    // weekendVariant, et E1-E3 explicitement à false (jamais écrasé).
    const groups = await getTeamGroups();
    const legacy = groups.map((g) => {
      if (g.id === 'f1-f3') {
        const { weekendVariant, ...rest } = g;
        void weekendVariant;
        return rest;
      }
      return g.id === 'e1-e3' ? { ...g, weekendVariant: false } : g;
    });
    await saveTeamGroups(legacy);

    const reloaded = await getTeamGroups();
    expect(reloaded.find((g) => g.id === 'f1-f3')?.weekendVariant).toBe(true);
    expect(reloaded.find((g) => g.id === 'e1-e3')?.weekendVariant).toBe(false);
  });

  it('conserve une couleur modifiée après enregistrement (groupes éditables)', async () => {
    const groups = await getTeamGroups();
    const edited = groups.map((g) => (g.id === 'e1-e3' ? { ...g, color: '#000000' } : g));
    await saveTeamGroups(edited);

    const reloaded = await getTeamGroups();
    expect(reloaded.find((g) => g.id === 'e1-e3')?.color).toBe('#000000');
  });

  it('conserve un libellé modifié après enregistrement (groupes éditables)', async () => {
    const groups = await getTeamGroups();
    const edited = groups.map((g) => (g.id === 'e1-e3' ? { ...g, label: 'E1-E3' } : g));
    await saveTeamGroups(edited);

    const reloaded = await getTeamGroups();
    expect(reloaded.find((g) => g.id === 'e1-e3')?.label).toBe('E1-E3');
  });
});

describe('getEmployeeRoster', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('renvoie la liste par défaut tant que rien n\'a été sauvegardé', async () => {
    const roster = await getEmployeeRoster();
    expect(roster.length).toBeGreaterThan(0);
    expect(roster.every((r) => r.active === true)).toBe(true);
  });

  it("migre l'ancien format (string[]) vers { name, active } sans perte", async () => {
    await AsyncStorage.setItem('@rn-planning/roster', JSON.stringify(['Alice', 'Bob']));
    const roster = await getEmployeeRoster();
    expect(roster).toEqual([
      { name: 'Alice', active: true },
      { name: 'Bob', active: true },
    ]);
  });

  it('conserve le statut actif/inactif après enregistrement', async () => {
    await saveEmployeeRoster([{ name: 'Alice', active: false }]);
    expect(await getEmployeeRoster()).toEqual([{ name: 'Alice', active: false }]);
  });

  it('conserve regular et groupId après enregistrement (pas perdus par la migration)', async () => {
    await saveEmployeeRoster([{ name: 'Alice', active: true, regular: false, groupId: 'chaine' }]);
    expect(await getEmployeeRoster()).toEqual([
      { name: 'Alice', active: true, regular: false, groupId: 'chaine' },
    ]);
  });
});

describe('exportAllData / importAllData', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('restaure exactement les données exportées (aller-retour sauvegarde/restauration)', async () => {
    await saveSettings({ remindersEnabled: true, reminderHour: 21 });
    await saveEmployeeRoster([{ name: 'Alice', active: true }]);
    await saveScan(scan);

    const backup = await exportAllData();
    expect(backup.version).toBe(1);

    // On simule une réinstallation : tout est effacé avant la restauration.
    await AsyncStorage.clear();
    expect(await getSettings()).toEqual({});

    await importAllData(backup);

    expect(await getSettings()).toEqual({ remindersEnabled: true, reminderHour: 21 });
    expect(await getEmployeeRoster()).toEqual([{ name: 'Alice', active: true }]);
    expect(await getScans()).toEqual([scan]);
    expect(await getCodeSchedules()).toEqual(backup.codeSchedules);
  });

  it('accepte une sauvegarde sans codeSchedules (ancien format) sans planter', async () => {
    const backup = await exportAllData();
    const { codeSchedules, ...legacyBackup } = backup;
    void codeSchedules;

    await AsyncStorage.clear();
    await importAllData(legacyBackup as typeof backup);

    // Les horaires par défaut restent disponibles, rien n'est écrasé par du vide.
    const schedules = await getCodeSchedules();
    expect(schedules.length).toBeGreaterThan(0);
  });
});
