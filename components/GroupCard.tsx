import { useMemo } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import ColorDot from '@/components/ColorDot';
import DragHandle from '@/components/DragHandle';
import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { TeamGroup } from '@/types';

type Props = {
  group: TeamGroup;
  editMode: boolean;
  isActive: boolean;
  onDrag: () => void;
  onColorPress: () => void;
  onLabelChange: (label: string) => void;
  onCodesChange: (codesText: string) => void;
  onRemove: () => void;
  onToggleWeekendVariant: () => void;
};

/** Une ligne de "Groupes de postes" : résumé en lecture seule, formulaire complet en mode édition. */
export default function GroupCard({
  group,
  editMode,
  isActive,
  onDrag,
  onColorPress,
  onLabelChange,
  onCodesChange,
  onRemove,
  onToggleWeekendVariant,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!editMode) {
    return (
      <View style={[styles.card, group.color && { borderLeftColor: group.color, borderLeftWidth: 4 }]}>
        <View style={styles.header}>
          <ColorDot color={group.color} size={24} />
          <Text style={styles.labelText}>{group.label || 'Groupe sans nom'}</Text>
          {group.weekendVariant && (
            <View style={styles.weekendBadge}>
              <Text style={styles.weekendBadgeText}>Week-end</Text>
            </View>
          )}
        </View>
        <Text style={styles.codesText}>{group.codes.join(', ') || 'Aucun code'}</Text>
        {group.weekendVariant && (
          <Text style={styles.weekendHint}>Masqué de la liste des catégories affectables aux salariés.</Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.card, isActive && styles.cardDragging]}>
      <View style={styles.header}>
        <DragHandle onPressIn={onDrag} disabled={isActive} accessibilityLabel={`Réordonner ${group.label || 'ce groupe'}`} />
        <Pressable
          style={[styles.colorSwatch, { backgroundColor: group.color ?? colors.border }]}
          onPress={onColorPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Changer la couleur du groupe"
        />
        <TextInput
          style={styles.labelInput}
          value={group.label}
          onChangeText={onLabelChange}
          placeholder="Nom du groupe"
          placeholderTextColor={colors.border}
        />
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Supprimer ${group.label || 'ce groupe'}`}>
          <Text style={styles.removeText}>×</Text>
        </Pressable>
      </View>
      <TextInput
        style={styles.codesInput}
        value={group.codes.join(', ')}
        onChangeText={onCodesChange}
        placeholder="D1, D2, D3, D4"
        placeholderTextColor={colors.border}
        autoCapitalize="characters"
      />
      <View style={styles.weekendRow}>
        <View style={styles.weekendRowText}>
          <Text style={styles.weekendRowLabel}>Variante week-end</Text>
          <Text style={styles.weekendHint}>
            Mêmes postes, code différent le week-end/férié. Masquée de la liste des catégories affectables aux
            salariés — ses codes restent proposés normalement.
          </Text>
        </View>
        <Switch value={!!group.weekendVariant} onValueChange={onToggleWeekendVariant} />
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    labelText: {
      fontWeight: '700',
      color: colors.text,
    },
    codesText: {
      opacity: 0.8,
      color: colors.text,
    },
    card: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 8,
      padding: 10,
      marginBottom: 10,
      backgroundColor: colors.background,
    },
    cardDragging: {
      borderColor: colors.tint,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    weekendBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      backgroundColor: colors.borderSubtle,
    },
    weekendBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text,
      opacity: 0.7,
    },
    weekendHint: {
      fontSize: 11,
      opacity: 0.6,
      marginTop: 4,
      color: colors.text,
    },
    weekendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 10,
    },
    weekendRowText: {
      flex: 1,
    },
    weekendRowLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    colorSwatch: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    labelInput: {
      flex: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
      paddingVertical: 4,
      color: colors.text,
    },
    removeText: {
      color: colors.dangerStrong,
      fontWeight: '700',
      fontSize: 20,
      paddingHorizontal: 4,
    },
    codesInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      padding: 8,
      color: colors.text,
    },
  });
}
