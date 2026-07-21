import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  employeeName: string;
  days: string[]; // dates ISO, une par colonne
  codes: string[]; // un code par jour, pour cette seule personne
  codeOptions: string[]; // codes habituels de cette personne (Réglages), proposés en boutons rapides
  holidays: Set<string>; // dates ISO fériées du mois
  onChangeCode: (colIndex: number, value: string) => void;
  onClose: () => void;
};

const WEEKDAY_HEADERS = ['L', 'M', 'M', 'J', 'V', 'WE'];
const HOLIDAY_CODES = ['F1', 'F2', 'F3', 'F4', 'F5'];

type Cell = { kind: 'day'; index: number } | { kind: 'weekend'; satIndex: number; sunIndex: number };

/** Index du jour de la semaine avec lundi = 0 ... dimanche = 6 (au lieu du dimanche = 0 par défaut de JS). */
function mondayFirstWeekday(iso: string): number {
  const jsDay = new Date(`${iso}T00:00:00`).getDay();
  return (jsDay + 6) % 7;
}

function dayNumber(iso: string): number {
  return new Date(`${iso}T00:00:00`).getDate();
}

/** Week-end ou jour férié : ces jours-là, seuls les codes F1-F5 ont du sens. */
function isSpecialDay(iso: string, holidays: Set<string>): boolean {
  const weekday = new Date(`${iso}T00:00:00`).getDay();
  return weekday === 0 || weekday === 6 || holidays.has(iso);
}

/**
 * Regroupe samedi+dimanche en une seule case "WE" quand les deux se suivent
 * (cas normal) : ce sont presque toujours le même poste les deux jours, pas
 * besoin de deux cases à remplir séparément.
 */
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

/**
 * Édite le planning d'une seule personne, en grille calendrier à 7 colonnes
 * (lundi à dimanche, week-end fusionné en une case "WE") : les jours sont
 * alignés sous leur vrai jour de la semaine, plus simple à repérer qu'une
 * liste qui défile.
 */
