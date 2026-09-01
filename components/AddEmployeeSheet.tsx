import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import BottomSheet from '@/components/BottomSheet';
import CategoryHeader from '@/components/CategoryHeader';
import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { isRegular, normalizeName } from '@/lib/teams';
import type { RosterEntry, TeamGroup } from '@/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  roster: RosterEntry[];
  groups: TeamGroup[];
  excludeNames: string[]; // déjà dans ce planning, à ne pas re-proposer
  onPick: (name: string) => void;
};

type Bucket = {
  key: string;
  label: string;
  color?: string;
  entries: RosterEntry[];
};

/** Pour ajouter un salarié déjà connu (typiquement un intérimaire) à ce mois précis, sans passer par Réglages. */
export default function AddEmployeeSheet({ visible, onClose, roster, groups, excludeNames, onPick }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const buckets = useMemo(() => {
    const excluded = new Set(excludeNames.map(normalizeName));
    // Archivés jamais proposés ; variantes week-end exclues des catégories.
    const pickable = roster.filter((r) => r.active && r.name.trim() && !excluded.has(normalizeName(r.name)));
    const assignableGroups = groups.filter((g) => !g.weekendVariant);
    const sortByName = (a: RosterEntry, b: RosterEntry) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });

    const list: Bucket[] = [
      ...assignableGroups.map((g) => ({
        key: g.id,
        label: g.label || 'Groupe sans nom',
        color: g.color,
        entries: pickable.filter((r) => r.groupId === g.id).sort(sortByName),
      })),
      {
        key: 'none',
        label: 'Sans catégorie',
        color: undefined,
        entries: pickable.filter((r) => !assignableGroups.some((g) => g.id === r.groupId)).sort(sortByName),
      },
    ];
    return list.filter((bucket) => bucket.entries.length > 0);
  }, [roster, groups, excludeNames]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>Ajouter un salarié à ce mois</Text>
      <Text style={styles.hint}>
        Pour un intérimaire de passage, ou un régulier retiré par erreur — les réguliers actifs sont déjà ajoutés
        automatiquement.
      </Text>

      {buckets.length === 0 ? (
        <Text style={styles.emptyText}>Tous les salariés actifs sont déjà dans ce planning.</Text>
      ) : (
        <ScrollView style={styles.list}>
          {buckets.map((bucket) => (
            <View key={bucket.key}>
              <CategoryHeader label={bucket.label} color={bucket.color} />
              {bucket.entries.map((entry) => (
                <Pressable key={entry.name} style={styles.row} onPress={() => onPick(entry.name)}>
                  <Text style={styles.rowName}>{entry.name}</Text>
                  {!isRegular(entry) && <Text style={styles.rowTag}>Intérimaire</Text>}
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </BottomSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 6,
      paddingHorizontal: 20,
      color: colors.text,
    },
    hint: {
      fontSize: 12,
      opacity: 0.7,
      marginBottom: 12,
      paddingHorizontal: 20,
      color: colors.text,
    },
    emptyText: {
      fontSize: 13,
      opacity: 0.7,
      paddingHorizontal: 20,
      paddingBottom: 20,
      color: colors.text,
    },
    list: {
      paddingHorizontal: 20,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      backgroundColor: colors.card,
    },
    rowName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    rowTag: {
      fontSize: 11,
      fontWeight: '600',
      opacity: 0.6,
      color: colors.text,
    },
  });
}
