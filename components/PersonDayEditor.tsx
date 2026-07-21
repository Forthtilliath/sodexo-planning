import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = {
  employeeName: string;
  days: string[]; // dates ISO, une par colonne
  codes: string[]; // un code par jour, pour cette seule personne
  codeOptions: string[]; // codes habituels de cette personne (Réglages), proposés en boutons rapides
  allCodes: string[]; // tous les codes connus (groupes de postes), pour affecter autre chose que les codes habituels
  holidays: Set<string>; // dates ISO fériées du mois
  onChangeCode: (colIndex: number, value: string) => void;
  onSave: () => Promise<void>;
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
export default function PersonDayEditor({
  employeeName,
  days,
  codes,
  codeOptions,
  allCodes,
  holidays,
  onChangeCode,
  onSave,
  onClose,
}: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [otherCodeModalOpen, setOtherCodeModalOpen] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const cells = useMemo(() => buildCells(days), [days]);
  const leadingBlanks = days.length > 0 ? mondayFirstWeekday(days[0]) : 0;

  // Jours normaux : jamais de F1-F5, seulement les autres codes habituels.
  // Week-ends et jours fériés : seulement les F1-F5 qui font partie des codes
  // habituels de la personne (pas la liste complète). Sélection mixte : les
  // deux jeux de codes habituels, sans restriction.
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

  // Le reste des codes connus, pour affecter un poste qui n'est pas habituel
  // à cette personne (couvre-poste, remplacement...).
  const otherCodes = useMemo(
    () => allCodes.filter((c) => !quickCodes.includes(c)),
    [allCodes, quickCodes]
  );

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

  function clearSelection() {
    setSelected(new Set());
  }

  function applyQuickCode(code: string) {
    selected.forEach((col) => {
      onChangeCode(col, code);
    });
    clearSelection();
  }

  async function handleSavePress() {
    if (saveState === 'saving') return;
    setSaveState('saving');
    try {
      await onSave();
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1500);
    } catch (err) {
      console.error('save from person editor failed', err);
      setSaveState('idle');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={styles.backText}>← Retour à la liste</Text>
        </Pressable>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {employeeName || 'Employé sans nom'}
          </Text>
          <Pressable
            style={[styles.saveButton, saveState === 'saving' && styles.saveButtonDisabled]}
            disabled={saveState === 'saving'}
            onPress={handleSavePress}>
            {saveState === 'saving' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>{saveState === 'saved' ? '✓ Enregistré' : '💾 Enregistrer'}</Text>
            )}
          </Pressable>
        </View>
      </View>

      <Text style={styles.hint}>Touche un ou plusieurs jours puis un poste — ça remplit tous les jours sélectionnés d'un coup.</Text>

      {/* Toujours montée (jamais démontée) pour ne pas décaler le calendrier
          à chaque sélection/désélection : juste grisée quand rien n'est
          sélectionné, plutôt que de disparaître. */}
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
          const value = codes[primaryIndex] ?? '';
          const indices = cellIndices(cell);
          const isSelected = indices.length > 0 && indices.every((i) => selected.has(i));
          const isHoliday = indices.some((i) => holidays.has(days[i]));
          const key = cell.kind === 'weekend' ? `we-${cell.satIndex}` : `d-${cell.index}`;

          return (
            <View key={key} style={[styles.dayCell, isWeekend && styles.weekendCell]}>
              <Pressable
                style={[styles.daySelectBox, isHoliday && styles.daySelectBoxHoliday, isSelected && styles.dayCellSelected]}
                onPress={() => toggleCell(cell)}>
                {cell.kind === 'weekend' ? (
                  // L'en-tête dit déjà "WE" : ici on montre les deux jours
                  // comme s'ils étaient dans deux cases séparées par une
                  // ligne, même si le poste reste commun aux deux.
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

      <Modal
        visible={otherCodeModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setOtherCodeModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOtherCodeModalOpen(false)}>
          <View style={styles.modalCard}>
            <ScrollView>
              {otherCodes.map((code) => (
                <Pressable
                  key={code}
                  style={styles.modalOption}
                  onPress={() => {
                    applyQuickCode(code);
                    setOtherCodeModalOpen(false);
                  }}>
                  <Text style={styles.modalOptionText}>{code}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#2f95dc',
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
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
  weekendLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  weekendDayText: {
    fontSize: 11,
    opacity: 0.7,
  },
  weekendDivider: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  weekendDividerSelected: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dayValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  dayValueSelected: {
    color: '#fff',
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
  otherCodeButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2f95dc',
    backgroundColor: '#fff',
  },
  otherCodeButtonText: {
    color: '#2f95dc',
    fontWeight: '700',
    fontSize: 13,
  },
  bulkClearButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  bulkClearText: {
    color: '#a33',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
