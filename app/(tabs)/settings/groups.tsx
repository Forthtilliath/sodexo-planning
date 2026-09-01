import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';

import AddButton from '@/components/AddButton';
import ColorPalettePicker, { COLOR_PALETTE } from '@/components/ColorPalettePicker';
import GroupCard from '@/components/GroupCard';
import type { ThemeColors } from '@/constants/Colors';
import { usePersistedDbState } from '@/hooks/useDbData';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getTeamGroups, saveTeamGroups } from '@/lib/db';
import { randomId } from '@/lib/id';
import type { TeamGroup } from '@/types';

const EMPTY_GROUPS: TeamGroup[] = [];

/** Couleur de la palette pas encore utilisée par un groupe existant, pour qu'un nouveau groupe ne récupère pas toujours la même. */
function nextColor(groups: TeamGroup[]): string {
  const used = new Set(groups.map((g) => g.color).filter(Boolean));
  return COLOR_PALETTE.find((c) => !used.has(c)) ?? COLOR_PALETTE[groups.length % COLOR_PALETTE.length];
}

export default function GroupsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // Lecture réactive + enregistrement automatique : une modif d'un groupe se
  // répercute partout (saisie, planning, réglages) sans quitter l'écran.
  const [groups, setGroups] = usePersistedDbState(getTeamGroups, saveTeamGroups, EMPTY_GROUPS);
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  // Verrouillé par défaut : une modif ici a un impact sur toute l'app
  // (couleurs/regroupement partout où un code de poste est affiché), pas
  // question de la déclencher par un tap accidentel.
  const [editMode, setEditMode] = useState(false);

  // Reverrouille à chaque retour sur l'écran, même si l'édition était en cours.
  useFocusEffect(
    useCallback(() => {
      setEditMode(false);
    }, [])
  );

  function addGroup() {
    setGroups((prev) => [...prev, { id: randomId(), label: '', codes: [], color: nextColor(prev) }]);
  }

  function removeGroup(id: string, label: string) {
    Alert.alert('Supprimer ce groupe ?', `"${label || 'Groupe sans nom'}" sera retiré.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => setGroups((prev) => prev.filter((g) => g.id !== id)),
      },
    ]);
  }

  function updateLabel(id: string, label: string) {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, label } : g)));
  }

  function updateCodes(id: string, codesText: string) {
    const codes = codesText
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, codes } : g)));
  }

  function updateColor(id: string, color: string) {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, color } : g)));
  }

  function toggleWeekendVariant(id: string) {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, weekendVariant: !g.weekendVariant } : g)));
  }

  const colorPickerGroup = groups.find((g) => g.id === colorPickerId);

  function renderGroupItem({ item: group, drag, isActive }: RenderItemParams<TeamGroup>) {
    return (
      <GroupCard
        group={group}
        editMode={editMode}
        isActive={isActive}
        onDrag={drag}
        onColorPress={() => setColorPickerId(group.id)}
        onLabelChange={(label) => updateLabel(group.id, label)}
        onCodesChange={(codesText) => updateCodes(group.id, codesText)}
        onRemove={() => removeGroup(group.id, group.label ?? '')}
        onToggleWeekendVariant={() => toggleWeekendVariant(group.id)}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* En dehors du DraggableFlatList (donc du scroll) exprès : ce bouton
          reste toujours visible en haut de l'écran, même après avoir scrollé
          jusqu'en bas d'une longue liste de groupes en édition. */}
      <Pressable
        style={[styles.editToggle, editMode && styles.editToggleActive]}
        onPress={() => setEditMode((v) => !v)}>
        <Text style={[styles.editToggleText, editMode && styles.editToggleTextActive]}>
          {editMode ? '✓ Terminé' : '✏️ Modifier les groupes'}
        </Text>
      </Pressable>

      {/* Toute la liste tient dans un seul DraggableFlatList — un seul
          composant scrollable pour tout l'écran, header/footer inclus : nester
          un second scrollable dedans entre en conflit avec le geste de scroll
          et bloque tout défilement. `containerStyle` (pas `style`) dimensionne
          le vrai wrapper englobant du composant. */}
      <DraggableFlatList
        style={styles.flatList}
        containerStyle={styles.flatList}
        contentContainerStyle={styles.content}
        data={groups}
        keyExtractor={(group) => group.id}
        renderItem={renderGroupItem}
        onDragEnd={({ data }) => editMode && setGroups(data)}
        activationDistance={0}
        initialNumToRender={groups.length}
        ListHeaderComponent={
          <Text style={styles.hint}>
            Un groupe = les codes de poste qui vont ensemble (ex: D1, D2, D3, D4). Ces codes servent aussi de boutons
            rapides dans "Salariés".
          </Text>
        }
        ListEmptyComponent={<Text style={styles.hint}>Aucun groupe configuré.</Text>}
        ListFooterComponent={editMode ? <AddButton label="+ Ajouter un groupe" onPress={addGroup} /> : null}
      />

      <ColorPalettePicker
        visible={colorPickerGroup !== undefined}
        onClose={() => setColorPickerId(null)}
        title={`Couleur de "${colorPickerGroup?.label || 'ce groupe'}"`}
        selectedColor={colorPickerGroup?.color}
        onSelect={(color) => colorPickerGroup && updateColor(colorPickerGroup.id, color)}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flatList: {
      flex: 1,
    },
    content: {
      padding: 16,
      paddingBottom: 48,
    },
    hint: {
      fontSize: 13,
      opacity: 0.7,
      marginBottom: 12,
      color: colors.text,
    },
    editToggle: {
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.tint,
      alignItems: 'center',
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 12,
    },
    editToggleActive: {
      backgroundColor: colors.tint,
    },
    editToggleText: {
      color: colors.tint,
      fontWeight: '700',
      fontSize: 13,
    },
    editToggleTextActive: {
      color: colors.onTint,
    },
  });
}
