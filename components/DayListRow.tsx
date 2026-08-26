import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import ColorDot from '@/components/ColorDot';
import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatScheduleHours, type DayPlanning } from '@/lib/teams';

type Props = {
  day: DayPlanning;
  isHoliday: boolean;
  isCurrentDay: boolean;
  showHours: boolean;
};

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  const weekday = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'][date.getDay()];
  return `${weekday} ${date.getDate()}`;
}

/** Une ligne de la vue "Liste" de Mon planning : date, poste (± horaires, collègues) et pastille jour férié. */
export default function DayListRow({ day, isHoliday, isCurrentDay, showHours }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.row, isHoliday && styles.rowHoliday, isCurrentDay && styles.rowToday]}>
      <View style={styles.date}>
        <Text style={styles.dateText}>{formatDate(day.date)}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.codeRow}>
          <ColorDot color={day.group?.color} />
          <Text style={styles.code}>
            {day.code || '—'}
            {showHours && day.schedule && <Text style={styles.schedule}> ({formatScheduleHours(day.schedule)})</Text>}
            {day.teammates.length > 0 && (
              <Text style={styles.teammates}> · {day.teammates.map((t) => `${t.code} ${t.name}`).join(', ')}</Text>
            )}
          </Text>
        </View>
      </View>
      {isHoliday && <Text style={styles.holidayTag}>Férié</Text>}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.divider,
    },
    rowHoliday: {
      borderLeftWidth: 2,
      borderLeftColor: colors.holiday,
      paddingLeft: 8,
    },
    rowToday: {
      borderLeftWidth: 3,
      borderLeftColor: colors.tint,
      paddingLeft: 8,
    },
    holidayTag: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.holiday,
    },
    date: {
      width: 64,
    },
    dateText: {
      fontWeight: '600',
      color: colors.text,
    },
    info: {
      flex: 1,
    },
    codeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    code: {
      fontWeight: 'bold',
      color: colors.text,
    },
    schedule: {
      fontSize: 13,
      fontWeight: '600',
      opacity: 0.7,
      color: colors.text,
    },
    teammates: {
      fontSize: 13,
      fontWeight: '400',
      opacity: 0.8,
      color: colors.text,
    },
  });
}
