import AsyncStorage from '@react-native-async-storage/async-storage';

import { saveScan, saveSettings } from '@/lib/db';
import type { ScanRecord } from '@/types';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
}));

import * as Notifications from 'expo-notifications';
import {
  BACKUP_REMINDER_INTERVAL_DAYS,
  DEFAULT_REMINDER_HOUR,
  cancelBackupReminder,
  cancelWorkReminders,
  requestNotificationPermission,
  rescheduleWorkReminders,
  scheduleBackupReminder,
} from '@/lib/notifications';

const scheduleMock = Notifications.scheduleNotificationAsync as jest.Mock;
const getAllScheduledMock = Notifications.getAllScheduledNotificationsAsync as jest.Mock;
const cancelScheduledMock = Notifications.cancelScheduledNotificationAsync as jest.Mock;
const getPermissionsMock = Notifications.getPermissionsAsync as jest.Mock;
const requestPermissionsMock = Notifications.requestPermissionsAsync as jest.Mock;

function makeScan(overrides: Partial<ScanRecord>): ScanRecord {
  return {
    id: 'scan-1',
    year: 2026,
    month: 7,
    createdAt: 0,
    days: [],
    employees: ['Moi'],
    grid: [[]],
    ...overrides,
  };
}

describe('rescheduleWorkReminders', () => {
  const NOW = new Date(2026, 6, 10, 10, 0, 0); // vendredi 10 juillet 2026, 10h00

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    getAllScheduledMock.mockResolvedValue([]);
    cancelScheduledMock.mockResolvedValue(undefined);
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('programme un rappel la veille à 19h pour un jour travaillé à venir', async () => {
    await saveSettings({ myName: 'Moi' });
    await saveScan(makeScan({ days: ['2026-07-15'], grid: [['D1']] }));

    await rescheduleWorkReminders();

    expect(scheduleMock).toHaveBeenCalledTimes(1);
    const [{ identifier, content, trigger }] = scheduleMock.mock.calls[0];
    expect(identifier).toBe('work-reminder-scan-1-0');
    expect(content.body).toBe('Poste : D1');
    expect(trigger.type).toBe('date');
    expect(trigger.date).toEqual(new Date(2026, 6, 14, DEFAULT_REMINDER_HOUR, 0, 0, 0));
  });

  it('mentionne les coéquipiers du même groupe dans le corps de la notification', async () => {
    await saveSettings({ myName: 'Moi' });
    // D1 et D2 font partie du même groupe par défaut (voir DEFAULT_TEAM_GROUPS dans lib/db.ts).
    await saveScan(
      makeScan({ days: ['2026-07-15'], employees: ['Moi', 'Coéquipier'], grid: [['D1'], ['D2']] })
    );

    await rescheduleWorkReminders();

    const [{ content }] = scheduleMock.mock.calls[0];
    expect(content.body).toBe('Poste : D1 · Avec Coéquipier');
  });

  it("n'ajoute rien après le poste s'il n'y a pas de coéquipier", async () => {
    await saveSettings({ myName: 'Moi' });
    await saveScan(makeScan({ days: ['2026-07-15'], grid: [['D1']] }));

    await rescheduleWorkReminders();

    const [{ content }] = scheduleMock.mock.calls[0];
    expect(content.body).toBe('Poste : D1');
  });

  it("utilise l'heure configurée dans les réglages plutôt que l'heure par défaut", async () => {
    await saveSettings({ myName: 'Moi', reminderHour: 21 });
    await saveScan(makeScan({ days: ['2026-07-15'], grid: [['D1']] }));

    await rescheduleWorkReminders();

    const [{ trigger }] = scheduleMock.mock.calls[0];
    expect(trigger.date).toEqual(new Date(2026, 6, 14, 21, 0, 0, 0));
  });

  it("programme quand même le rappel si l'heure de la veille (même jour) n'est pas encore passée", async () => {
    // "now" est le 10 juillet à 10h : le rappel pour un jour travaillé le 11
    // tombe le 10 à 19h, donc plus tard aujourd'hui -> doit être programmé.
    await saveSettings({ myName: 'Moi' });
    await saveScan(makeScan({ days: ['2026-07-11'], grid: [['D1']] }));

    await rescheduleWorkReminders();

    expect(scheduleMock).toHaveBeenCalledTimes(1);
  });

  it('ne programme rien pour un jour sans code renseigné', async () => {
    await saveSettings({ myName: 'Moi' });
    await saveScan(makeScan({ days: ['2026-07-15'], grid: [['']] }));

    await rescheduleWorkReminders();

    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it("ne programme rien si le déclenchement est déjà passé", async () => {
    // Jour travaillé aujourd'hui : le rappel (la veille à 19h) est dans le passé.
    await saveSettings({ myName: 'Moi' });
    await saveScan(makeScan({ days: ['2026-07-10'], grid: [['D1']] }));

    await rescheduleWorkReminders();

    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it('ne programme rien au-delà de 60 jours', async () => {
    await saveSettings({ myName: 'Moi' });
    await saveScan(makeScan({ days: ['2026-09-20'], grid: [['D1']] })); // > 60 jours après le 10 juillet

    await rescheduleWorkReminders();

    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it("ne programme rien si mon nom ne correspond à aucune ligne du planning", async () => {
    await saveSettings({ myName: 'Quelqu’un d’autre' });
    await saveScan(makeScan({ days: ['2026-07-15'], grid: [['D1']] }));

    await rescheduleWorkReminders();

    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it('annule les anciens rappels de travail avant de reprogrammer, sans toucher au rappel de sauvegarde', async () => {
    await saveSettings({ myName: 'Moi' });
    await saveScan(makeScan({ days: ['2026-07-15'], grid: [['D1']] }));
    getAllScheduledMock.mockResolvedValue([
      { identifier: 'work-reminder-old-scan-0', content: {}, trigger: {} },
      { identifier: 'backup-reminder', content: {}, trigger: {} },
    ]);

    await rescheduleWorkReminders();

    expect(cancelScheduledMock).toHaveBeenCalledWith('work-reminder-old-scan-0');
    expect(cancelScheduledMock).not.toHaveBeenCalledWith('backup-reminder');
  });

  it('cumule les rappels de plusieurs plannings enregistrés', async () => {
    await saveSettings({ myName: 'Moi' });
    await saveScan(makeScan({ id: 'scan-1', days: ['2026-07-15'], grid: [['D1']] }));
    await saveScan(makeScan({ id: 'scan-2', days: ['2026-07-16'], grid: [['C2']] }));

    await rescheduleWorkReminders();

    expect(scheduleMock).toHaveBeenCalledTimes(2);
  });
});

describe('cancelWorkReminders', () => {
  it('annule uniquement les notifications de rappel de travail', async () => {
    jest.clearAllMocks();
    getAllScheduledMock.mockResolvedValue([
      { identifier: 'work-reminder-scan-1-0', content: {}, trigger: {} },
      { identifier: 'backup-reminder', content: {}, trigger: {} },
    ]);

    await cancelWorkReminders();

    expect(cancelScheduledMock).toHaveBeenCalledTimes(1);
    expect(cancelScheduledMock).toHaveBeenCalledWith('work-reminder-scan-1-0');
  });
});

describe('scheduleBackupReminder / cancelBackupReminder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cancelScheduledMock.mockResolvedValue(undefined);
  });

  it('programme un rappel récurrent avec un identifiant fixe', async () => {
    await scheduleBackupReminder();

    expect(cancelScheduledMock).toHaveBeenCalledWith('backup-reminder');
    expect(scheduleMock).toHaveBeenCalledTimes(1);
    const [{ identifier, trigger }] = scheduleMock.mock.calls[0];
    expect(identifier).toBe('backup-reminder');
    expect(trigger).toEqual({
      type: 'timeInterval',
      seconds: BACKUP_REMINDER_INTERVAL_DAYS * 24 * 60 * 60,
      repeats: true,
    });
  });

  it('annule le rappel de sauvegarde par son identifiant', async () => {
    await cancelBackupReminder();
    expect(cancelScheduledMock).toHaveBeenCalledWith('backup-reminder');
  });
});

describe('requestNotificationPermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renvoie true sans redemander si déjà accordée', async () => {
    getPermissionsMock.mockResolvedValue({ granted: true });

    const granted = await requestNotificationPermission();

    expect(granted).toBe(true);
    expect(requestPermissionsMock).not.toHaveBeenCalled();
  });

  it("redemande la permission si elle n'est pas encore accordée, et renvoie le résultat", async () => {
    getPermissionsMock.mockResolvedValue({ granted: false });
    requestPermissionsMock.mockResolvedValue({ granted: true });

    const granted = await requestNotificationPermission();

    expect(granted).toBe(true);
    expect(requestPermissionsMock).toHaveBeenCalledTimes(1);
  });

  it('renvoie false si la permission est refusée', async () => {
    getPermissionsMock.mockResolvedValue({ granted: false });
    requestPermissionsMock.mockResolvedValue({ granted: false });

    expect(await requestNotificationPermission()).toBe(false);
  });
});
