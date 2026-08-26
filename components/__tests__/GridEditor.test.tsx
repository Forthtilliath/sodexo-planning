import { fireEvent, render, screen } from '@testing-library/react-native';

import GridEditor from '@/components/GridEditor';
import type { RosterEntry, TeamGroup } from '@/types';

const days = ['2026-07-01', '2026-07-02', '2026-07-03'];

describe('GridEditor', () => {
  it('affiche chaque salarié avec son résumé de remplissage', async () => {
    await render(
      <GridEditor
        days={days}
        employees={['Alice', 'Bob']}
        grid={[
          ['D1', '', 'D2'],
          ['', '', ''],
        ]}
        removable={[false, false]}
        roster={[]}
        groups={[]}
        onNewEmployee={jest.fn()}
        onPickExisting={jest.fn()}
        onRemoveEmployee={jest.fn()}
        onOpenRow={jest.fn()}
      />
    );

    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('2 / 3 jours renseignés')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('0 / 3 jours renseignés')).toBeTruthy();
  });

  it('affiche un nom par défaut quand le salarié est sans nom', async () => {
    await render(
      <GridEditor
        days={days}
        employees={['']}
        grid={[['', '', '']]}
        removable={[false]}
        roster={[]}
        groups={[]}
        onNewEmployee={jest.fn()}
        onPickExisting={jest.fn()}
        onRemoveEmployee={jest.fn()}
        onOpenRow={jest.fn()}
      />
    );

    expect(screen.getByText('Employé 1')).toBeTruthy();
  });

  it('ouvre le planning de la ligne sur "Planning →"', async () => {
    const onOpenRow = jest.fn();
    await render(
      <GridEditor
        days={days}
        employees={['Alice']}
        grid={[['D1', '', 'D2']]}
        removable={[false]}
        roster={[]}
        groups={[]}
        onNewEmployee={jest.fn()}
        onPickExisting={jest.fn()}
        onRemoveEmployee={jest.fn()}
        onOpenRow={onOpenRow}
      />
    );

    await fireEvent.press(screen.getByText('Planning →'));
    expect(onOpenRow).toHaveBeenCalledWith(0);
  });

  it('appelle onPickExisting sur "+ Ajouter salarié" et onNewEmployee sur "+ Nouveau salarié"', async () => {
    const onPickExisting = jest.fn();
    const onNewEmployee = jest.fn();
    await render(
      <GridEditor
        days={days}
        employees={[]}
        grid={[]}
        removable={[]}
        roster={[]}
        groups={[]}
        onNewEmployee={onNewEmployee}
        onPickExisting={onPickExisting}
        onRemoveEmployee={jest.fn()}
        onOpenRow={jest.fn()}
      />
    );

    await fireEvent.press(screen.getByText('+ Ajouter salarié'));
    expect(onPickExisting).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByText('+ Nouveau salarié'));
    expect(onNewEmployee).toHaveBeenCalledTimes(1);
  });

  it('ne propose de retrait que pour les salariés marqués retirables', async () => {
    const onRemoveEmployee = jest.fn();
    await render(
      <GridEditor
        days={days}
        employees={['Alice', 'Bob']}
        grid={[
          ['', '', ''],
          ['', '', ''],
        ]}
        removable={[false, true]}
        roster={[]}
        groups={[]}
        onNewEmployee={jest.fn()}
        onPickExisting={jest.fn()}
        onRemoveEmployee={onRemoveEmployee}
        onOpenRow={jest.fn()}
      />
    );

    expect(screen.queryByLabelText('Retirer Alice de ce mois')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Retirer Bob de ce mois'));
    expect(onRemoveEmployee).toHaveBeenCalledWith(1);
  });

  it('regroupe les salariés par catégorie (dans l\'ordre des groupes), avec "Sans catégorie" en dernier', async () => {
    const groups: TeamGroup[] = [
      { id: 'chaine', label: 'Chaîne', codes: ['C6'], color: '#43a047' },
      { id: 'we-chaine', label: 'WE Chaîne', codes: ['F1'], color: '#43a047', weekendVariant: true },
    ];
    const roster: RosterEntry[] = [
      { name: 'Alice', active: true, groupId: 'chaine' },
      { name: 'Bob', active: true },
    ];

    await render(
      <GridEditor
        days={days}
        employees={['Bob', 'Alice']}
        grid={[
          ['', '', ''],
          ['', '', ''],
        ]}
        removable={[false, false]}
        roster={roster}
        groups={groups}
        onNewEmployee={jest.fn()}
        onPickExisting={jest.fn()}
        onRemoveEmployee={jest.fn()}
        onOpenRow={jest.fn()}
      />
    );

    expect(screen.getByText('Chaîne')).toBeTruthy();
    expect(screen.getByText('Sans catégorie')).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
  });
});
