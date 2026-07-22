import AsyncStorage from '@react-native-async-storage/async-storage';

import {
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
});

describe('getSettings / saveSettings', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("renvoie des réglages par défaut (nom vide) tant que rien n'a été sauvegardé", async () => {
    expect(await getSettings()).toEqual({ myName: '' });
  });

  it('conserve les réglages après enregistrement, y compris les rappels', async () => {
    await saveSettings({ myName: 'Moi', remindersEnabled: true, reminderHour: 20 });
    expect(await getSettings()).toEqual({ myName: 'Moi', remindersEnabled: true, reminderHour: 20 });
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

  it("réimpose la couleur par défaut du groupe même si une autre a été sauvegardée", async () => {
    const groups = await getTeamGroups();
    const tampered = groups.map((g) => (g.id === 'e1-e3' ? { ...g, color: '#000000' } : g));
    await saveTeamGroups(tampered);

    const reloaded = await getTeamGroups();
    expect(reloaded.find((g) => g.id === 'e1-e3')?.color).toBe('#c9a227');
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
});

describe('exportAllData / importAllData', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('restaure exactement les données exportées (aller-retour sauvegarde/restauration)', async () => {
    await saveSettings({ myName: 'Moi', remindersEnabled: true, reminderHour: 21 });
    await saveEmployeeRoster([{ name: 'Alice', active: true }]);
    await saveScan(scan);

    const backup = await exportAllData();
    expect(backup.version).toBe(1);

    // On simule une réinstallation : tout est effacé avant la restauration.
    await AsyncStorage.clear();
    expect(await getSettings()).toEqual({ myName: '' });

    await importAllData(backup);

    expect(await getSettings()).toEqual({ myName: 'Moi', remindersEnabled: true, reminderHour: 21 });
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
