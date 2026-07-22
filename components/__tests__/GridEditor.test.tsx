import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import GridEditor from '@/components/GridEditor';

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
        onRemoveRow={jest.fn()}
        onAddEmployee={jest.fn()}
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
        onRemoveRow={jest.fn()}
        onAddEmployee={jest.fn()}
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
        onRemoveRow={jest.fn()}
        onAddEmployee={jest.fn()}
        onOpenRow={onOpenRow}
      />
    );

    await fireEvent.press(screen.getByText('Planning →'));
    expect(onOpenRow).toHaveBeenCalledWith(0);
  });

  it('appelle onAddEmployee sur "+ Ajouter un salarié"', async () => {
    const onAddEmployee = jest.fn();
    await render(
      <GridEditor
        days={days}
        employees={[]}
        grid={[]}
        onRemoveRow={jest.fn()}
        onAddEmployee={onAddEmployee}
        onOpenRow={jest.fn()}
      />
    );

    await fireEvent.press(screen.getByText('+ Ajouter un salarié'));
    expect(onAddEmployee).toHaveBeenCalledTimes(1);
  });

  it('demande confirmation avant de retirer une ligne, puis appelle onRemoveRow si confirmé', async () => {
    const onRemoveRow = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const confirmButton = buttons?.find((b) => b.text === 'Supprimer');
      confirmButton?.onPress?.();
    });

    await render(
      <GridEditor
        days={days}
        employees={['Alice']}
        grid={[['D1', '', 'D2']]}
        onRemoveRow={onRemoveRow}
        onAddEmployee={jest.fn()}
        onOpenRow={jest.fn()}
      />
    );

    await fireEvent.press(screen.getByText('×'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Supprimer cette ligne ?',
      '"Alice" sera retiré de ce planning.',
      expect.any(Array)
    );
    expect(onRemoveRow).toHaveBeenCalledWith(0);

    alertSpy.mockRestore();
  });

  it("n'appelle pas onRemoveRow si on annule la confirmation", async () => {
    const onRemoveRow = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const cancelButton = buttons?.find((b) => b.text === 'Annuler');
      cancelButton?.onPress?.();
    });

    await render(
      <GridEditor
        days={days}
        employees={['Alice']}
        grid={[['D1', '', 'D2']]}
        onRemoveRow={onRemoveRow}
        onAddEmployee={jest.fn()}
        onOpenRow={jest.fn()}
      />
    );

    await fireEvent.press(screen.getByText('×'));

    expect(onRemoveRow).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });
});
