import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

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

  it('appelle onDelete au clic sur le bouton "Supprimer"', async () => {
    const onDelete = jest.fn();
    await render(
      <SwipeableRow onDelete={onDelete}>
        <Text>Juillet 2026</Text>
      </SwipeableRow>
    );

    await fireEvent.press(screen.getByLabelText('Supprimer'));

    // Le clic anime la ligne hors champ (150ms) avant d'appeler onDelete.
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
  });

  it('utilise le libellé personnalisé quand il est fourni', async () => {
    await render(
      <SwipeableRow onDelete={jest.fn()} deleteLabel="Retirer">
        <Text>Juillet 2026</Text>
      </SwipeableRow>
    );

    expect(screen.getByLabelText('Retirer')).toBeTruthy();
  });
});
