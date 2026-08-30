import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
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
// `lastDragEnd` capture le `onDragEnd` du dernier rendu : un test peut ainsi
// rejouer un réordonnancement en lui passant la liste réordonnée à la main.
const dnd: { lastDragEnd?: (params: { data: unknown[] }) => void; lastData?: any[] } = {};

jest.mock('react-native-draggable-flatlist', () => {
  const { View } = require('react-native');
  const FakeList = ({
    data,
    renderItem,
    keyExtractor,
    onDragEnd,
    ListHeaderComponent,
    ListEmptyComponent,
    ListFooterComponent,
  }: any) => {
    dnd.lastDragEnd = onDragEnd;
    dnd.lastData = data;
    return (
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
  };
  return {
    __esModule: true,
    default: FakeList,
  };
});

import RosterScreen from '@/app/(tabs)/settings/roster';
import { getEmployeeRoster, saveEmployeeCodeOptions, saveEmployeeRoster, saveTeamGroups } from '@/lib/db';
import type { RosterEntry } from '@/types';

// Ordre de sauvegarde volontairement différent du tri alphabétique, pour
// bien distinguer les deux modes dans les tests.
const roster: RosterEntry[] = [
  { name: 'Zoé', active: true },
  { name: 'Alice', active: true },
  { name: 'Bob', active: true },
];
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

  it('réordonne en gardant une clé stable par salarié (pas d\'index) après un glissé', async () => {
    await render(<RosterScreen />);
    await screen.findByText('Zoé');

    const data = dnd.lastData ?? [];
    const header = data.find((i: any) => i.type === 'header');
    const entries = data.filter((i: any) => i.type === 'entry');
    const keysBefore = entries.map((i: any) => i.key);

    // On dépose la dernière entrée (Bob) juste sous l'en-tête.
    const last = entries[entries.length - 1];
    await act(async () => {
      dnd.lastDragEnd?.({ data: [header, last, ...entries.slice(0, -1)] });
    });

    await waitFor(() => {
      const [bob, zoe, alice] = orderOf('Bob', 'Zoé', 'Alice');
      expect(bob).toBeLessThan(zoe);
      expect(zoe).toBeLessThan(alice);
    });

    const savedNames = (await getEmployeeRoster()).map((e) => e.name);
    expect(savedNames[0]).toBe('Bob');
    expect(savedNames.indexOf('Zoé')).toBeLessThan(savedNames.indexOf('Alice'));

    // Les clés ont suivi les salariés (même jeu de clés, ordre différent) :
    // sans id stable, elles resteraient positionnelles (e-0, e-1…) et identiques.
    const keysAfter = (dnd.lastData ?? []).filter((i: any) => i.type === 'entry').map((i: any) => i.key);
    expect([...keysAfter].sort()).toEqual([...keysBefore].sort());
    expect(keysAfter).not.toEqual(keysBefore);
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

  it("masque une variante week-end de la liste des catégories (en-têtes et sélecteur du sheet)", async () => {
    await saveTeamGroups([
      { id: 'chaine', label: 'Chaîne', codes: ['C6'], color: '#43a047' },
      { id: 'we-chaine', label: 'WE Chaîne', codes: ['F1'], color: '#43a047', weekendVariant: true },
    ]);
    await saveEmployeeRoster([{ name: 'Alice', active: true }]);
    await render(<RosterScreen />);

    await screen.findByText('Alice');
    expect(screen.getByText('Chaîne')).toBeTruthy();
    expect(screen.queryByText('WE Chaîne')).toBeNull();

    await fireEvent.press(screen.getByText('Alice'));
    expect(screen.queryByText('WE Chaîne')).toBeNull();
  });

  it('est régulier par défaut (ajouté automatiquement), et peut passer intérimaire', async () => {
    await saveEmployeeRoster([{ name: 'Alice', active: true }]);
    await render(<RosterScreen />);
    await fireEvent.press(await screen.findByText('Alice'));

    const [, regularSwitch] = screen.getAllByRole('switch');
    expect(regularSwitch.props.value).toBe(true);

    await fireEvent(regularSwitch, 'valueChange', false);

    await waitFor(async () =>
      expect((await getEmployeeRoster()).find((e) => e.name === 'Alice')?.regular).toBe(false)
    );
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

    await waitFor(async () =>
      expect((await getEmployeeRoster()).find((e) => e.name === 'Alice')?.groupId).toBe('chaine')
    );
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
