import BrandHeader from '@/components/BrandHeader';

/**
 * Options d'écran communes à tous les navigateurs pour le même en-tête de
 * marque ([BrandHeader]). `any` : la signature de `header` diffère entre pile
 * et onglets, et BrandHeader ne lit que les champs communs aux deux.
 */
const brandHeaderOptions = { header: (props: any) => <BrandHeader {...props} /> } as const;

export function useHeaderOptions() {
  return brandHeaderOptions;
}
