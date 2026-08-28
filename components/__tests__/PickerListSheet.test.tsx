import { fireEvent, render, screen } from '@testing-library/react-native';

import PickerListSheet from '@/components/PickerListSheet';

describe('PickerListSheet', () => {
  it('ne rend pas son contenu tant que visible est faux', async () => {
    await render(
      <PickerListSheet
        visible={false}
        onClose={jest.fn()}
        onSelect={jest.fn()}
        items={[{ key: 'a', label: 'Alice' }]}
      />
    );
    expect(screen.queryByText('Alice')).toBeNull();
  });

  it('liste des items plats et renvoie la clé sélectionnée + ferme', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    await render(
      <PickerListSheet
        visible
        onClose={onClose}
        onSelect={onSelect}
        items={[
          { key: 'a', label: 'Alice' },
          { key: 'b', label: 'Bob' },
        ]}
      />
    );

    await fireEvent.press(screen.getByText('Bob'));

    expect(onSelect).toHaveBeenCalledWith('b');
    expect(onClose).toHaveBeenCalled();
  });

  it('affiche les en-têtes de section quand on passe des sections', async () => {
    await render(
      <PickerListSheet
        visible
        onClose={jest.fn()}
        onSelect={jest.fn()}
        sections={[
          { key: 'chaine', label: 'Chaîne', color: '#43a047', items: [{ key: '0', label: 'Alice (moi)', highlight: true }] },
          { key: 'none', label: 'Sans catégorie', items: [{ key: '1', label: 'Bob' }] },
        ]}
      />
    );

    expect(screen.getByText('Chaîne')).toBeTruthy();
    expect(screen.getByText('Sans catégorie')).toBeTruthy();
    expect(screen.getByText('Alice (moi)')).toBeTruthy();
  });
});
