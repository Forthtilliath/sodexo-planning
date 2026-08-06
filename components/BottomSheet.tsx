import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

/** Popup qui glisse depuis le bas de l'écran, plutôt qu'un contenu inline qui décale la mise en page. */
export default function BottomSheet({ visible, onClose, children }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Fond cliquable pour fermer : un FRÈRE de la sheet, pas un parent — un
            Pressable qui englobe le ScrollView entre en conflit avec son geste
            de défilement (le tap-and-drag est intercepté par le Pressable au
            lieu de faire défiler le contenu, surtout sur Android). */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <ScrollView style={styles.scroll}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.modalCard,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingTop: 8,
      paddingBottom: 24,
      maxHeight: '70%',
    },
    // Sans flexShrink, le ScrollView prend la hauteur de son contenu au lieu
    // de se contraindre au maxHeight du sheet : le contenu déborde sans que
    // ça défile (le surplus est juste invisible/coupé, pas scrollable).
    scroll: {
      flexShrink: 1,
    },
  });
}
