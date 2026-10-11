import { computeProducts, countMenus, describeMenu, formatPreparationList, MENUS } from '@/lib/collations';

describe('computeProducts', () => {
  it('additionne les produits de plusieurs menus', () => {
    const lines = computeProducts({ sucre: 5, leger: 6 });
    expect(lines).toEqual([
      { id: 'madeleine', label: 'Madeleine', quantity: 10 },
      { id: 'yaourtNature', label: 'Yaourt nature', quantity: 5 },
      { id: 'sucre', label: 'Sucre 8 g', quantity: 5 },
      { id: 'compote', label: 'Compote de pomme', quantity: 5 },
      { id: 'beurre', label: 'Beurre ½ sel', quantity: 6 },
      { id: 'pain', label: 'Pain', quantity: 6 },
    ]);
  });

  it('cumule un produit commun à plusieurs menus', () => {
    const lines = computeProducts({ sucre: 1, froid: 2, froidGourmand: 3, gourmand: 4 });
    expect(lines.find((l) => l.id === 'compote')?.quantity).toBe(10);
  });

  it('mélange collations ambu et petits-déjeuners', () => {
    const lines = computeProducts({ leger: 2, pdjClassic: 3, pdjContinental: 4 });
    const qty = (id: string) => lines.find((l) => l.id === id)?.quantity;
    expect(qty('beurre')).toBe(9);
    expect(qty('pain')).toBe(2);
    expect(qty('painPdj')).toBe(7);
    expect(qty('sucre')).toBe(11);
    expect(qty('miniViennoiseries')).toBe(4);
  });

  it('renvoie une liste vide sans menu demandé', () => {
    expect(computeProducts({})).toEqual([]);
    expect(computeProducts({ sucre: 0 })).toEqual([]);
  });
});

describe('countMenus', () => {
  it('compte tous les menus, ou seulement ceux d’un groupe', () => {
    const quantities = { sucre: 5, leger: 6, pdjClassic: 2 };
    expect(countMenus(quantities)).toBe(13);
    expect(countMenus(quantities, 'ambu')).toBe(11);
    expect(countMenus(quantities, 'pdj')).toBe(2);
    expect(countMenus({})).toBe(0);
  });
});

describe('describeMenu', () => {
  it('affiche la quantité seulement quand elle dépasse 1', () => {
    const sucre = MENUS.find((m) => m.id === 'sucre')!;
    expect(describeMenu(sucre)).toBe('2 Madeleine, Yaourt nature, Sucre 8 g, Compote de pomme');
    const classic = MENUS.find((m) => m.id === 'pdjClassic')!;
    expect(describeMenu(classic)).toBe('Pain / biscotte / pain de mie, Beurre ½ sel, Confiture, Sucre 8 g');
  });
});

describe('formatPreparationList', () => {
  it('liste menus, produits et matériel', () => {
    expect(formatPreparationList({ sucre: 5, leger: 6 })).toBe(
      [
        'Menus demandés :',
        '- 5 × Ambu sucré',
        '- 6 × Ambu léger',
        '',
        'À préparer :',
        '- 10 × Madeleine',
        '- 5 × Yaourt nature',
        '- 5 × Sucre 8 g',
        '- 5 × Compote de pomme',
        '- 6 × Beurre ½ sel',
        '- 6 × Pain',
        '',
        'Matériel collations ambu : 11 plateaux, tasses, petites cuillères, verres et couteaux',
      ].join('\n')
    );
  });

  it("omet le matériel quand il n'y a que des petits-déjeuners", () => {
    expect(formatPreparationList({ pdjClassic: 1 })).not.toContain('Matériel');
  });
});
