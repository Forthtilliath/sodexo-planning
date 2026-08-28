import { useMemo } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import ColorDot from '@/components/ColorDot';
import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { isRegular } from '@/lib/teams';
import type { RosterEntry, TeamGroup } from '@/types';

type Props = {
  entry: RosterEntry;
  index: number;
  // Fiche de "ma" ligne : nom non éditable ici (ça se renomme dans Réglages ›
  // Mon nom) et pas de suppression.
  isMe?: boolean;
  assignableGroups: TeamGroup[];
  allKnownCodes: string[];
  employeeCodes: string[];
  onChangeName: (value: string) => void;
  onEditMyName?: () => void;
  onToggleArchived: () => void;
  onToggleRegular: () => void;
  onSetCategory: (groupId: string | undefined) => void;
  onToggleCode: (code: string) => void;
  onDelete: () => void;
};

/** Contenu du BottomSheet de détail d'un salarié : nom, statut, catégorie et codes habituels. */
export default function RosterEntrySheet({
  entry,
  index,
  isMe = false,
  assignableGroups,
  allKnownCodes,
  employeeCodes,
  onChangeName,
  onEditMyName,
  onToggleArchived,
  onToggleRegular,
  onSetCategory,
  onToggleCode,
  onDelete,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.content}>
      {isMe ? (
        <Pressable style={styles.meNameRow} onPress={onEditMyName}>
          <Text style={styles.meName}>{entry.name || 'Moi'}</Text>
          <Text style={styles.meNameHint}>C'est toi · touche pour te renommer dans Réglages › Mon nom</Text>
        </Pressable>
      ) : (
        <TextInput
          style={styles.nameInput}
          value={entry.name}
          onChangeText={onChangeName}
          placeholder={`Salarié ${index + 1}`}
          placeholderTextColor={colors.border}
        />
      )}

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Archivé</Text>
        <Switch value={!entry.active} onValueChange={onToggleArchived} />
      </View>
      <Text style={styles.switchHint}>
        N'apparaît plus dans la liste ni dans les nouveaux mois, mais reste dans les plannings existants.
      </Text>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Salarié régulier</Text>
        <Switch value={isRegular(entry)} onValueChange={onToggleRegular} />
      </View>
      <Text style={styles.switchHint}>
        Ajouté automatiquement à chaque nouveau planning. Désactive pour un intérimaire de passage.
      </Text>

      <Text style={styles.sectionLabel}>Catégorie principale</Text>
      <Text style={styles.switchHint}>
        Sert uniquement à trier et regrouper la liste — un salarié peut occasionnellement travailler ailleurs.
      </Text>
      <View style={styles.categoryPickerRow}>
        <Pressable
          style={[styles.categoryChip, !entry.groupId && styles.categoryChipActive]}
          onPress={() => onSetCategory(undefined)}>
          <Text style={[styles.categoryChipText, !entry.groupId && styles.categoryChipTextActive]}>Aucune</Text>
        </Pressable>
        {assignableGroups.map((g) => (
          <Pressable
            key={g.id}
            style={[styles.categoryChip, entry.groupId === g.id && styles.categoryChipActive]}
            onPress={() => onSetCategory(g.id)}>
            <ColorDot color={g.color} size={8} />
            <Text style={[styles.categoryChipText, entry.groupId === g.id && styles.categoryChipTextActive]}>
              {g.label || 'Sans nom'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Codes habituels</Text>
      {allKnownCodes.length > 0 ? (
        <View style={styles.codeChipsRow}>
          {allKnownCodes.map((code) => {
            const active = employeeCodes.includes(code);
            return (
              <Pressable
                key={code}
                style={[styles.codeChip, active && styles.codeChipActive]}
                onPress={() => onToggleCode(code)}>
                <Text style={[styles.codeChipText, active && styles.codeChipTextActive]}>{code}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={styles.switchHint}>Ajoute d'abord des groupes de postes pour voir les codes ici.</Text>
      )}

      {!isMe && (
        <Pressable
          style={styles.deleteButton}
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={`Supprimer ${entry.name || 'ce salarié'}`}>
          <Text style={styles.deleteButtonText}>🗑️ Supprimer ce salarié</Text>
        </Pressable>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 20,
    },
    nameInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
      marginBottom: 16,
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    meNameRow: {
      borderWidth: 1,
      borderColor: colors.tint,
      borderRadius: 8,
      padding: 10,
      marginBottom: 16,
    },
    meName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.tint,
    },
    meNameHint: {
      fontSize: 12,
      opacity: 0.7,
      marginTop: 4,
      color: colors.text,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    switchLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    switchHint: {
      fontSize: 12,
      opacity: 0.6,
      marginBottom: 16,
      color: colors.text,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 8,
      color: colors.text,
    },
    categoryPickerRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryChipActive: {
      backgroundColor: colors.tint,
      borderColor: colors.tint,
    },
    categoryChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    categoryChipTextActive: {
      color: colors.onTint,
    },
    codeChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 20,
    },
    codeChip: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    codeChipActive: {
      backgroundColor: colors.tint,
      borderColor: colors.tint,
    },
    codeChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    codeChipTextActive: {
      color: colors.onTint,
    },
    deleteButton: {
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: colors.dangerSoft,
    },
    deleteButtonText: {
      color: colors.dangerStrong,
      fontWeight: '700',
    },
  });
}
