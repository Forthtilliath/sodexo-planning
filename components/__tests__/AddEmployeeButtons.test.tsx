import { fireEvent, render, screen } from '@testing-library/react-native';

import AddEmployeeButtons from '@/components/AddEmployeeButtons';

describe('AddEmployeeButtons', () => {
  it('distingue les deux actions par un intitulé et une précision', async () => {
    await render(<AddEmployeeButtons onPickExisting={jest.fn()} onNewEmployee={jest.fn()} />);

    expect(screen.getByText('+ Ajouter à ce mois')).toBeTruthy();
    expect(screen.getByText('Un salarié déjà connu')).toBeTruthy();
    expect(screen.getByText('👤 Créer un salarié')).toBeTruthy();
    expect(screen.getByText('Un nouveau nom, via Réglages')).toBeTruthy();
  });

  it('appelle le bon callback selon le bouton', async () => {
    const onPickExisting = jest.fn();
    const onNewEmployee = jest.fn();
    await render(
      <AddEmployeeButtons onPickExisting={onPickExisting} onNewEmployee={onNewEmployee} />
    );

    await fireEvent.press(screen.getByText('+ Ajouter à ce mois'));
    expect(onPickExisting).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByText('👤 Créer un salarié'));
    expect(onNewEmployee).toHaveBeenCalledTimes(1);
  });
});
