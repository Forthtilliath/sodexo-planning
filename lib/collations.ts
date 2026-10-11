// Fiches "Composition collations ambulatoire" et "Composition petit déjeuner" :
// chaque menu demandé par un service se traduit en une liste de produits à
// préparer.

/** Produits dans l'ordre des fiches papier, pour que la liste se lise pareil. */
export const PRODUCTS = [
  { id: 'madeleine', label: 'Madeleine' },
  { id: 'yaourtNature', label: 'Yaourt nature' },
  { id: 'sucre', label: 'Sucre 8 g' },
  { id: 'compote', label: 'Compote de pomme' },
  { id: 'glace', label: 'Glace fraise/choco' },
  { id: 'coupeMelba', label: 'Coupe fraise Melba' },
  { id: 'emmental', label: 'Emmental' },
  { id: 'beurre', label: 'Beurre ½ sel' },
  { id: 'pain', label: 'Pain' },
  { id: 'painPdj', label: 'Pain / biscotte / pain de mie' },
  { id: 'confiture', label: 'Confiture' },
  { id: 'miniViennoiseries', label: '3 mini viennoiseries' },
  { id: 'brioche', label: 'Brioche' },
  { id: 'yaourtLocal', label: 'Yaourt local' },
  { id: 'jusPomme', label: 'Jus de pomme 20 cl' },
] as const;

export type ProductId = (typeof PRODUCTS)[number]['id'];

export type MenuGroupId = 'ambu' | 'pdj';

export const MENU_GROUPS: { id: MenuGroupId; title: string; note?: string }[] = [
  { id: 'ambu', title: 'Collations ambulatoires' },
  { id: 'pdj', title: 'Petits-déjeuners', note: 'Croissant le dimanche matin' },
];

export type Menu = {
  id: string;
  label: string;
  group: MenuGroupId;
  /** Quantité de chaque produit pour UN menu. */
  items: Partial<Record<ProductId, number>>;
};

export const MENUS: Menu[] = [
  { id: 'sucre', label: 'Ambu sucré', group: 'ambu', items: { madeleine: 2, yaourtNature: 1, sucre: 1, compote: 1 } },
  { id: 'froid', label: 'Ambu froid', group: 'ambu', items: { compote: 1, glace: 1 } },
  { id: 'dejeuner', label: 'Ambu déjeuner', group: 'ambu', items: { emmental: 1, beurre: 1, pain: 1 } },
  { id: 'leger', label: 'Ambu léger', group: 'ambu', items: { beurre: 1, pain: 1 } },
  {
    id: 'froidGourmand',
    label: 'Ambu froid gourmand',
    group: 'ambu',
    items: { sucre: 1, compote: 1, coupeMelba: 1, yaourtLocal: 1, jusPomme: 1 },
  },
  {
    id: 'gourmand',
    label: 'Ambu gourmand',
    group: 'ambu',
    items: { sucre: 1, compote: 1, emmental: 1, beurre: 1, pain: 1, brioche: 1, yaourtLocal: 1 },
  },
  {
    id: 'pdjClassic',
    label: 'PDJ classic',
    group: 'pdj',
    items: { painPdj: 1, beurre: 1, confiture: 1, sucre: 1 },
  },
  {
    id: 'pdjContinental',
    label: 'PDJ continental',
    group: 'pdj',
    items: { painPdj: 1, beurre: 1, confiture: 1, sucre: 2, miniViennoiseries: 1, yaourtNature: 1, jusPomme: 1 },
  },
];

/** Nombre de menus demandés, par id de menu (menu absent = 0). */
export type MenuQuantities = Record<string, number>;

export type ProductLine = { id: ProductId; label: string; quantity: number };

/** Total de chaque produit à préparer, dans l'ordre des fiches, sans les produits à 0. */
export function computeProducts(quantities: MenuQuantities): ProductLine[] {
  return PRODUCTS.map(({ id, label }) => ({
    id,
    label,
    quantity: MENUS.reduce((sum, menu) => sum + (quantities[menu.id] ?? 0) * (menu.items[id] ?? 0), 0),
  })).filter((line) => line.quantity > 0);
}

/**
 * Nombre de menus demandés, tous groupes confondus ou pour un seul. Pour les
 * collations ambu, c'est aussi la dotation en plateaux, tasses, petites
 * cuillères, verres et couteaux.
 */
export function countMenus(quantities: MenuQuantities, group?: MenuGroupId): number {
  return MENUS.filter((menu) => !group || menu.group === group).reduce(
    (sum, menu) => sum + (quantities[menu.id] ?? 0),
    0
  );
}

/** Composition lisible d'un menu, dans l'ordre de sa colonne sur la fiche, ex. "2 Madeleine, Yaourt nature". */
export function describeMenu(menu: Menu): string {
  return (Object.entries(menu.items) as [ProductId, number][])
    .map(([id, qty]) => {
      const label = PRODUCTS.find((p) => p.id === id)?.label ?? id;
      return qty === 1 ? label : `${qty} ${label}`;
    })
    .join(', ');
}

/** Texte à partager (message, note...) : menus demandés, produits, matériel. */
export function formatPreparationList(quantities: MenuQuantities): string {
  const menus = MENUS.filter((menu) => (quantities[menu.id] ?? 0) > 0).map(
    (menu) => `- ${quantities[menu.id]} × ${menu.label}`
  );
  const products = computeProducts(quantities).map((line) => `- ${line.quantity} × ${line.label}`);
  const ambuCount = countMenus(quantities, 'ambu');
  return [
    'Menus demandés :',
    ...menus,
    '',
    'À préparer :',
    ...products,
    ...(ambuCount > 0
      ? ['', `Matériel collations ambu : ${ambuCount} plateaux, tasses, petites cuillères, verres et couteaux`]
      : []),
  ].join('\n');
}
