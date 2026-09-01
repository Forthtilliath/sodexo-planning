import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  onPickExisting: () => void; // sheet des salariés déjà connus
  onNewEmployee: () => void; // vers Réglages > Salariés pour créer un nom
  style?: StyleProp<ViewStyle>;
};

/** Les deux façons d'ajouter quelqu'un à la saisie : rattacher un salarié connu, ou en créer un. */
export default function AddEmployeeButtons({ onPickExisting, onNewEmployee, style }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.row, style]}>
      <Pressable style={styles.button} onPress={onPickExisting}>
        <Text style={styles.buttonTitle}>+ Ajouter à ce mois</Text>
        <Text style={styles.buttonHint}>Un salarié déjà connu</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={onNewEmployee}>
        <Text style={styles.buttonTitle}>👤 Créer un salarié</Text>
        <Text style={styles.buttonHint}>Un nouveau nom, via Réglages</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 8,
    },
    button: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      alignItems: 'center',
      gap: 2,
    },
    buttonTitle: {
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    buttonHint: {
      fontSize: 11,
      opacity: 0.7,
      color: colors.text,
      textAlign: 'center',
    },
  });
}
