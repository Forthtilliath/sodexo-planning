import { Share } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import CollationsScreen from '@/app/(tabs)/tools/collations';

describe('CollationsScreen', () => {
  it("n'affiche aucun produit tant qu'aucun menu n'est demandé", async () => {
    await render(<CollationsScreen />);
    expect(screen.getByText(/La liste des produits s'affiche/)).toBeTruthy();
    expect(screen.queryByText('Partager la liste')).toBeNull();
  });

  it('calcule les produits à partir des menus saisis', async () => {
    await render(<CollationsScreen />);

    await fireEvent.changeText(screen.getByLabelText('Quantité : Ambu sucré'), '5');
    await fireEvent.press(screen.getByLabelText('Ajouter : Ambu léger'));
    await fireEvent.press(screen.getByLabelText('Ajouter : Ambu léger'));

    expect(screen.getByText('À préparer (7 menus)')).toBeTruthy();
    expect(screen.getByLabelText('10 Madeleine')).toBeTruthy();
    expect(screen.getByLabelText('5 Compote de pomme')).toBeTruthy();
    expect(screen.getByLabelText('2 Pain')).toBeTruthy();
    expect(screen.getByText('Matériel collations ambu : 7 de chaque')).toBeTruthy();
  });

  it('ajoute les petits-déjeuners sans compter de matériel ambu', async () => {
    await render(<CollationsScreen />);

    await fireEvent.changeText(screen.getByLabelText('Quantité : PDJ continental'), '4');

    expect(screen.getByLabelText('8 Sucre 8 g')).toBeTruthy();
    expect(screen.getByLabelText('4 3 mini viennoiseries')).toBeTruthy();
    expect(screen.queryByText(/Matériel collations ambu/)).toBeNull();
  });

  it('ignore les caractères non numériques et remet tout à zéro', async () => {
    await render(<CollationsScreen />);

    await fireEvent.changeText(screen.getByLabelText('Quantité : Ambu froid'), '3a');
    expect(screen.getByLabelText('3 Glace fraise/choco')).toBeTruthy();

    await fireEvent.press(screen.getByText('Tout remettre à zéro'));
    expect(screen.getByText(/La liste des produits s'affiche/)).toBeTruthy();
  });

  it('partage la liste au format texte', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    await render(<CollationsScreen />);

    await fireEvent.press(screen.getByLabelText('Ajouter : Ambu déjeuner'));
    await fireEvent.press(screen.getByText('Partager la liste'));

    expect(share).toHaveBeenCalledWith({ message: expect.stringContaining('- 1 × Emmental') });
  });
});
