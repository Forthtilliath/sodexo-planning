import * as Calendar from 'expo-calendar';

import { syncPlanningToCalendar, toNativeEventDetails } from '@/lib/calendarSync';
import type { ScanRecord, TeamGroup } from '@/types';

jest.mock('expo-calendar', () => ({
  EntityTypes: { EVENT: 'event' },
  CalendarAccessLevel: { OWNER: 'owner' },
  requestCalendarPermissions: jest.fn(),
  getCalendars: jest.fn(),
  createCalendar: jest.fn(),
}));

const mocked = Calendar as jest.Mocked<typeof Calendar>;

const groups: TeamGroup[] = [{ id: 'd1-d4', label: 'D1-D4', codes: ['D1', 'D2', 'D3', 'D4'] }];

const scan: ScanRecord = {
  id: 'scan-1',
  year: 2026,
  month: 7,
  createdAt: 0,
  days: ['2026-07-01', '2026-07-02', '2026-07-03'],
  employees: ['Moi', 'D2 Person'],
  grid: [
    ['D1', 'X', ''],
    ['D2', 'X', 'D2'],
  ],
};

function fakeCalendar(existingEvents: { delete: jest.Mock }[] = []) {
  return {
    name: 'sodexo-planning',
    listEvents: jest.fn().mockResolvedValue(existingEvents),
    createEvent: jest.fn().mockResolvedValue({}),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('toNativeEventDetails', () => {
  it('place une journée entière à minuit UTC avec le fuseau UTC (exigence Android)', () => {
    const details = toNativeEventDetails({ date: '2026-07-01', title: 'X', description: '' });
    expect(details.allDay).toBe(true);
    expect(details.timeZone).toBe('UTC');
    expect(details.startDate.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(details.endDate.toISOString()).toBe('2026-07-02T00:00:00.000Z');
  });

  it("utilise l'heure locale et le fuseau de l'appareil quand l'horaire est connu", () => {
    const details = toNativeEventDetails(
      { date: '2026-07-01', title: 'D1', description: '', start: '08:00', end: '16:24' },
      'Europe/Paris'
    );
    expect(details.allDay).toBe(false);
    expect(details.timeZone).toBe('Europe/Paris');
    expect(details.startDate).toEqual(new Date(2026, 6, 1, 8, 0));
    expect(details.endDate).toEqual(new Date(2026, 6, 1, 16, 24));
  });

  it('termine le lendemain un horaire de nuit', () => {
    const details = toNativeEventDetails({ date: '2026-07-01', title: 'N', description: '', start: '20:00', end: '02:00' });
    expect(details.endDate).toEqual(new Date(2026, 6, 2, 2, 0));
  });
});

describe('syncPlanningToCalendar', () => {
  it("ne touche à rien si l'autorisation est refusée", async () => {
    mocked.requestCalendarPermissions.mockResolvedValue({ granted: false } as never);
    const result = await syncPlanningToCalendar(scan, groups, 0);
    expect(result).toEqual({ status: 'denied' });
    expect(mocked.getCalendars).not.toHaveBeenCalled();
  });

  it('crée le calendrier dédié au premier usage puis un évènement par jour avec un code', async () => {
    const calendar = fakeCalendar();
    mocked.requestCalendarPermissions.mockResolvedValue({ granted: true } as never);
    mocked.getCalendars.mockResolvedValue([]);
    mocked.createCalendar.mockResolvedValue(calendar as never);

    const result = await syncPlanningToCalendar(scan, groups, 0);

    expect(mocked.createCalendar).toHaveBeenCalledWith(expect.objectContaining({ name: 'sodexo-planning' }));
    expect(calendar.createEvent).toHaveBeenCalledTimes(2);
    expect(calendar.createEvent).toHaveBeenCalledWith(expect.objectContaining({ title: 'D1' }));
    expect(result).toEqual({ status: 'done', count: 2 });
  });

  it('réutilise le calendrier existant et supprime les anciens évènements du mois avant de réécrire', async () => {
    const old = [{ delete: jest.fn().mockResolvedValue(undefined) }, { delete: jest.fn().mockResolvedValue(undefined) }];
    const calendar = fakeCalendar(old);
    mocked.requestCalendarPermissions.mockResolvedValue({ granted: true } as never);
    mocked.getCalendars.mockResolvedValue([{ name: 'autre' }, calendar] as never);

    await syncPlanningToCalendar(scan, groups, 0);

    expect(mocked.createCalendar).not.toHaveBeenCalled();
    expect(calendar.listEvents).toHaveBeenCalledWith(new Date(2026, 6, 1), new Date(2026, 7, 1));
    old.forEach((e) => expect(e.delete).toHaveBeenCalled());
    expect(calendar.createEvent).toHaveBeenCalledTimes(2);
  });
});
