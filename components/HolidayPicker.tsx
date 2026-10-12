import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MonthDayGrid } from '@forthtilliath/react-native-kit/components/picker/MonthDayGrid';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  days: string[]; // dates ISO du mois
  holidays: Set<string>;
  onToggle: (iso: string) => void;
};

/**
 * Marque les jours fériés du mois (en plus des week-ends, déjà traités à
 * part) : ces jours-là, seuls les codes F1 à F5 ont du sens.
 */
export default function HolidayPicker({ days, holidays, onToggle }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const gridStyles = useMemo(
    () => ({
      weekdayText: { color: colors.text },
      dayBox: { borderColor: colors.border },
      dayBoxSelected: { backgroundColor: colors.danger, borderColor: colors.danger },
      dayText: { color: colors.text },
      dayTextSelected: { color: colors.onTint },
    }),
    [colors]
  );
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable style={styles.toggleButton} onPress={() => setExpanded((v) => !v)}>
        <Text style={styles.toggleButtonText}>
          📅 Jours fériés ({holidays.size}) {expanded ? '▲' : '▼'}
        </Text>
      </Pressable>
      {expanded && (
        <>
          <Text style={styles.hint}>Touche les jours fériés du mois — ils ne proposeront que les codes F1 à F5.</Text>
          <MonthDayGrid days={days} selected={holidays} onToggle={onToggle} styles={gridStyles} />
        </>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      marginBottom: 12,
    },
    toggleButton: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.tint,
      alignSelf: 'flex-start',
    },
    toggleButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.tint,
    },
    hint: {
      fontSize: 12,
      opacity: 0.7,
      marginTop: 6,
      marginBottom: 6,
      color: colors.text,
    },
  });
}
