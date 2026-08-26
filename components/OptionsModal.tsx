import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';

type Option<T> = { value: T; label: string };

type Props<T extends string | number> = {
  visible: boolean;
  onClose: () => void;
  options: Option<T>[];
  onSelect: (value: T) => void;
};

/** Popup centrée avec une liste d'options défilante ; tap sur une option = sélection + fermeture. */
export default function OptionsModal<T extends string | number>({ visible, onClose, options, onSelect }: Props<T>) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.card}>
          <ScrollView>
            {options.map((opt) => (
              <Pressable
                key={opt.value}
                style={styles.option}
                onPress={() => {
                  onSelect(opt.value);
                  onClose();
                }}>
                <Text style={styles.optionText}>{opt.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      width: '100%',
      maxHeight: '70%',
      backgroundColor: colors.modalCard,
      borderRadius: 12,
      paddingVertical: 8,
    },
    option: {
      paddingVertical: 14,
      paddingHorizontal: 20,
    },
    optionText: {
      fontSize: 16,
      color: colors.text,
    },
  });
}
