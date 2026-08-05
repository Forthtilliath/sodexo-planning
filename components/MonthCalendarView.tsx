import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/Colors';
import { useResolvedScheme, useThemeColors } from '@/hooks/useThemeColors';
import { dayNumber, isToday, mondayFirstWeekday } from '@/lib/dates';
import { computeDayRoster, formatScheduleHours, type DayPlanning } from '@/lib/teams';
import type { ScanRecord, TeamGroup } from '@/types';

type Props = {
  planning: DayPlanning[]; // un élément par jour du mois, dans l'ordre
  holidays: string[]; // dates ISO fériées du mois
  showHours: boolean;
  scan: ScanRecord;
  groups: TeamGroup[];
};

const WEEKDAY_HEADERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function formatFullDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  const weekday = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][date.getDay()];
  return `${weekday} ${date.getDate()}`;
}

// En sombre, une même opacité rend le fond beaucoup plus terne (mélangé à du
// quasi-noir plutôt qu'à du blanc) : on pousse l'opacité pour que la couleur
// du groupe reste repérable, y compris à la lumière du jour.
function hexToSoftBackground(hex: string, isDark: boolean): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${isDark ? 0.45 : 0.22})`;
}

/** Vue calendrier en lecture seule : touche un jour pour voir qui travaille, groupé par équipe. */
export default function MonthCalendarView({ planning, holidays, showHours, scan, groups }: Props) {
  const colors = useThemeColors();
  const isDark = useResolvedScheme() === 'dark';
  const styles = useMemo(() => createStyles(colors), [colors]);
  const leadingBlanks = planning.length > 0 ? mondayFirstWeekday(planning[0].date) : 0;
  const holidaySet = new Set(holidays);

  function showDayInfo(day: DayPlanning) {
    const lines = [`Code : ${day.code || '—'}`];
    if (showHours && day.schedule) {
      lines.push(`Horaire : ${formatScheduleHours(day.schedule)}`);
    }

    const dayIndex = scan.days.indexOf(day.date);
    const roster = computeDayRoster(scan, dayIndex, groups);
    if (roster.length > 0) {
      lines.push('');
      for (const { group, members } of roster) {
        const names = members.map((m) => `${m.name} (${m.code})`).join(', ');
        lines.push(`${group?.label ?? 'Autres'} : ${names}`);
      }
    }

    Alert.alert(formatFullDate(day.date), lines.join('\n'));
  }

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
                onPress={() => showDayInfo(day)}>
                <Text style={[styles.dayLabel, isCurrentDay && styles.dayLabelToday]}>{dayNumber(day.date)}</Text>
                <Text style={styles.dayCode} numberOfLines={1}>
                  {day.code || '—'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
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
      borderWidth: 2,
    },
    dayBoxToday: {
      borderColor: colors.tint,
      borderWidth: 2,
      backgroundColor: colors.tintSoft,
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
