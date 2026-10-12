import type { ReactNode } from 'react';
import { useMemo } from 'react';

import { SwipeableRow as KitSwipeableRow } from '@forthtilliath/react-native-kit/components/list/SwipeableRow';

import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  children: ReactNode;
  onDelete: () => void;
  deleteLabel?: string;
};

/**
 * Ligne qu'on swipe vers la gauche pour supprimer : dépasser la moitié de la
 * largeur puis relâcher supprime directement (à l'appelant de proposer un
 * "Annuler" après coup). Le geste tourne sur le thread UI (gesture-handler).
 */
export default function SwipeableRow({ children, onDelete, deleteLabel = 'Supprimer' }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(
    () => ({
      container: { marginBottom: 8, borderRadius: 8, overflow: 'hidden' as const },
      deleteAction: { backgroundColor: colors.dangerStrong },
      deleteActionText: { color: colors.onTint },
    }),
    [colors]
  );

  return (
    <KitSwipeableRow
      fullSwipeToDelete
      onDelete={onDelete}
      deleteLabel={deleteLabel}
      deleteText={deleteLabel}
      styles={styles}>
      {children}
    </KitSwipeableRow>
  );
}
