import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { DayPlanning } from '@/lib/teams';

type Props = {
  planning: DayPlanning[]; // un élément par jour du mois, dans l'ordre
  holidays: string[]; // dates ISO fériées du mois
};

const WEEKDAY_HEADERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function mondayFirstWeekday(iso: string): number {
  const jsDay = new Date(`${iso}T00:00:00`).getDay();
  return (jsDay + 6) % 7;
}

function dayNumber(iso: string): number {
  return new Date(`${iso}T00:00:00`).getDate();
}

function formatFullDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  const weekday = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][date.getDay()];
  return `${weekday} ${date.getDate()}`;
}

/** Vue calendrier en lecture seule : touche un jour pour voir le détail (code + coéquipiers). */
export default function MonthCalendarView({ planning, holidays }: Props) {
  const leadingBlanks = planning.length > 0 ? mondayFirstWeekday(planning[0].date) : 0;
  const holidaySet = new Set(holidays);

  function showDayInfo(day: DayPlanning) {
    const lines = [`Code : ${day.code || '—'}`];
    if (day.teammates.length > 0) {
      lines.push(`Avec ${day.teammates.map((t) => t.name).join(', ')}`);
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
        {planning.map((day) => (
          <View key={day.date} style={styles.cell}>
            <Pressable
              style={[styles.dayBox, holidaySet.has(day.date) && styles.dayBoxHoliday]}
              onPress={() => showDayInfo(day)}>
              <Text style={styles.dayLabel}>{dayNumber(day.date)}</Text>
              <Text style={styles.dayCode} numberOfLines={1}>
                {day.code || '—'}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const COLUMN_WIDTH = '14.28%';

const styles = StyleSheet.create({
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.6,
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
    borderColor: '#999',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dayBoxHoliday: {
    borderColor: '#e08a00',
    borderWidth: 2,
  },
  dayLabel: {
    fontSize: 11,
    opacity: 0.7,
    marginBottom: 4,
  },
  dayCode: {
    fontSize: 13,
    fontWeight: '700',
  },
});
