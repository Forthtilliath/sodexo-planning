import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { dayNumber, mondayFirstWeekday } from '@/lib/dates';

type Props = {
  days: string[]; // dates ISO du mois
  holidays: Set<string>;
  onToggle: (iso: string) => void;
};

const WEEKDAY_HEADERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/**
 * Marque les jours fériés du mois (en plus des week-ends, déjà traités à
 * part) : ces jours-là, seuls les codes F1 à F5 ont du sens.
 */
export default function HolidayPicker({ days, holidays, onToggle }: Props) {
  const [expanded, setExpanded] = useState(false);
  const leadingBlanks = days.length > 0 ? mondayFirstWeekday(days[0]) : 0;

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
            {days.map((day) => {
              const isHoliday = holidays.has(day);
              return (
                <View key={day} style={styles.cell}>
                  <Pressable
                    style={[styles.dayBox, isHoliday && styles.dayBoxSelected]}
                    onPress={() => onToggle(day)}>
                    <Text style={[styles.dayText, isHoliday && styles.dayTextSelected]}>{dayNumber(day)}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const COLUMN_WIDTH = '14.28%';

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  toggleButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2f95dc',
    alignSelf: 'flex-start',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2f95dc',
  },
  hint: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 6,
    marginBottom: 6,
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayText: {
    fontSize: 11,
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
    paddingVertical: 2,
  },
  dayBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#999',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBoxSelected: {
    backgroundColor: '#a33',
    borderColor: '#a33',
  },
  dayText: {
    fontSize: 12,
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
});
