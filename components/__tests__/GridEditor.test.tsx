import { fireEvent, render, screen } from '@testing-library/react-native';

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
    await render(<GridEditor days={days} employees={['']} grid={[['', '', '']]} onAddEmployee={jest.fn()} onOpenRow={jest.fn()} />);

    expect(screen.getByText('Employé 1')).toBeTruthy();
  });

  it('ouvre le planning de la ligne sur "Planning →"', async () => {
    const onOpenRow = jest.fn();
    await render(
      <GridEditor days={days} employees={['Alice']} grid={[['D1', '', 'D2']]} onAddEmployee={jest.fn()} onOpenRow={onOpenRow} />
    );

    await fireEvent.press(screen.getByText('Planning →'));
    expect(onOpenRow).toHaveBeenCalledWith(0);
  });

  it('appelle onAddEmployee sur "+ Ajouter un salarié"', async () => {
    const onAddEmployee = jest.fn();
    await render(<GridEditor days={days} employees={[]} grid={[]} onAddEmployee={onAddEmployee} onOpenRow={jest.fn()} />);

    await fireEvent.press(screen.getByText('+ Ajouter un salarié'));
    expect(onAddEmployee).toHaveBeenCalledTimes(1);
  });
});
