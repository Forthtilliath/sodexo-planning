import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { ProductLine } from '@/lib/collations';

type Props = {
  lines: ProductLine[];
  /** Nombre de collations ambu : autant de plateaux, tasses, etc. (bloc masqué à 0). */
  ambuCount: number;
};

/** Résultat du calcul : produits à sortir, puis le matériel des collations ambu. */
export default function PreparationList({ lines, ambuCount }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      {lines.map((line) => (
        <View key={line.id} style={styles.row} accessible accessibilityLabel={`${line.quantity} ${line.label}`}>
          <Text style={styles.label}>{line.label}</Text>
          <Text style={styles.quantity}>{line.quantity}</Text>
        </View>
      ))}
      {ambuCount > 0 && (
        <View style={styles.equipment}>
          <Text style={styles.equipmentTitle}>Matériel collations ambu : {ambuCount} de chaque</Text>
          <Text style={styles.equipmentHint}>Plateaux, tasses, petites cuillères, verres et couteaux</Text>
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 10,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderSubtle,
    },
    label: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
    },
    quantity: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.tint,
      minWidth: 36,
      textAlign: 'right',
    },
    equipment: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: colors.tintSoft,
    },
    equipmentTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    equipmentHint: {
      fontSize: 12,
      opacity: 0.75,
      marginTop: 2,
      color: colors.text,
    },
  });
}