export default function PersonDayEditor({ employeeName, days, codes, codeOptions, holidays, onChangeCode, onClose }: Props) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkValue, setBulkValue] = useState('');

  const cells = useMemo(() => buildCells(days), [days]);
  const leadingBlanks = days.length > 0 ? mondayFirstWeekday(days[0]) : 0;

  // Week-ends et jours fériés ne proposent que F1-F5 ; les autres jours
  // proposent les codes habituels de la personne (Réglages). En cas de
  // sélection mixte, on propose les deux jeux de codes.
  const quickCodes = useMemo(() => {
    if (selected.size === 0) return codeOptions;
    const indices = Array.from(selected);
    const specialFlags = indices.map((i) => isSpecialDay(days[i], holidays));
    const allSpecial = specialFlags.every(Boolean);
    const allNormal = specialFlags.every((v) => !v);
    if (allSpecial) return HOLIDAY_CODES;
    if (allNormal) return codeOptions;
    return Array.from(new Set([...codeOptions, ...HOLIDAY_CODES]));
  }, [selected, days, holidays, codeOptions]);

  function toggleSelectionMode() {
    setSelectionMode((v) => !v);
    setSelected(new Set());
    setBulkValue('');
  }

  function cellIndices(cell: Cell): number[] {
    return cell.kind === 'day' ? [cell.index] : [cell.satIndex, cell.sunIndex];
  }

  function toggleCell(cell: Cell) {
    const indices = cellIndices(cell);
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = indices.every((i) => next.has(i));
      indices.forEach((i) => {
        if (allSelected) next.delete(i);
        else next.add(i);
      });
      return next;
    });
  }

  function setCellValue(cell: Cell, value: string) {
    cellIndices(cell).forEach((i) => {
      onChangeCode(i, value);
    });
  }

  function selectAll() {
    setSelected(new Set(days.map((_, i) => i)));
  }

  function clearSelection() {
    setSelected(new Set());
    setBulkValue('');
  }

  function applyBulkValue() {
    const value = bulkValue.trim().toUpperCase();
    selected.forEach((col) => {
      onChangeCode(col, value);
    });
    clearSelection();
  }

  function applyQuickCode(code: string) {
    selected.forEach((col) => {
      onChangeCode(col, code);
    });
    clearSelection();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={styles.backText}>← Retour à la liste</Text>
        </Pressable>
        <Text style={styles.name} numberOfLines={1}>
          {employeeName || 'Employé sans nom'}
        </Text>
      </View>

      <View style={styles.modeRow}>
        <Pressable style={styles.modeButton} onPress={toggleSelectionMode}>
          <Text style={styles.modeButtonText}>
            {selectionMode ? '✓ Sélection multiple active' : '🔲 Sélection multiple'}
          </Text>
        </Pressable>
        {selectionMode && (
          <Pressable style={styles.modeButton} onPress={selectAll}>
            <Text style={styles.modeButtonText}>Tout sélectionner</Text>
          </Pressable>
        )}
      </View>
      {selectionMode && (
        <Text style={styles.hint}>
          Touche plusieurs jours, tape un code, "Appliquer" — ça remplit tous les jours sélectionnés d'un coup.
        </Text>
      )}

      {holidays.size > 0 && <Text style={styles.holidayLegend}>🟧 Bordure orange = jour férié</Text>}

      <View style={styles.weekdayRow}>
        {WEEKDAY_HEADERS.map((w, i) => (
          <View key={i} style={[styles.weekdayCell, i === 5 && styles.weekendCell]}>
            <Text style={styles.weekdayText}>{w}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <View key={`blank-${i}`} style={styles.dayCell} />
        ))}
        {cells.map((cell) => {
          const isWeekend = cell.kind === 'weekend';
          const primaryIndex = cell.kind === 'day' ? cell.index : cell.kind === 'weekend' ? cell.satIndex : -1;
          const label = isWeekend ? 'WE' : String(dayNumber(days[primaryIndex]));
          const value = codes[primaryIndex] ?? '';
          const indices = cellIndices(cell);
          const isSelected = indices.length > 0 && indices.every((i) => selected.has(i));
          const isHoliday = indices.some((i) => holidays.has(days[i]));
          const key = cell.kind === 'weekend' ? `we-${cell.satIndex}` : `d-${cell.index}`;

          if (!selectionMode) {
            return (
              <View key={key} style={[styles.dayCell, isWeekend && styles.weekendCell]}>
                <Text style={styles.dayLabel}>{label}</Text>
                <TextInput
                  style={[styles.dayInput, isHoliday && styles.dayInputHoliday]}
                  value={value}
                  onChangeText={(v) => setCellValue(cell, v)}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
            );
          }

          return (
            <View key={key} style={[styles.dayCell, isWeekend && styles.weekendCell]}>
              <Pressable
                style={[styles.daySelectBox, isHoliday && styles.daySelectBoxHoliday, isSelected && styles.dayCellSelected]}
                onPress={() => toggleCell(cell)}>
                <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>{label}</Text>
                <Text style={[styles.dayValue, isSelected && styles.dayValueSelected]}>{value || '—'}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      {selectionMode && selected.size > 0 && (
        <View style={styles.bulkBar}>
          <Text style={styles.bulkLabel}>{selected.size} jour(s) sélectionné(s)</Text>
          {quickCodes.length > 0 && (
            <View style={styles.chipsRow}>
              {quickCodes.map((code) => (
                <Pressable key={code} style={styles.chip} onPress={() => applyQuickCode(code)}>
                  <Text style={styles.chipText}>{code}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <View style={styles.bulkRow}>
            <TextInput
              style={styles.bulkInput}
              value={bulkValue}
              onChangeText={setBulkValue}
              placeholder="Code (ex: D1)"
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Pressable style={styles.bulkApplyButton} onPress={applyBulkValue}>
              <Text style={styles.bulkApplyText}>Appliquer</Text>
            </Pressable>
            <Pressable style={styles.bulkClearButton} onPress={clearSelection}>
              <Text style={styles.bulkClearText}>Annuler</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const COLUMN_WIDTH = '14.28%';
const WEEKEND_WIDTH = '28.56%';

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  header: {
    marginBottom: 12,
  },
  backText: {
    color: '#2f95dc',
    fontWeight: '600',
    marginBottom: 8,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  modeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2f95dc',
  },
  modeButtonText: {
    color: '#2f95dc',
    fontWeight: '600',
    fontSize: 13,
  },
  hint: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 8,
  },
  holidayLegend: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  weekdayCell: {
    width: COLUMN_WIDTH,
    alignItems: 'center',
    paddingBottom: 4,
  },
  weekendCell: {
    width: WEEKEND_WIDTH,
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
  dayCell: {
    width: COLUMN_WIDTH,
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  daySelectBox: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dayCellSelected: {
    backgroundColor: '#2f95dc',
    borderColor: '#2f95dc',
  },
  dayLabel: {
    fontSize: 11,
    opacity: 0.7,
    marginBottom: 4,
  },
  dayLabelSelected: {
    color: '#fff',
    opacity: 0.9,
  },
  dayValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  dayValueSelected: {
    color: '#fff',
  },
  dayInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    padding: 6,
    textAlign: 'center',
    fontSize: 12,
  },
  dayInputHoliday: {
    borderColor: '#e08a00',
    borderWidth: 2,
  },
  daySelectBoxHoliday: {
    borderColor: '#e08a00',
    borderWidth: 2,
  },
  bulkBar: {
    marginTop: 16,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(47,149,220,0.1)',
  },
  bulkLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#2f95dc',
  },
  chipText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  bulkRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  bulkInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#fff',
  },
  bulkApplyButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#2f95dc',
  },
  bulkApplyText: {
    color: '#fff',
    fontWeight: '700',
  },
  bulkClearButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  bulkClearText: {
    color: '#a33',
  },
});
