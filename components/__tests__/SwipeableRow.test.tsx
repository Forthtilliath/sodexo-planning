import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import SwipeableRow from '@/components/SwipeableRow';

describe('SwipeableRow', () => {
  it('affiche son contenu', async () => {
    await render(
      <SwipeableRow onDelete={jest.fn()}>
        <Text>Juillet 2026</Text>
      </SwipeableRow>
    );

    expect(screen.getByText('Juillet 2026')).toBeTruthy();
  });

  it('appelle onDelete au clic sur le bouton "Supprimer" (la ligne glisse hors champ)', async () => {
    const onDelete = jest.fn();
    await render(
      <SwipeableRow onDelete={onDelete}>
        <Text>Juillet 2026</Text>
      </SwipeableRow>
    );

    await fireEvent.press(screen.getByLabelText('Supprimer'));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('utilise le libellé personnalisé quand il est fourni', async () => {
    await render(
      <SwipeableRow onDelete={jest.fn()} deleteLabel="Retirer">
        <Text>Juillet 2026</Text>
      </SwipeableRow>
    );

    expect(screen.getByLabelText('Retirer')).toBeTruthy();
    expect(screen.getByText('Retirer')).toBeTruthy();
  });

  it('ne supprime rien tant que la ligne n’est pas ouverte', async () => {
    const onDelete = jest.fn();
    await render(
      <SwipeableRow onDelete={onDelete}>
        <Text>Juillet 2026</Text>
      </SwipeableRow>
    );

    expect(onDelete).not.toHaveBeenCalled();
  });
});
