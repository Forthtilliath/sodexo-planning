import { fireEvent, render, screen } from '@testing-library/react-native';

import AddEmployeeSheet from '@/components/AddEmployeeSheet';
import type { RosterEntry, TeamGroup } from '@/types';

const groups: TeamGroup[] = [
  { id: 'chaine', label: 'Chaîne', codes: ['C6'], color: '#43a047' },
  { id: 'we-chaine', label: 'WE Chaîne', codes: ['F1'], color: '#43a047', weekendVariant: true },
];

const roster: RosterEntry[] = [
  { name: 'Alice', active: true, groupId: 'chaine' },
  { name: 'Bob', active: true, regular: false }, // intérimaire, sans catégorie
  { name: 'Zoé', active: true, groupId: 'chaine', regular: false }, // intérimaire, catégorisée
  { name: 'Archivée', active: false },
];

describe('AddEmployeeSheet', () => {
  it('regroupe par catégorie (dans l\'ordre des groupes), avec "Sans catégorie" pour le reste', async () => {
    await render(
      <AddEmployeeSheet
        visible
        onClose={jest.fn()}
        roster={roster}
        groups={groups}
        excludeNames={[]}
        onPick={jest.fn()}
      />
    );

    expect(await screen.findByText('Chaîne')).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Zoé')).toBeTruthy();
    expect(screen.getByText('Sans catégorie')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
  });

  it('exclut les salariés archivés et ceux déjà dans le planning', async () => {
    await render(
      <AddEmployeeSheet
        visible
        onClose={jest.fn()}
        roster={roster}
        groups={groups}
        excludeNames={['alice']}
        onPick={jest.fn()}
      />
    );

    await screen.findByText('Bob');
    expect(screen.queryByText('Alice')).toBeNull();
    expect(screen.queryByText('Archivée')).toBeNull();
  });

  it('ne propose pas les variantes week-end comme catégorie', async () => {
    await render(
      <AddEmployeeSheet visible onClose={jest.fn()} roster={roster} groups={groups} excludeNames={[]} onPick={jest.fn()} />
    );

    await screen.findByText('Chaîne');
    expect(screen.queryByText('WE Chaîne')).toBeNull();
  });

  it('marque les intérimaires, appelle onPick au tap', async () => {
    const onPick = jest.fn();
    await render(
      <AddEmployeeSheet visible onClose={jest.fn()} roster={roster} groups={groups} excludeNames={[]} onPick={onPick} />
    );

    expect((await screen.findAllByText('Intérimaire')).length).toBe(2);

    await fireEvent.press(screen.getByText('Bob'));
    expect(onPick).toHaveBeenCalledWith('Bob');
  });

  it("affiche un message quand tout le monde est déjà dans le planning", async () => {
    await render(
      <AddEmployeeSheet
        visible
        onClose={jest.fn()}
        roster={roster}
        groups={groups}
        excludeNames={['Alice', 'Bob', 'Zoé']}
        onPick={jest.fn()}
      />
    );

    expect(await screen.findByText('Tous les salariés actifs sont déjà dans ce planning.')).toBeTruthy();
  });
});
