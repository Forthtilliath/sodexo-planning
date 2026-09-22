import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import PickerListSheet from '@/components/PickerListSheet';
import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { normalizeName } from '@/lib/teams';
import type { RosterEntry, ScanRecord, TeamGroup } from '@/types';

type Props = {
  scan: ScanRecord;
  roster: RosterEntry[];
  groups: TeamGroup[];
  myRowIndex: number;
  viewingIndex: number;
  viewingSomeoneElse: boolean;
  // null = revenir sur "mon" planning.
  onViewName: (name: string | null) => void;
};

/** Bascule "Mon planning" / "Un collègue", avec la liste des collègues groupés par catégorie. */
export default function PlanningViewerSwitch({
  scan,
  roster,
  groups,
  myRowIndex,
  viewingIndex,
  viewingSomeoneElse,
  onViewName,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Même regroupement qu'ailleurs : groupes assignables dans l'ordre, "Sans
  // catégorie" en dernier, catégories vides masquées. Salariés dans l'ordre de
  // `employees` (pas de tri alphabétique).
  const sections = useMemo(() => {
    const groupIdByName = new Map(roster.map((r) => [normalizeName(r.name), r.groupId]));
    const assignableGroups = groups.filter((g) => !g.weekendVariant);
    const defs = [
      ...assignableGroups.map((g) => ({ key: g.id, label: g.label || 'Groupe sans nom', color: g.color, groupId: g.id as string | undefined })),
      { key: 'none', label: 'Sans catégorie', color: undefined, groupId: undefined as string | undefined },
    ];
    return defs
      .map((def) => ({
        key: def.key,
        label: def.label,
        color: def.color,
        items: scan.employees
          .map((name, index) => ({ name, index }))
          .filter(({ name }) => {
            const groupId = groupIdByName.get(normalizeName(name));
            return def.groupId ? groupId === def.groupId : !assignableGroups.some((g) => g.id === groupId);
          })
          .map(({ name, index }) => ({
            key: String(index),
            label: `${name || `Ligne ${index + 1}`}${index === myRowIndex ? ' (moi)' : ''}`,
            highlight: index === myRowIndex,
          })),
      }))
      .filter((section) => section.items.length > 0);
  }, [scan, roster, groups, myRowIndex]);

  if (scan.employees.length === 0) return null;

  return (
    <>
      <View style={styles.row}>
        <Pressable style={[styles.button, !viewingSomeoneElse && styles.buttonActive]} onPress={() => onViewName(null)}>
          <Text style={[styles.buttonText, !viewingSomeoneElse && styles.buttonTextActive]}>🙋 Mon planning</Text>
        </Pressable>
        <Pressable style={[styles.button, viewingSomeoneElse && styles.buttonActive]} onPress={() => setPickerOpen(true)}>
          <Text style={[styles.buttonText, viewingSomeoneElse && styles.buttonTextActive]} numberOfLines={1}>
            {viewingSomeoneElse ? `👥 ${scan.employees[viewingIndex] || 'Collègue'}` : '👥 Un collègue'}
          </Text>
        </Pressable>
      </View>

      <PickerListSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        sections={sections}
        onSelect={(key) => onViewName(scan.employees[Number(key)] ?? null)}
      />
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    button: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    buttonActive: {
      backgroundColor: colors.tint,
      borderColor: colors.tint,
    },
    buttonText: {
      fontWeight: '600',
      color: colors.text,
    },
    buttonTextActive: {
      color: colors.onTint,
    },
  });
}
