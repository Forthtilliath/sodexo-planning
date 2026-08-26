import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
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

// react-native-draggable-flatlist (reanimated + gesture-handler) ne tourne
// pas sous Jest, et le geste de drag lui-même n'est de toute façon pas
// simulable via fireEvent — on remplace par un simple map, en exposant
// "drag" pour pouvoir déclencher un réordonnancement depuis un test.
jest.mock('react-native-draggable-flatlist', () => {
  const { View } = require('react-native');
  const FakeList = ({ data, renderItem, keyExtractor, ListHeaderComponent, ListEmptyComponent, ListFooterComponent }: any) => (
    <View>
      {ListHeaderComponent}
      {data.length === 0
        ? ListEmptyComponent
        : data.map((item: any, index: number) => (
            <View key={keyExtractor(item)}>
              {renderItem({ item, index, drag: () => {}, isActive: false, getIndex: () => index })}
            </View>
          ))}
      {ListFooterComponent}
    </View>
  );
  return {
    __esModule: true,
    default: FakeList,
  };
});

import RosterScreen from '@/app/(tabs)/settings/roster';
import { getEmployeeRoster, saveEmployeeCodeOptions, saveEmployeeRoster, saveTeamGroups } from '@/lib/db';
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

  it('affiche une poignée de glissé en tri Manuel par défaut, la cache avec un tri automatique', async () => {
    await render(<RosterScreen />);
    await screen.findByText('Alice');
    expect(screen.getAllByLabelText(/^Réordonner /).length).toBeGreaterThan(0);

    await fireEvent.press(screen.getByText('🔤 A-Z'));

    expect(screen.queryAllByLabelText(/^Réordonner /)).toHaveLength(0);
  });
});

describe('RosterScreen — fiche salarié (sheet)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("ouvre un sheet au clic sur une carte, plutôt qu'un accordéon inline", async () => {
    await saveEmployeeRoster([{ name: 'Alice', active: true }]);
    await render(<RosterScreen />);

    await fireEvent.press(await screen.findByText('Alice'));

    expect(screen.getByText('Archivé')).toBeTruthy();
    expect(screen.getByText('Salarié régulier')).toBeTruthy();
    // Libellé explicite : la catégorie ne sert qu'à trier/regrouper la liste.
    expect(screen.getByText('Catégorie principale')).toBeTruthy();
  });

  it('affiche chaque catégorie (même vide) en tri Manuel, comme cible de glissé', async () => {
    await saveTeamGroups([{ id: 'chaine', label: 'Chaîne', codes: ['C6'], color: '#43a047' }]);
    await saveEmployeeRoster([{ name: 'Alice', active: true }]);
    await render(<RosterScreen />);

    await screen.findByText('Alice');
    expect(screen.getByText('Chaîne')).toBeTruthy();
    expect(screen.getByText('glisse un salarié ici')).toBeTruthy();
  });

  it('est régulier par défaut (ajouté automatiquement), et peut passer intérimaire', async () => {
    await saveEmployeeRoster([{ name: 'Alice', active: true }]);
    await render(<RosterScreen />);
    await fireEvent.press(await screen.findByText('Alice'));

    const [, regularSwitch] = screen.getAllByRole('switch');
    expect(regularSwitch.props.value).toBe(true);

    await fireEvent(regularSwitch, 'valueChange', false);

    await waitFor(async () => expect((await getEmployeeRoster())[0].regular).toBe(false));
  });

  it('archive un salarié via le switch "Archivé", qui le déplace dans la section archivée', async () => {
    await saveEmployeeRoster([{ name: 'Alice', active: true }]);
    await render(<RosterScreen />);
    await fireEvent.press(await screen.findByText('Alice'));

    const [archivedSwitch] = screen.getAllByRole('switch');
    await fireEvent(archivedSwitch, 'valueChange', true);

    expect(await screen.findByText('▼ Salariés archivés (1)')).toBeTruthy();
  });

  it('assigne une catégorie et regroupe les salariés sous son en-tête', async () => {
    await saveTeamGroups([{ id: 'chaine', label: 'Chaîne', codes: ['C6'], color: '#43a047' }]);
    await saveEmployeeRoster([{ name: 'Alice', active: true }]);
    await render(<RosterScreen />);
    await fireEvent.press(await screen.findByText('Alice'));

    // Le sheet propose la catégorie via un chip nommé comme le groupe — même
    // libellé que l'en-tête de catégorie (vide) affiché en arrière-plan, donc
    // deux matches ; le chip est le dernier du rendu (le sheet vient après).
    await waitFor(() => expect(screen.getAllByText('Chaîne').length).toBeGreaterThan(0));
    const chaineNodes = screen.getAllByText('Chaîne');
    await fireEvent.press(chaineNodes[chaineNodes.length - 1]);

    await waitFor(async () => expect((await getEmployeeRoster())[0].groupId).toBe('chaine'));
  });

  it('supprime le salarié depuis le sheet, après confirmation', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((b) => b.text === 'Supprimer')?.onPress?.();
    });
    await saveEmployeeRoster([{ name: 'Alice', active: true }]);
    await render(<RosterScreen />);
    await fireEvent.press(await screen.findByText('Alice'));

    await fireEvent.press(screen.getByText('🗑️ Supprimer ce salarié'));

    expect(screen.queryByText('Alice')).toBeNull();
    alertSpy.mockRestore();
  });
});
