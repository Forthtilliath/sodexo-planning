import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      React.useEffect(() => {
        return callback();
      }, []);
    },
  };
});

jest.mock('@/lib/notifications', () => ({
  DEFAULT_REMINDER_HOUR: 19,
  requestNotificationPermission: jest.fn(),
  rescheduleWorkReminders: jest.fn(),
  cancelWorkReminders: jest.fn(),
}));

import NotificationsScreen from '@/app/(tabs)/settings/notifications';
import { getSettings, saveSettings } from '@/lib/db';
import * as notificationsLib from '@/lib/notifications';

const requestPermissionMock = notificationsLib.requestNotificationPermission as jest.Mock;
const rescheduleMock = notificationsLib.rescheduleWorkReminders as jest.Mock;
const cancelMock = notificationsLib.cancelWorkReminders as jest.Mock;

describe('NotificationsScreen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('affiche 19h par défaut, rappel désactivé', async () => {
    await render(<NotificationsScreen />);

    expect(await screen.findByText('Rappel la veille')).toBeTruthy();
    expect(screen.getByText('19h')).toBeTruthy();
  });

  it('reprend l\'heure déjà enregistrée dans les réglages', async () => {
    await saveSettings({ myName: '', reminderHour: 21 });

    await render(<NotificationsScreen />);

    expect(await screen.findByText('21h')).toBeTruthy();
  });

  it('active le rappel quand la permission est accordée', async () => {
    requestPermissionMock.mockResolvedValue(true);

    await render(<NotificationsScreen />);
    await fireEvent(await screen.findByRole('switch'), 'valueChange', true);

    expect(rescheduleMock).toHaveBeenCalledTimes(1);
    expect((await getSettings()).remindersEnabled).toBe(true);
  });

  it('refuse et alerte si la permission est refusée', async () => {
    requestPermissionMock.mockResolvedValue(false);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    await render(<NotificationsScreen />);
    await fireEvent(await screen.findByRole('switch'), 'valueChange', true);

    expect(rescheduleMock).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('désactive le rappel et annule les notifications', async () => {
    await saveSettings({ myName: '', remindersEnabled: true });

    await render(<NotificationsScreen />);
    await fireEvent(await screen.findByRole('switch'), 'valueChange', false);

    expect(cancelMock).toHaveBeenCalledTimes(1);
    expect((await getSettings()).remindersEnabled).toBe(false);
  });

  it("change l'heure du rappel via le sélecteur et reprogramme si activé", async () => {
    await saveSettings({ myName: '', remindersEnabled: true });

    await render(<NotificationsScreen />);
    await fireEvent.press(await screen.findByText('19h'));
    await fireEvent.press(await screen.findByText('22h'));

    expect((await getSettings()).reminderHour).toBe(22);
    expect(rescheduleMock).toHaveBeenCalledTimes(1);
  });
});
