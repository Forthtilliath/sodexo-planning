import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  // Android edge-to-edge : la modale passe sous la barre de navigation système.
  const { bottom } = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Frère de la sheet, pas parent : un Pressable englobant le ScrollView
            volerait son geste de défilement (surtout sur Android). */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: 24 + bottom }]}>
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
      maxHeight: '85%',
    },
    // Sans flexShrink, le ScrollView prend la hauteur de son contenu, ignore
    // le maxHeight du sheet, et le surplus est coupé sans être scrollable.
    scroll: {
      flexShrink: 1,
    },
  });
}
