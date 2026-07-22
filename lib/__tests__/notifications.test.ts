import AsyncStorage from '@react-native-async-storage/async-storage';

import { saveScan, saveSettings } from '@/lib/db';
import type { ScanRecord } from '@/types';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

import * as Notifications from 'expo-notifications';
import {
  DEFAULT_REMINDER_HOUR,
  cancelWorkReminders,
  requestNotificationPermission,
  rescheduleWorkReminders,
} from '@/lib/notifications';

const scheduleMock = Notifications.scheduleNotificationAsync as jest.Mock;
const cancelAllMock = Notifications.cancelAllScheduledNotificationsAsync as jest.Mock;
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
    const [{ content, trigger }] = scheduleMock.mock.calls[0];
    expect(content.body).toBe('Poste : D1');
    expect(trigger.type).toBe('date');
    expect(trigger.date).toEqual(new Date(2026, 6, 14, DEFAULT_REMINDER_HOUR, 0, 0, 0));
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

  it('annule les rappels existants avant de reprogrammer', async () => {
    await saveSettings({ myName: 'Moi' });
    await saveScan(makeScan({ days: ['2026-07-15'], grid: [['D1']] }));

    await rescheduleWorkReminders();

    expect(cancelAllMock).toHaveBeenCalledTimes(1);
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
  it('annule toutes les notifications programmées', async () => {
    jest.clearAllMocks();
    await cancelWorkReminders();
    expect(cancelAllMock).toHaveBeenCalledTimes(1);
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
