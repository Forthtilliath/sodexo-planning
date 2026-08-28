import { fireEvent, render, screen } from '@testing-library/react-native';

import SavedScansList from '@/components/SavedScansList';
import type { ScanRecord } from '@/types';

function makeScan(id: string, year: number, month: number, employees: string[] = ['Moi']): ScanRecord {
  return { id, year, month, createdAt: 0, days: [], employees, grid: [] };
}

const NOW = new Date(2026, 6, 15); // 15 juillet 2026

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('SavedScansList', () => {
  it("n'affiche rien quand il n'y a aucun planning", async () => {
    await render(<SavedScansList scans={[]} onOpen={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.toJSON()).toBeNull();
  });

  it('masque les mois passés par défaut, derrière un interrupteur', async () => {
    await render(
      <SavedScansList
        scans={[makeScan('a', 2026, 7), makeScan('b', 2026, 5)]}
        onOpen={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByText('Juillet 2026')).toBeTruthy();
    expect(screen.queryByText('Mai 2026')).toBeNull();

    await fireEvent(screen.getByRole('switch'), 'valueChange', true);
    expect(screen.getByText('Mai 2026')).toBeTruthy();
  });

  it("n'affiche pas l'interrupteur \"Mois passés\" quand il n'y a que des mois en cours / à venir", async () => {
    await render(
      <SavedScansList
        scans={[makeScan('a', 2026, 7), makeScan('b', 2026, 9)]}
        onOpen={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.queryByText('Mois passés')).toBeNull();
  });

  it('ordonne : mois en cours, puis à venir (croissant), puis passés (décroissant)', async () => {
    await render(
      <SavedScansList
        scans={[
          makeScan('past-old', 2026, 3),
          makeScan('future-far', 2026, 11),
          makeScan('current', 2026, 7),
          makeScan('future-near', 2026, 9),
          makeScan('past-recent', 2026, 5),
        ]}
        onOpen={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    await fireEvent(screen.getByRole('switch'), 'valueChange', true);

    const order = ['Juillet 2026', 'Septembre 2026', 'Novembre 2026', 'Mai 2026', 'Mars 2026'];
    const json = JSON.stringify(screen.toJSON());
    const positions = order.map((label) => json.indexOf(label));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('appelle onOpen avec le planning cliqué', async () => {
    const onOpen = jest.fn();
    const scan = makeScan('a', 2026, 7, ['Moi', 'Alice']);
    await render(<SavedScansList scans={[scan]} onOpen={onOpen} onDelete={jest.fn()} />);

    await fireEvent.press(screen.getByText('2 salarié(s)'));

    expect(onOpen).toHaveBeenCalledWith(scan);
  });

  it('appelle onDelete via le bouton "Supprimer" révélé par le swipe', async () => {
    const onDelete = jest.fn();
    const scan = makeScan('a', 2026, 7);
    await render(<SavedScansList scans={[scan]} onOpen={jest.fn()} onDelete={onDelete} />);

    await fireEvent.press(screen.getByLabelText('Supprimer'));
    jest.runAllTimers();

    expect(onDelete).toHaveBeenCalledWith(scan);
  });
});
