import { createRef } from 'react';
import { Alert, Platform, type View } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn() }));

jest.mock('@/lib/exportIcs', () => ({
  buildIcsFilename: jest.fn(() => 'planning.ics'),
  shareIcs: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/exportImage', () => ({
  savePlanningImage: jest.fn(),
  sharePlanningImage: jest.fn(),
}));

jest.mock('@/lib/calendarSync', () => ({
  syncPlanningToCalendar: jest.fn(),
}));

import PlanningExportActions from '@/components/PlanningExportActions';
import { syncPlanningToCalendar } from '@/lib/calendarSync';
import { shareIcs } from '@/lib/exportIcs';
import type { ScanRecord } from '@/types';

const syncMock = syncPlanningToCalendar as jest.Mock;
const shareIcsMock = shareIcs as jest.Mock;

const SYNC_LABEL = '📅 Synchroniser avec mon agenda';

const scan: ScanRecord = {
  id: 'scan-1',
  year: 2026,
  month: 7,
  createdAt: 0,
  days: ['2026-07-01', '2026-07-02'],
  employees: ['Moi', 'Alice'],
  grid: [
    ['D1', 'D1'],
    ['D2', ''],
  ],
};

function renderActions(isColleague: boolean) {
  return render(
    <PlanningExportActions
      scan={scan}
      groups={[]}
      schedules={[]}
      rowIndex={isColleague ? 1 : 0}
      isColleague={isColleague}
      captureAreaRef={createRef<View>()}
    />
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(Platform, 'OS', 'android');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('PlanningExportActions', () => {
  it('propose la synchro directe pour mon planning, en plus du .ics', async () => {
    await renderActions(false);
    expect(screen.getByText(SYNC_LABEL)).toBeTruthy();
    expect(screen.getByText('📤 Exporter en fichier agenda (.ics)')).toBeTruthy();
  });

  it("ne propose que le .ics pour le planning d'un/une collègue", async () => {
    await renderActions(true);
    expect(screen.queryByText(SYNC_LABEL)).toBeNull();
    expect(screen.getByText('📤 Exporter le planning de Alice (.ics)')).toBeTruthy();
  });

  it("ne propose pas la synchro directe hors Android", async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await renderActions(false);
    expect(screen.queryByText(SYNC_LABEL)).toBeNull();
  });

  it('confirme le nombre de jours écrits dans l’agenda', async () => {
    syncMock.mockResolvedValue({ status: 'done', count: 2 });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderActions(false);

    await fireEvent.press(screen.getByText(SYNC_LABEL));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Agenda mis à jour', expect.stringContaining('2 jours')));
  });

  it('explique quand le mois ne contient aucun jour travaillé', async () => {
    syncMock.mockResolvedValue({ status: 'done', count: 0 });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderActions(false);

    await fireEvent.press(screen.getByText(SYNC_LABEL));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Agenda mis à jour', expect.stringContaining('Aucun jour travaillé'))
    );
  });

  it("propose l'export .ics quand l'accès à l'agenda est refusé", async () => {
    syncMock.mockResolvedValue({ status: 'denied' });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.text === 'Exporter en .ics')?.onPress?.();
    });
    await renderActions(false);

    await fireEvent.press(screen.getByText(SYNC_LABEL));

    await waitFor(() => expect(shareIcsMock).toHaveBeenCalledTimes(1));
    expect(alertSpy).toHaveBeenCalledWith('Accès à l’agenda refusé', expect.any(String), expect.any(Array));
  });
});
