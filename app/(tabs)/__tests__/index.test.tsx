import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockRouterPush = jest.fn();
const mockSetParams = jest.fn();
const mockSetOptions = jest.fn();
let mockSearchParams: Record<string, string> = {};

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    router: { push: (...a: unknown[]) => mockRouterPush(...a), setParams: (...a: unknown[]) => mockSetParams(...a) },
    useLocalSearchParams: () => mockSearchParams,
    useNavigation: () => ({ setOptions: mockSetOptions }),
    useFocusEffect: (cb: () => void | (() => void)) => {
      React.useEffect(() => cb(), []);
    },
  };
});

jest.mock('@/lib/notifications', () => ({
  rescheduleWorkReminders: jest.fn().mockResolvedValue(undefined),
}));

import PlanningEditorScreen from '@/app/(tabs)/index';
import { saveScan, saveSettings } from '@/lib/db';
import type { ScanRecord } from '@/types';

const NOW = new Date(2026, 6, 15, 12, 0, 0); // 15 juillet 2026

function makeScan(overrides: Partial<ScanRecord> = {}): ScanRecord {
  return {
    id: 'scan-1',
    year: 2026,
    month: 7,
    createdAt: 1,
    days: ['2026-07-01', '2026-07-02'],
    employees: ['Moi', 'Alice'],
    grid: [
      ['D1', ''],
      ['', 'C2'],
    ],
    holidays: [],
    ...overrides,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockSearchParams = {};
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('PlanningEditorScreen — accueil', () => {
  it('propose de créer un planning pour le mois courant quand il n\'en existe pas', async () => {
    await render(<PlanningEditorScreen />);

    expect(await screen.findByText('✏️ Créer le planning')).toBeTruthy();
    expect(screen.getByText('Juillet')).toBeTruthy();
    expect(screen.getByText('2026')).toBeTruthy();
  });

  it('bascule sur "Modifier" et rappelle le planning existant du mois sélectionné', async () => {
    await saveScan(makeScan());
    await render(<PlanningEditorScreen />);

    expect(await screen.findByText('✏️ Modifier ce planning')).toBeTruthy();
    expect(screen.getByText(/Un planning existe déjà pour Juillet 2026 \(2 salarié\(s\)\)/)).toBeTruthy();
  });

  it('liste les plannings enregistrés dans "Reprendre un planning"', async () => {
    await saveScan(makeScan({ id: 'a', month: 7 }));
    await render(<PlanningEditorScreen />);

    expect(await screen.findByText('Reprendre un planning')).toBeTruthy();
    expect(screen.getByText('Juillet 2026')).toBeTruthy();
  });
});

describe('PlanningEditorScreen — création', () => {
  it('ouvre la revue pré-remplie avec la liste des salariés au clic sur "Créer"', async () => {
    await render(<PlanningEditorScreen />);

    await fireEvent.press(await screen.findByText('✏️ Créer le planning'));

    // Étape "revue" : la grille pré-remplie apparaît.
    expect(await screen.findAllByText('Planning →')).not.toHaveLength(0);
    expect(screen.getByText('Moi')).toBeTruthy();
    expect(screen.getByText('BICE Cécilia')).toBeTruthy();
  });

  it('ouvre l\'éditeur par personne au clic sur "Planning →" puis en ressort', async () => {
    await render(<PlanningEditorScreen />);
    await fireEvent.press(await screen.findByText('✏️ Créer le planning'));
    await screen.findAllByText('Planning →');

    await fireEvent.press(screen.getAllByText('Planning →')[0]);

    // L'éditeur par personne remplace la grille (plus de "Planning →").
    await waitFor(() => expect(screen.queryByText('Planning →')).toBeNull());
    // La grille du mois affiche les quantièmes (15 = milieu de juillet).
    expect(screen.getByText('15')).toBeTruthy();
  });

  it('ouvre directement le bon planning sur la bonne ligne via les paramètres de navigation', async () => {
    await saveScan(makeScan({ id: 'scan-x' }));
    mockSearchParams = { scanId: 'scan-x', editRow: '1' };

    await render(<PlanningEditorScreen />);

    // Éditeur par personne ouvert d'emblée sur la ligne 1 (Alice).
    await waitFor(() => expect(mockSetParams).toHaveBeenCalledWith({ scanId: undefined, editRow: undefined }));
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('demande confirmation avant de créer un planning pour un mois déjà terminé', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(<PlanningEditorScreen />);

    // Recule sur un mois passé (juin 2026).
    await fireEvent.press(await screen.findByText('Juillet'));
    await fireEvent.press(screen.getByText('Juin'));
    await fireEvent.press(screen.getByText('✏️ Créer le planning'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Mois déjà terminé',
      expect.stringContaining('Juin 2026'),
      expect.arrayContaining([expect.objectContaining({ text: 'Créer quand même' })])
    );
    alertSpy.mockRestore();
  });
});

describe('PlanningEditorScreen — suppression', () => {
  it('affiche un bandeau "Annuler" après suppression par le bouton du swipe', async () => {
    await saveScan(makeScan({ id: 'a', month: 7 }));
    await render(<PlanningEditorScreen />);

    await screen.findByText('Juillet 2026');
    await fireEvent.press(screen.getByLabelText('Supprimer'));
    jest.advanceTimersByTime(200); // animation de sortie (150 ms)

    await waitFor(() => expect(screen.getByText('Juillet 2026 supprimé')).toBeTruthy());
    expect(await AsyncStorage.getItem('@rn-planning/scans')).toBe('[]');
  });

  it('restaure le planning au clic sur "Annuler"', async () => {
    await saveScan(makeScan({ id: 'a', month: 7 }));
    await render(<PlanningEditorScreen />);

    await screen.findByText('Juillet 2026');
    await fireEvent.press(screen.getByLabelText('Supprimer'));
    jest.advanceTimersByTime(200);
    await waitFor(() => screen.getByText('Annuler'));

    await fireEvent.press(screen.getByText('Annuler'));

    await waitFor(async () =>
      expect(JSON.parse((await AsyncStorage.getItem('@rn-planning/scans')) ?? '[]')).toHaveLength(1)
    );
  });
});
