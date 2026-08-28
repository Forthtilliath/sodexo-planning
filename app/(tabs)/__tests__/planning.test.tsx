import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockRouterPush = jest.fn();
const mockSetOptions = jest.fn();
const mockCaptureRef = jest.fn();

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    router: { push: (...a: unknown[]) => mockRouterPush(...a) },
    useNavigation: () => ({ setOptions: mockSetOptions }),
    useFocusEffect: (cb: () => void | (() => void)) => {
      React.useEffect(() => cb(), []);
    },
  };
});

jest.mock('react-native-view-shot', () => ({
  captureRef: (...a: unknown[]) => mockCaptureRef(...a),
}));

jest.mock('@/lib/exportIcs', () => ({
  buildIcsFilename: jest.fn(() => 'planning.ics'),
  shareIcs: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/exportImage', () => ({
  savePlanningImage: jest.fn().mockResolvedValue(undefined),
  sharePlanningImage: jest.fn().mockResolvedValue(undefined),
}));

import PlanningScreen from '@/app/(tabs)/planning';
import { shareIcs } from '@/lib/exportIcs';
import { savePlanningImage, sharePlanningImage } from '@/lib/exportImage';
import { saveScan } from '@/lib/db';
import type { ScanRecord } from '@/types';

const shareIcsMock = shareIcs as jest.Mock;
const savePlanningImageMock = savePlanningImage as jest.Mock;
const sharePlanningImageMock = sharePlanningImage as jest.Mock;

function makeScan(overrides: Partial<ScanRecord> = {}): ScanRecord {
  return {
    id: 'scan-1',
    year: 2026,
    month: 7,
    createdAt: 1,
    days: ['2026-07-01', '2026-07-02', '2026-07-03'],
    employees: ['Moi', 'Alice'],
    grid: [
      ['D1', 'D1', ''],
      ['D2', '', 'D2'],
    ],
    holidays: ['2026-07-02'],
    ...overrides,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockCaptureRef.mockResolvedValue('file:///tmp/planning.png');
});

describe('PlanningScreen', () => {
  it('affiche un état vide tant qu\'aucun planning n\'existe', async () => {
    await render(<PlanningScreen />);
    expect(await screen.findByText("Aucun planning pour l'instant.")).toBeTruthy();
  });

  it('affiche mon planning du mois en vue liste', async () => {
    await saveScan(makeScan());
    await render(<PlanningScreen />);

    expect((await screen.findAllByText('Juillet 2026')).length).toBeGreaterThan(0);
    expect(screen.getByText('📋 Liste')).toBeTruthy();
    // Les postes de "Moi" (ligne 0) : D1 les 1er et 3.
    expect(screen.getAllByText('D1').length).toBeGreaterThan(0);
    // Jour férié marqué.
    expect(screen.getByText('Férié')).toBeTruthy();
  });

  it('bascule en vue calendrier', async () => {
    await saveScan(makeScan());
    await render(<PlanningScreen />);

    await fireEvent.press(await screen.findByText('📅 Calendrier'));

    // La grille calendrier affiche les quantièmes.
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('exporte le planning en .ics', async () => {
    await saveScan(makeScan());
    await render(<PlanningScreen />);

    await fireEvent.press(await screen.findByText('📤 Exporter en agenda (.ics)'));

    await waitFor(() => expect(shareIcsMock).toHaveBeenCalledTimes(1));
    expect(shareIcsMock).toHaveBeenCalledWith('planning.ics', expect.stringContaining('BEGIN:VCALENDAR'));
  });

  it('propose enregistrer / partager pour le planning en image', async () => {
    await saveScan(makeScan());
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.text === 'Enregistrer')?.onPress?.();
    });
    await render(<PlanningScreen />);

    await fireEvent.press(await screen.findByText('🖼️ Planning en image'));

    await waitFor(() => expect(mockCaptureRef).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(savePlanningImageMock).toHaveBeenCalledWith('file:///tmp/planning.png'));
    expect(sharePlanningImageMock).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('laisse choisir sa ligne quand aucune ne porte mon nom', async () => {
    await saveScan(makeScan({ employees: ['Alice', 'Bob'] }));
    await render(<PlanningScreen />);

    expect(await screen.findByText(/Aucune ligne "Moi" dans ce planning/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Bob'));

    // Après sélection, la vue du planning s'affiche (bouton d'export visible).
    expect(await screen.findByText('📤 Exporter en agenda (.ics)')).toBeTruthy();
  });

  it('permet de consulter le planning d\'un collègue', async () => {
    await saveScan(makeScan());
    await render(<PlanningScreen />);

    await fireEvent.press(await screen.findByText('👥 Un collègue'));
    await fireEvent.press(await screen.findByText(/^Alice/));

    expect(await screen.findByText('Planning de Alice')).toBeTruthy();
  });
});
