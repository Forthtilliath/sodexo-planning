import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import DayDetailSheet from '@/components/DayDetailSheet';
import type { ThemeColors } from '@/constants/Colors';
import { useResolvedScheme, useThemeColors } from '@/hooks/useThemeColors';
import { hexToSoftBackground } from '@/lib/colors';
import { dayNumber, isToday, mondayFirstWeekday } from '@/lib/dates';
import type { DayPlanning } from '@/lib/teams';
import type { ScanRecord, TeamGroup } from '@/types';

type Props = {
  planning: DayPlanning[]; // un élément par jour du mois, dans l'ordre
  holidays: string[]; // dates ISO fériées du mois
  showHours: boolean;
  scan: ScanRecord;
  groups: TeamGroup[];
};

const WEEKDAY_HEADERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Vue calendrier en lecture seule : touche un jour pour voir qui travaille, groupé par équipe. */
export default function MonthCalendarView({ planning, holidays, showHours, scan, groups }: Props) {
  const colors = useThemeColors();
  const isDark = useResolvedScheme() === 'dark';
  const styles = useMemo(() => createStyles(colors), [colors]);
  const leadingBlanks = planning.length > 0 ? mondayFirstWeekday(planning[0].date) : 0;
  const holidaySet = new Set(holidays);
  const [selectedDay, setSelectedDay] = useState<DayPlanning | null>(null);

  return (
    <View>
      <View style={styles.weekdayRow}>
        {WEEKDAY_HEADERS.map((w, i) => (
          <View key={i} style={styles.cell}>
            <Text style={styles.weekdayText}>{w}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <View key={`blank-${i}`} style={styles.cell} />
        ))}
        {planning.map((day) => {
          const isHoliday = holidaySet.has(day.date);
          const isCurrentDay = isToday(day.date);
          return (
            <View key={day.date} style={styles.cell}>
              <Pressable
                style={[
                  styles.dayBox,
                  day.group?.color && { backgroundColor: hexToSoftBackground(day.group.color, isDark) },
                  isHoliday && styles.dayBoxHoliday,
                  isCurrentDay && styles.dayBoxToday,
                ]}
                onPress={() => setSelectedDay(day)}>
                <Text style={[styles.dayLabel, isCurrentDay && styles.dayLabelToday]}>{dayNumber(day.date)}</Text>
                <Text style={styles.dayCode} numberOfLines={1}>
                  {day.code || '—'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <DayDetailSheet
        day={selectedDay}
        scan={scan}
        groups={groups}
        showHours={showHours}
        isHoliday={selectedDay !== null && holidaySet.has(selectedDay.date)}
        onClose={() => setSelectedDay(null)}
      />
    </View>
  );
}

const COLUMN_WIDTH = '14.28%';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    weekdayRow: {
      flexDirection: 'row',
    },
    weekdayText: {
      fontSize: 12,
      fontWeight: '700',
      opacity: 0.6,
      color: colors.text,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    cell: {
      width: COLUMN_WIDTH,
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 2,
    },
    dayBox: {
      width: '100%',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: 'center',
    },
    dayBoxHoliday: {
      borderColor: colors.holiday,
      borderWidth: 1,
    },
    dayBoxToday: {
      borderColor: colors.tint,
      borderWidth: 2,
    },
    dayLabel: {
      fontSize: 11,
      opacity: 0.7,
      marginBottom: 4,
      color: colors.text,
    },
    dayLabelToday: {
      color: colors.tint,
      fontWeight: '800',
      opacity: 1,
    },
    dayCode: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
  });
}
