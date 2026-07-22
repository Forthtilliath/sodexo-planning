import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

/** Popup qui glisse depuis le bas de l'écran, plutôt qu'un contenu inline qui décale la mise en page. */
export default function BottomSheet({ visible, onClose, children }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.sheet}>
          <ScrollView>{children}</ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    paddingBottom: 24,
    maxHeight: '70%',
  },
});
