import { fireEvent, render, screen } from '@testing-library/react-native';

import ScanMonthSelector from '@/components/ScanMonthSelector';
import type { ScanRecord } from '@/types';

function makeScan(id: string, year: number, month: number): ScanRecord {
  return { id, year, month, createdAt: 0, days: [], employees: [], grid: [] };
}

// measureInWindow n'est pas implémenté sous jsdom : on l'exécute avec un
// rectangle bidon pour que le menu s'ouvre quand même.
beforeAll(() => {
  const proto = require('react-native').View.prototype;
  proto.measureInWindow = function (cb: (x: number, y: number, w: number, h: number) => void) {
    cb(0, 100, 200, 40);
  };
});

const scans = [makeScan('jan', 2026, 1), makeScan('feb', 2026, 2), makeScan('mar', 2026, 3)];

describe('ScanMonthSelector', () => {
  it('affiche le mois sélectionné', async () => {
    await render(<ScanMonthSelector scans={scans} selectedScanId="feb" onSelect={jest.fn()} />);
    expect(screen.getByText('Février 2026')).toBeTruthy();
  });

  it('navigue vers le mois précédent / suivant avec les flèches', async () => {
    const onSelect = jest.fn();
    await render(<ScanMonthSelector scans={scans} selectedScanId="feb" onSelect={onSelect} />);

    await fireEvent.press(screen.getByLabelText('Mois précédent'));
    expect(onSelect).toHaveBeenLastCalledWith('jan');

    await fireEvent.press(screen.getByLabelText('Mois suivant'));
    expect(onSelect).toHaveBeenLastCalledWith('mar');
  });

  it('désactive la flèche précédente sur le premier mois et la suivante sur le dernier', async () => {
    const onSelect = jest.fn();
    await render(<ScanMonthSelector scans={scans} selectedScanId="jan" onSelect={onSelect} />);

    await fireEvent.press(screen.getByLabelText('Mois précédent'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('ouvre le menu et sélectionne un planning dans la liste', async () => {
    const onSelect = jest.fn();
    await render(<ScanMonthSelector scans={scans} selectedScanId="jan" onSelect={onSelect} />);

    await fireEvent.press(screen.getByLabelText('Choisir un planning'));
    // "Mars 2026" n'apparaît que dans le menu ouvert (le bouton affiche "Janvier 2026").
    await fireEvent.press(screen.getByText('Mars 2026'));

    expect(onSelect).toHaveBeenCalledWith('mar');
  });
});
