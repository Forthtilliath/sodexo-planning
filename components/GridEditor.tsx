import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import CategoryHeader from '@/components/CategoryHeader';
import type { ThemeColors } from '@/constants/Colors';
import { useMyName } from '@/hooks/useMyName';
import { useThemeColors } from '@/hooks/useThemeColors';
import { normalizeName } from '@/lib/teams';
import type { RosterEntry, TeamGroup } from '@/types';

type Props = {
  days: string[]; // dates ISO, une par colonne
  employees: string[];
  grid: string[][];
  // Un salarié régulier actif est ajouté/retiré automatiquement (voir
  // l'écran Saisie) : le retirer à la main n'aurait aucun effet, il
  // réapparaîtrait aussitôt. Seuls les autres (intérimaires, noms
  // personnalisés...) proposent un bouton de retrait.
  removable: boolean[];
  // Pour regrouper les lignes par catégorie, comme dans Réglages > Salariés.
  roster: RosterEntry[];
  groups: TeamGroup[];
  onNewEmployee: () => void;
  onPickExisting: () => void;
  onRemoveEmployee: (rowIndex: number) => void;
  onOpenRow: (rowIndex: number) => void;
};

type Bucket = {
  key: string;
  label: string;
  color?: string;
  indices: number[];
};

/** Liste des salariés du planning, groupés par catégorie : un par ligne, avec un résumé de remplissage et un accès à l'éditeur par personne. */
export default function GridEditor({
  days,
  employees,
  grid,
  removable,
  roster,
  groups,
  onNewEmployee,
  onPickExisting,
  onRemoveEmployee,
  onOpenRow,
}: Props) {
  const colors = useThemeColors();
  const { myName } = useMyName();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Même regroupement que Réglages > Salariés / le sheet "+ Ajouter salarié" :
  // les groupes de postes assignables dans l'ordre, "Sans catégorie" en
  // dernier, catégories vides masquées. L'ordre des salariés au sein d'une
  // catégorie suit celui de la liste `employees` (pas de tri alphabétique ici).
  const buckets = useMemo<Bucket[]>(() => {
    const groupIdByName = new Map(roster.map((r) => [normalizeName(r.name), r.groupId]));
    const assignableGroups = groups.filter((g) => !g.weekendVariant);
    const defs: { key: string; label: string; color?: string; groupId?: string }[] = [
      ...assignableGroups.map((g) => ({ key: g.id, label: g.label || 'Groupe sans nom', color: g.color, groupId: g.id })),
      { key: 'none', label: 'Sans catégorie', color: undefined, groupId: undefined },
    ];
    return defs
      .map((def) => ({
        key: def.key,
        label: def.label,
        color: def.color,
        indices: employees
          .map((_, index) => index)
          .filter((index) => {
            const groupId = groupIdByName.get(normalizeName(employees[index]));
            return def.groupId ? groupId === def.groupId : !assignableGroups.some((g) => g.id === groupId);
          }),
      }))
      .filter((bucket) => bucket.indices.length > 0);
  }, [employees, roster, groups]);

  function renderRow(rowIndex: number) {
    const name = employees[rowIndex];
    const filledCount = (grid[rowIndex] ?? []).filter((c) => c.trim()).length;
    const isMe = normalizeName(name) === normalizeName(myName);
    return (
      <View key={rowIndex} style={[styles.row, isMe && styles.rowMe]}>
        {removable[rowIndex] && (
          <Pressable
            onPress={() => onRemoveEmployee(rowIndex)}
            hitSlop={10}
            style={styles.removeButton}
            accessibilityRole="button"
            accessibilityLabel={`Retirer ${name || `Employé ${rowIndex + 1}`} de ce mois`}>
            <Text style={styles.removeButtonText}>×</Text>
          </Pressable>
        )}
        <View style={styles.nameColumn}>
          <Text style={[styles.nameText, isMe && styles.nameTextMe]}>
            {name || `Employé ${rowIndex + 1}`}
          </Text>
          <Text style={styles.summaryText}>
            {filledCount} / {days.length} jours renseignés
          </Text>
        </View>
        <Pressable style={styles.openButton} onPress={() => onOpenRow(rowIndex)}>
          <Text style={styles.openButtonText}>Planning →</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      {buckets.map((bucket) => (
        <View key={bucket.key}>
          <CategoryHeader label={bucket.label} color={bucket.color} />
          {bucket.indices.map(renderRow)}
        </View>
      ))}

      <View style={styles.addRow}>
        <Pressable style={styles.addButton} onPress={onPickExisting}>
          <Text style={styles.addButtonText}>+ Ajouter salarié</Text>
        </Pressable>
        <Pressable style={styles.addButton} onPress={onNewEmployee}>
          <Text style={styles.addButtonText}>+ Nouveau salarié</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 8,
      padding: 8,
    },
    rowMe: {
      borderColor: colors.tint,
      borderWidth: 2,
      backgroundColor: colors.tintSoft,
    },
    removeButton: {
      paddingHorizontal: 4,
      paddingVertical: 4,
    },
    removeButtonText: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.dangerStrong,
    },
    nameColumn: {
      flex: 1,
    },
    nameText: {
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 4,
      color: colors.text,
    },
    nameTextMe: {
      color: colors.tint,
    },
    summaryText: {
      fontSize: 12,
      opacity: 0.7,
      color: colors.text,
    },
    openButton: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: colors.tint,
    },
    openButtonText: {
      color: colors.onTint,
      fontWeight: '600',
      fontSize: 13,
    },
    addRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    addButton: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      alignItems: 'center',
    },
    addButtonText: {
      fontWeight: '600',
      color: colors.text,
    },
  });
}
