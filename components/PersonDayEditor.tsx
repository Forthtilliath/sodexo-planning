import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import OptionsModal from '@/components/OptionsModal';
import type { ThemeColors } from '@/constants/Colors';
import { useResolvedScheme, useThemeColors } from '@/hooks/useThemeColors';
import { hexToSoftBackground } from '@/lib/colors';
import { dayNumber, mondayFirstWeekday } from '@/lib/dates';
import { findGroupForCode } from '@/lib/teams';
import type { TeamGroup } from '@/types';

type Props = {
  days: string[]; // dates ISO, une par colonne
  codes: string[]; // un code par jour, pour cette seule personne
  codeOptions: string[]; // codes habituels de la personne, en boutons rapides
  allCodes: string[]; // tous les codes connus, pour affecter un poste non habituel
  groups: TeamGroup[]; // pour colorer chaque jour selon le poste affecté
  holidays: Set<string>; // dates ISO fériées du mois
  onChangeCode: (colIndex: number, value: string) => void;
};

const WEEKDAY_HEADERS = ['L', 'M', 'M', 'J', 'V', 'WE'];
const HOLIDAY_CODES = ['F1', 'F2', 'F3', 'F4', 'F5'];

type Cell = { kind: 'day'; index: number } | { kind: 'weekend'; satIndex: number; sunIndex: number };

/** Week-end ou jour férié : ces jours-là, seuls les codes F1-F5 ont du sens. */
function isSpecialDay(iso: string, holidays: Set<string>): boolean {
  const weekday = new Date(`${iso}T00:00:00`).getDay();
  return weekday === 0 || weekday === 6 || holidays.has(iso);
}

/** Fusionne samedi+dimanche consécutifs en une seule case "WE" (presque toujours le même poste les deux jours). */
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

