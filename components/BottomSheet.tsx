import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet as KitBottomSheet } from '@forthtilliath/react-native-kit/components/overlay/BottomSheet';

import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

/** Popup qui glisse depuis le bas de l'écran, plutôt qu'un contenu inline qui décale la mise en page. */
export default function BottomSheet({ visible, onClose, children }: Props) {
  const colors = useThemeColors();
  // Android edge-to-edge : la modale passe sous la barre de navigation système.
  const { bottom } = useSafeAreaInsets();
  const styles = useMemo(
    () => ({ overlay: { backgroundColor: colors.overlay }, sheet: { backgroundColor: colors.modalCard } }),
    [colors]
  );

  return (
    <KitBottomSheet visible={visible} onClose={onClose} bottomInset={bottom} styles={styles}>
      {children}
    </KitBottomSheet>
  );
}
