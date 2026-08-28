import BrandHeader from '@/components/BrandHeader';

/**
 * Options d'écran communes à tous les navigateurs pour afficher le même
 * en-tête de marque ([BrandHeader]) : bleu Sodexo, titre centré blanc, filet
 * rouge sous l'en-tête.
 */
// Adaptateur fin : la signature de `header` diffère entre pile et onglets, d'où
// le `any` — BrandHeader ne lit que les champs communs aux deux.
const brandHeaderOptions = { header: (props: any) => <BrandHeader {...props} /> } as const;

export function useHeaderOptions() {
  return brandHeaderOptions;
}
