import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';

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

import RosterScreen from '@/app/(tabs)/settings/roster';
import { saveEmployeeCodeOptions, saveEmployeeRoster } from '@/lib/db';
import type { RosterEntry } from '@/types';

// Ordre de sauvegarde volontairement différent des tris alphabétique et par
// poste majoritaire, pour bien distinguer les trois modes dans les tests.
const roster: RosterEntry[] = [
  { name: 'Zoé', active: true },
  { name: 'Alice', active: true },
  { name: 'Bob', active: true },
];
// D1 (rang 3) < C2 (rang 10) < B1 (rang 14) dans CODE_DISPLAY_ORDER.
const codeOptions = { Zoé: ['C2'], Alice: ['B1'], Bob: ['D1'] };

function orderOf(...names: string[]): number[] {
  const json = JSON.stringify(screen.toJSON());
  return names.map((name) => json.indexOf(name));
}

describe('RosterScreen — recherche et tri', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await saveEmployeeRoster(roster);
    await saveEmployeeCodeOptions(codeOptions);
  });

  it('filtre la liste par nom, insensible à la casse', async () => {
    await render(<RosterScreen />);

    await fireEvent.changeText(await screen.findByPlaceholderText('Rechercher un salarié…'), 'ali');

    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.queryByText('Bob')).toBeNull();
    expect(screen.queryByText('Zoé')).toBeNull();
  });

  it('garde l\'ordre de sauvegarde par défaut (tri "Manuel")', async () => {
    await render(<RosterScreen />);
    await screen.findByText('Zoé');

    const [zoe, alice, bob] = orderOf('Zoé', 'Alice', 'Bob');
    expect(zoe).toBeLessThan(alice);
    expect(alice).toBeLessThan(bob);
  });

  it('trie par ordre alphabétique', async () => {
    await render(<RosterScreen />);
    await fireEvent.press(await screen.findByText('🔤 A-Z'));

    const [alice, bob, zoe] = orderOf('Alice', 'Bob', 'Zoé');
    expect(alice).toBeLessThan(bob);
    expect(bob).toBeLessThan(zoe);
  });

  it('trie par poste majoritaire (E1-E3, D1-D4, C6-C8, C2-C5, B1)', async () => {
    await render(<RosterScreen />);
    await fireEvent.press(await screen.findByText('🎯 Poste'));

    const [bob, zoe, alice] = orderOf('Bob', 'Zoé', 'Alice');
    expect(bob).toBeLessThan(zoe);
    expect(zoe).toBeLessThan(alice);
  });

  it("cache les flèches de réorganisation manuelle quand un tri automatique est actif", async () => {
    await render(<RosterScreen />);
    await fireEvent.press(await screen.findByText('Alice'));
    expect(screen.getByText('↑')).toBeTruthy();

    await fireEvent.press(screen.getByText('🔤 A-Z'));

    expect(screen.queryByText('↑')).toBeNull();
    expect(screen.queryByText('↓')).toBeNull();
  });
});
