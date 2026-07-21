import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { DayPlanning } from '@/lib/teams';

type Props = {
  planning: DayPlanning[]; // un élément par jour du mois, dans l'ordre
  holidays: string[]; // dates ISO fériées du mois
};

const WEEKDAY_HEADERS = ['L', 'M', 'M', 'J', 'V', 'WE'];

type Cell = { kind: 'day'; index: number } | { kind: 'weekend'; satIndex: number; sunIndex: number };

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

/** Même regroupement samedi+dimanche que dans l'éditeur, pour une mise en page familière. */
function buildCells(days: string[]): Cell[] {
  const cells: Cell[] = [];
  let i = 0;
  while (i < days.length) {
    const weekday = new Date(`${days[i]}T00:00:00`).getDay();
    if (weekday === 6 && i + 1 < days.length) {
      const nextWeekday = new Date(`${days[i + 1]}T00:00:00`).getDay();
      if (nextWeekday === 0) {
        cells.push({ kind: 'weekend', satIndex: i, sunIndex: i + 1 });
        i += 2;
        continue;
      }
    }
    cells.push({ kind: 'day', index: i });
    i += 1;
  }
  return cells;
}

/** Vue calendrier en lecture seule (même mise en page à 7 colonnes que la saisie manuelle) : touche un jour pour voir le détail. */
export default function MonthCalendarView({ planning, holidays }: Props) {
  const days = planning.map((p) => p.date);
  const cells = buildCells(days);
  const leadingBlanks = days.length > 0 ? mondayFirstWeekday(days[0]) : 0;
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
          <View key={i} style={[styles.cell, i === 5 && styles.weekendCell]}>
            <Text style={styles.weekdayText}>{w}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <View key={`blank-${i}`} style={styles.cell} />
        ))}
        {cells.map((cell) => {
          const isWeekend = cell.kind === 'weekend';
          const primaryIndex = cell.kind === 'day' ? cell.index : cell.satIndex;
          const label = isWeekend ? 'WE' : String(dayNumber(days[primaryIndex]));
          const day = planning[primaryIndex];
          const isHoliday =
            cell.kind === 'day'
              ? holidaySet.has(days[cell.index])
              : holidaySet.has(days[cell.satIndex]) || holidaySet.has(days[cell.sunIndex]);
          const key = isWeekend ? `we-${cell.satIndex}` : `d-${cell.index}`;

          return (
            <View key={key} style={[styles.cell, isWeekend && styles.weekendCell]}>
              <Pressable style={[styles.dayBox, isHoliday && styles.dayBoxHoliday]} onPress={() => showDayInfo(day)}>
                <Text style={styles.dayLabel}>{label}</Text>
                <Text style={styles.dayCode} numberOfLines={1}>
                  {day.code || '—'}
                </Text>
                {day.teammates.length > 0 && <View style={styles.teammateDot} />}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const COLUMN_WIDTH = '14.28%';
const WEEKEND_WIDTH = '28.56%';

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
  weekendCell: {
    width: WEEKEND_WIDTH,
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
  teammateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2f95dc',
    marginTop: 4,
  },
});
