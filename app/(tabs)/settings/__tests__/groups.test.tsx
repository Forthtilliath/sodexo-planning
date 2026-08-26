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

import GroupsScreen from '@/app/(tabs)/settings/groups';
import { getTeamGroups, saveTeamGroups } from '@/lib/db';

async function enterEditMode() {
  await fireEvent.press(await screen.findByText('✏️ Modifier les groupes'));
}

describe('GroupsScreen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('affiche les groupes déjà enregistrés en lecture seule par défaut', async () => {
    await saveTeamGroups([{ id: 'g1', label: 'Chaîne', codes: ['C6', 'C7'], color: '#43a047' }]);

    await render(<GroupsScreen />);

    expect(await screen.findByText('Chaîne')).toBeTruthy();
    expect(screen.getByText('C6, C7')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Nom du groupe')).toBeNull();
  });

  it('passe en mode édition au clic sur le bouton dédié', async () => {
    await saveTeamGroups([{ id: 'g1', label: 'Chaîne', codes: ['C6', 'C7'], color: '#43a047' }]);
    await render(<GroupsScreen />);
    await screen.findByText('Chaîne');

    await enterEditMode();

    expect(screen.getByDisplayValue('Chaîne')).toBeTruthy();
    expect(screen.getByText('✓ Terminé')).toBeTruthy();
  });

  it('ajoute un groupe et le persiste', async () => {
    await saveTeamGroups([]);
    await render(<GroupsScreen />);
    await enterEditMode();

    await fireEvent.press(screen.getByText('+ Ajouter un groupe'));

    expect(screen.getByPlaceholderText('Nom du groupe')).toBeTruthy();
    const saved = await getTeamGroups();
    expect(saved).toHaveLength(1);
  });

  it("modifie le libellé et la liste de codes d'un groupe, et les persiste", async () => {
    await saveTeamGroups([{ id: 'g1', label: '', codes: [], color: '#43a047' }]);
    await render(<GroupsScreen />);
    await enterEditMode();

    await fireEvent.changeText(screen.getByPlaceholderText('Nom du groupe'), 'Plonge');
    await fireEvent.changeText(screen.getByPlaceholderText('D1, D2, D3, D4'), 'd1, d2');

    const saved = await getTeamGroups();
    expect(saved[0].label).toBe('Plonge');
    expect(saved[0].codes).toEqual(['D1', 'D2']);
  });

  it('supprime un groupe après confirmation', async () => {
    await saveTeamGroups([{ id: 'g1', label: 'À retirer', codes: ['X1'], color: '#43a047' }]);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((b) => b.text === 'Supprimer')?.onPress?.();
    });

    await render(<GroupsScreen />);
    await enterEditMode();
    await fireEvent.press(screen.getByLabelText('Supprimer À retirer'));

    expect(await getTeamGroups()).toHaveLength(0);
    alertSpy.mockRestore();
  });

  it("affiche les groupes dans l'ordre enregistré, avec une poignée de réordonnancement par glissé", async () => {
    await saveTeamGroups([
      { id: 'g1', label: 'Premier', codes: [], color: '#43a047' },
      { id: 'g2', label: 'Second', codes: [], color: '#1976d2' },
    ]);
    await render(<GroupsScreen />);
    await enterEditMode();

    const json = JSON.stringify(screen.toJSON());
    expect(json.indexOf('Premier')).toBeLessThan(json.indexOf('Second'));
    expect(screen.getByLabelText('Réordonner Premier')).toBeTruthy();
    expect(screen.getByLabelText('Réordonner Second')).toBeTruthy();
  });

  it('change la couleur via le sélecteur', async () => {
    await saveTeamGroups([{ id: 'g1', label: 'Chaud', codes: ['C2'], color: '#43a047' }]);
    await render(<GroupsScreen />);
    await enterEditMode();

    await fireEvent.press(screen.getByLabelText('Changer la couleur du groupe'));
    await fireEvent.press(await screen.findByLabelText('Couleur #d32f2f'));

    const saved = await getTeamGroups();
    expect(saved[0].color).toBe('#d32f2f');
  });

  it('affiche un badge "Week-end" en lecture seule pour une variante week-end', async () => {
    await saveTeamGroups([{ id: 'g1', label: 'WE Chaîne', codes: ['F1'], color: '#43a047', weekendVariant: true }]);
    await render(<GroupsScreen />);

    expect(await screen.findByText('Week-end')).toBeTruthy();
  });

  it('active/désactive la variante week-end via le switch en édition, et la persiste', async () => {
    await saveTeamGroups([{ id: 'g1', label: 'Chaîne', codes: ['C6'], color: '#43a047' }]);
    await render(<GroupsScreen />);
    await enterEditMode();

    await fireEvent(screen.getByRole('switch'), 'valueChange', true);

    const saved = await getTeamGroups();
    expect(saved[0].weekendVariant).toBe(true);
  });
});
