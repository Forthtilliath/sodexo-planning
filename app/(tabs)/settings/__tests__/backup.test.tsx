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
  BACKUP_REMINDER_INTERVAL_DAYS: 14,
  requestNotificationPermission: jest.fn(),
  scheduleBackupReminder: jest.fn(),
  cancelBackupReminder: jest.fn(),
}));

jest.mock('@/lib/backup', () => ({
  shareBackup: jest.fn(),
  pickAndImportBackup: jest.fn(),
}));

import BackupScreen from '@/app/(tabs)/settings/backup';
import * as backupLib from '@/lib/backup';
import { getSettings } from '@/lib/db';
import * as notificationsLib from '@/lib/notifications';

const requestPermissionMock = notificationsLib.requestNotificationPermission as jest.Mock;
const scheduleBackupReminderMock = notificationsLib.scheduleBackupReminder as jest.Mock;
const cancelBackupReminderMock = notificationsLib.cancelBackupReminder as jest.Mock;
const shareBackupMock = backupLib.shareBackup as jest.Mock;
const pickAndImportBackupMock = backupLib.pickAndImportBackup as jest.Mock;

describe('BackupScreen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('affiche les boutons export/import et le rappel désactivé par défaut', async () => {
    await render(<BackupScreen />);

    expect(await screen.findByText('⬆️ Exporter')).toBeTruthy();
    expect(screen.getByText('⬇️ Importer')).toBeTruthy();
    expect(screen.getByText('🔔 Rappel de sauvegarde')).toBeTruthy();
  });

  it('exporte via shareBackup au clic sur "Exporter"', async () => {
    await render(<BackupScreen />);

    await fireEvent.press(await screen.findByText('⬆️ Exporter'));

    expect(shareBackupMock).toHaveBeenCalledTimes(1);
  });

  it("affiche une alerte si l'export échoue", async () => {
    shareBackupMock.mockRejectedValue(new Error('disque plein'));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    await render(<BackupScreen />);
    await fireEvent.press(await screen.findByText('⬆️ Exporter'));

    expect(alertSpy).toHaveBeenCalledWith("Échec de l'export", 'disque plein');
    alertSpy.mockRestore();
  });

  it("demande confirmation avant d'importer, puis restaure si confirmé", async () => {
    pickAndImportBackupMock.mockResolvedValue({ restored: ['les salariés'] });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const confirmButton = buttons?.find((b) => b.text === 'Choisir un fichier');
      confirmButton?.onPress?.();
    });

    await render(<BackupScreen />);
    await fireEvent.press(await screen.findByText('⬇️ Importer'));

    expect(pickAndImportBackupMock).toHaveBeenCalledTimes(1);
    alertSpy.mockRestore();
  });

  it('exporte seulement les catégories encore cochées', async () => {
    await render(<BackupScreen />);

    await fireEvent(await screen.findByLabelText('Les plannings'), 'valueChange', false);
    await fireEvent.press(screen.getByText('⬆️ Exporter'));

    expect(shareBackupMock).toHaveBeenCalledWith(
      expect.objectContaining({ settings: true, employees: true, groups: true, plannings: false })
    );
  });

  it('active le rappel de sauvegarde quand la permission est accordée', async () => {
    requestPermissionMock.mockResolvedValue(true);

    await render(<BackupScreen />);
    const toggleLabel = await screen.findByText('🔔 Rappel de sauvegarde');
    await fireEvent.press(toggleLabel);

    expect(scheduleBackupReminderMock).toHaveBeenCalledTimes(1);
    expect((await getSettings()).backupReminderEnabled).toBe(true);
  });

  it('ne programme rien si la permission est refusée', async () => {
    requestPermissionMock.mockResolvedValue(false);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    await render(<BackupScreen />);
    const toggleLabel = await screen.findByText('🔔 Rappel de sauvegarde');
    await fireEvent.press(toggleLabel);

    expect(scheduleBackupReminderMock).not.toHaveBeenCalled();
    expect((await getSettings()).backupReminderEnabled).not.toBe(true);
    alertSpy.mockRestore();
  });
});