/** Édite le planning d'une personne en grille calendrier 7 colonnes (lundi-dimanche, week-end fusionné en case "WE"). */
export default function PersonDayEditor({
  days,
  codes,
  codeOptions,
  allCodes,
  groups,
  holidays,
  onChangeCode,
}: Props) {
  const colors = useThemeColors();
  const isDark = useResolvedScheme() === 'dark';
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [otherCodeModalOpen, setOtherCodeModalOpen] = useState(false);

  const cells = useMemo(() => buildCells(days), [days]);
  const leadingBlanks = days.length > 0 ? mondayFirstWeekday(days[0]) : 0;

  // Jours normaux : codes habituels sauf F1-F5. Week-ends/fériés : seulement
  // les F1-F5 habituels. Sélection mixte : tous les codes habituels.
  const quickCodes = useMemo(() => {
    if (selected.size === 0) return codeOptions;
    const indices = Array.from(selected);
    const specialFlags = indices.map((i) => isSpecialDay(days[i], holidays));
    const allSpecial = specialFlags.every(Boolean);
    const allNormal = specialFlags.every((v) => !v);
    if (allSpecial) return codeOptions.filter((c) => HOLIDAY_CODES.includes(c));
    if (allNormal) return codeOptions.filter((c) => !HOLIDAY_CODES.includes(c));
    return codeOptions;
  }, [selected, days, holidays, codeOptions]);

  // Le reste des codes connus (couvre-poste, remplacement...).
  const otherCodes = useMemo(
    () => allCodes.filter((c) => !quickCodes.includes(c)),
    [allCodes, quickCodes]
  );

  function cellIndices(cell: Cell): number[] {
    return cell.kind === 'day' ? [cell.index] : [cell.satIndex, cell.sunIndex];
  }

  function toggleCell(cell: Cell) {
    Haptics.selectionAsync();
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

  function clearSelection() {
    setSelected(new Set());
  }

  function applyQuickCode(code: string) {
    selected.forEach((col) => {
      onChangeCode(col, code);
    });
    clearSelection();
  }

  return (
    <View style={styles.container}>
      {/* Toujours montée (juste grisée si rien de sélectionné) pour ne pas
          décaler le calendrier à chaque sélection. */}
      <View style={[styles.bulkBar, selected.size === 0 && styles.bulkBarDisabled]}>
        {quickCodes.length > 0 && (
          <View style={styles.chipsRow}>
            {quickCodes.map((code) => (
              <Pressable key={code} style={styles.chip} disabled={selected.size === 0} onPress={() => applyQuickCode(code)}>
                <Text style={styles.chipText}>{code}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <View style={styles.bulkRow}>
          <Pressable
            style={styles.emptyCodeButton}
            disabled={selected.size === 0}
            onPress={() => applyQuickCode('')}>
            <Text style={styles.emptyCodeButtonText}>✕ Vider</Text>
          </Pressable>
          {otherCodes.length > 0 && (
            <Pressable
              style={styles.otherCodeButton}
              disabled={selected.size === 0}
              onPress={() => setOtherCodeModalOpen(true)}>
              <Text style={styles.otherCodeButtonText}>Autre poste ▾</Text>
            </Pressable>
          )}
          <Pressable style={styles.bulkClearButton} disabled={selected.size === 0} onPress={clearSelection}>
            <Text style={styles.bulkClearText}>Annuler</Text>
          </Pressable>
        </View>
      </View>

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
          const value = codes[primaryIndex] ?? '';
          const indices = cellIndices(cell);
          const isSelected = indices.length > 0 && indices.every((i) => selected.has(i));
          const isHoliday = indices.some((i) => holidays.has(days[i]));
          const group = value ? findGroupForCode(value, groups) : undefined;
          const key = cell.kind === 'weekend' ? `we-${cell.satIndex}` : `d-${cell.index}`;

          return (
            <View key={key} style={[styles.dayCell, isWeekend && styles.weekendCell]}>
              <Pressable
                style={[
                  styles.daySelectBox,
                  group?.color && { backgroundColor: hexToSoftBackground(group.color, isDark) },
                  isHoliday && styles.daySelectBoxHoliday,
                  isSelected && styles.dayCellSelected,
                ]}
                onPress={() => toggleCell(cell)}>
                {cell.kind === 'weekend' ? (
                  // Les deux quantièmes séparés par un trait, même si le poste
                  // reste commun aux deux jours.
                  <View style={styles.weekendLabelRow}>
                    <Text style={[styles.weekendDayText, isSelected && styles.dayLabelSelected]}>
                      {dayNumber(days[cell.satIndex])}
                    </Text>
                    <View style={[styles.weekendDivider, isSelected && styles.weekendDividerSelected]} />
                    <Text style={[styles.weekendDayText, isSelected && styles.dayLabelSelected]}>
                      {dayNumber(days[cell.sunIndex])}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>
                    {dayNumber(days[cell.index])}
                  </Text>
                )}
                <Text style={[styles.dayValue, isSelected && styles.dayValueSelected]}>{value || '—'}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <Text style={styles.hint}>Touche un ou plusieurs jours puis un poste — ça remplit tous les jours sélectionnés d'un coup.</Text>
      {holidays.size > 0 && <Text style={styles.holidayLegend}>🟧 Bordure orange = jour férié</Text>}

      <OptionsModal
        visible={otherCodeModalOpen}
        onClose={() => setOtherCodeModalOpen(false)}
        options={otherCodes.map((code) => ({ value: code, label: code }))}
        onSelect={applyQuickCode}
      />
    </View>
  );
}

const COLUMN_WIDTH = '14.28%';
const WEEKEND_WIDTH = '28.56%';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      marginTop: 0,
    },
    hint: {
      fontSize: 12,
      opacity: 0.7,
      marginTop: 12,
      color: colors.text,
    },
    holidayLegend: {
      fontSize: 12,
      opacity: 0.7,
      marginTop: 4,
      color: colors.text,
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
      color: colors.text,
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
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: 'center',
    },
    dayCellSelected: {
      backgroundColor: colors.tint,
      borderColor: colors.tint,
    },
    dayLabel: {
      fontSize: 11,
      opacity: 0.7,
      marginBottom: 4,
      color: colors.text,
    },
    dayLabelSelected: {
      color: colors.onTint,
      opacity: 0.9,
    },
    weekendLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    weekendDayText: {
      fontSize: 11,
      opacity: 0.7,
      color: colors.text,
    },
    weekendDivider: {
      width: 1,
      height: 10,
      backgroundColor: 'rgba(128,128,128,0.3)',
    },
    weekendDividerSelected: {
      backgroundColor: 'rgba(255,255,255,0.5)',
    },
    dayValue: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    dayValueSelected: {
      color: colors.onTint,
    },
    daySelectBoxHoliday: {
      borderColor: colors.holiday,
      borderWidth: 2,
    },
    bulkBar: {
      marginTop: 4,
      padding: 10,
      borderRadius: 8,
      backgroundColor: colors.tintSoft,
    },
    bulkBarDisabled: {
      opacity: 0.4,
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
      backgroundColor: colors.tint,
    },
    chipText: {
      color: colors.onTint,
      fontWeight: '700',
      fontSize: 13,
    },
    bulkRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    emptyCodeButton: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.card,
    },
    emptyCodeButtonText: {
      color: colors.danger,
      fontWeight: '700',
      fontSize: 13,
    },
    otherCodeButton: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.tint,
      backgroundColor: colors.card,
    },
    otherCodeButtonText: {
      color: colors.tint,
      fontWeight: '700',
      fontSize: 13,
    },
    bulkClearButton: {
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    bulkClearText: {
      color: colors.danger,
    },
  });
}
