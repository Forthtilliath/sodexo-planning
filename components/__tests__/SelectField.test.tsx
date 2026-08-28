import { fireEvent, render, screen } from '@testing-library/react-native';

import SelectField from '@/components/SelectField';

const options = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' },
];

describe('SelectField', () => {
  it('affiche le libellé et la valeur courante', async () => {
    await render(<SelectField label="Mois" valueLabel="Février" options={options} onSelect={jest.fn()} />);

    expect(screen.getByText('Mois')).toBeTruthy();
    expect(screen.getByText('Février')).toBeTruthy();
  });

  it("ouvre la popup au clic et appelle onSelect avec la valeur choisie", async () => {
    const onSelect = jest.fn();
    await render(<SelectField label="Mois" valueLabel="Février" options={options} onSelect={onSelect} />);

    // Avant ouverture, les autres mois ne sont pas montés.
    expect(screen.queryByText('Mars')).toBeNull();

    await fireEvent.press(screen.getByText('Février'));
    await fireEvent.press(screen.getByText('Mars'));

    expect(onSelect).toHaveBeenCalledWith(3);
  });
});
