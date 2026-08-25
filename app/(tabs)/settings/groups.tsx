import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';

import BottomSheet from '@/components/BottomSheet';
import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getTeamGroups, saveTeamGroups } from '@/lib/db';
import type { TeamGroup } from '@/types';

// Deux teintes (claire/foncée) par famille de couleur, dans l'ordre de l'arc-
// en-ciel pour que la grille se parcoure naturellement, plus quelques neutres
// à la fin. L'historique du projet montre plusieurs ajustements passés à
// cause de couleurs trop proches (un rose confondu avec du rouge, un autre
// avec du vert-teal) — d'où des familles bien espacées sur la roue des teintes.
const COLOR_PALETTE = [
  // Rouge
  '#ef5350', '#d32f2f',
  // Orange foncé
  '#ff7043', '#e64a19',
  // Orange
  '#ffa726', '#f57c00',
  // Ambre
  '#ffca28', '#ffa000',
  // Jaune
  '#fdd835', '#f9a825',
  // Citron vert
  '#c0ca33', '#9e9d24',
  // Vert clair
  '#8bc34a', '#689f38',
  // Vert
  '#4caf50', '#388e3c',
  // Turquoise
  '#009688', '#00796b',
  // Cyan
  '#00bcd4', '#0097a7',
  // Bleu clair
  '#03a9f4', '#0288d1',
  // Bleu
  '#2196f3', '#1976d2',
  // Indigo
  '#3f51b5', '#303f9f',
  // Violet foncé
  '#673ab7', '#512da8',
  // Violet
  '#9c27b0', '#7b1fa2',
  // Rose
  '#e91e63', '#c2185b',
  // Neutres
  '#6d4c41', '#757575', '#546e7a',
];

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Couleur de la palette pas encore utilisée par un groupe existant, pour qu'un nouveau groupe ne récupère pas toujours la même. */
function nextColor(groups: TeamGroup[]): string {
  const used = new Set(groups.map((g) => g.color).filter(Boolean));
  return COLOR_PALETTE.find((c) => !used.has(c)) ?? COLOR_PALETTE[groups.length % COLOR_PALETTE.length];
}

export default function GroupsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  // Verrouillé par défaut : une modif ici a un impact sur toute l'app
  // (couleurs/regroupement partout où un code de poste est affiché), pas
  // question de la déclencher par un tap accidentel.
  const [editMode, setEditMode] = useState(false);

  const load = useCallback(async () => {
    setGroups(await getTeamGroups());
    setLoaded(true);
    // Reverrouille à chaque retour sur l'écran, même si l'édition était en cours.
    setEditMode(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (!loaded) return;
    saveTeamGroups(groups);
  }, [groups, loaded]);

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
    setColorPickerId(null);
  }

  const colorPickerGroup = groups.find((g) => g.id === colorPickerId);

  function renderEditableGroup({ item: group, drag, isActive }: RenderItemParams<TeamGroup>) {
    return (
      <View style={[styles.groupCard, isActive && styles.groupCardDragging]}>
        <View style={styles.groupHeader}>
          <Pressable
            onPressIn={drag}
            disabled={isActive}
            hitSlop={10}
            style={styles.dragHandle}
            accessibilityRole="button"
            accessibilityLabel={`Réordonner ${group.label || 'ce groupe'}`}>
            <Text style={styles.dragHandleText}>⠿</Text>
          </Pressable>
          <Pressable
            style={[styles.colorDot, { backgroundColor: group.color ?? colors.border }]}
            onPress={() => setColorPickerId(group.id)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Changer la couleur du groupe"
          />
          <TextInput
            style={styles.groupLabelInput}
            value={group.label}
            onChangeText={(v) => updateLabel(group.id, v)}
            placeholder="Nom du groupe"
            placeholderTextColor={colors.border}
          />
          <Pressable
            onPress={() => removeGroup(group.id, group.label ?? '')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Supprimer ${group.label || 'ce groupe'}`}>
            <Text style={styles.removeText}>×</Text>
          </Pressable>
        </View>
        <TextInput
          style={styles.codesInput}
          value={group.codes.join(', ')}
          onChangeText={(v) => updateCodes(group.id, v)}
          placeholder="D1, D2, D3, D4"
          placeholderTextColor={colors.border}
          autoCapitalize="characters"
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        Un groupe = les codes de poste qui vont ensemble (ex: D1, D2, D3, D4). Ces codes servent aussi de boutons
        rapides dans "Salariés".
      </Text>

      <Pressable
        style={[styles.editToggle, editMode && styles.editToggleActive]}
        onPress={() => setEditMode((v) => !v)}>
        <Text style={[styles.editToggleText, editMode && styles.editToggleTextActive]}>
          {editMode ? '✓ Terminé' : '✏️ Modifier les groupes'}
        </Text>
      </Pressable>

      {groups.length === 0 && <Text style={styles.hint}>Aucun groupe configuré.</Text>}

      {editMode ? (
        <DraggableFlatList
          data={groups}
          keyExtractor={(group) => group.id}
          renderItem={renderEditableGroup}
          onDragEnd={({ data }) => setGroups(data)}
          // Liste courte, imbriquée dans le ScrollView de l'écran : pas de
          // scroll ni de virtualisation propres, on laisse le ScrollView
          // parent s'en charger (voir "Nested VirtualizedLists").
          scrollEnabled={false}
          initialNumToRender={groups.length}
          activationDistance={0}
        />
      ) : (
        groups.map((group) => (
          <View
            key={group.id}
            style={[styles.groupCard, group.color && { borderLeftColor: group.color, borderLeftWidth: 4 }]}>
            <View style={styles.groupHeader}>
              {group.color && <View style={[styles.colorDot, { backgroundColor: group.color }]} />}
              <Text style={styles.groupLabelText}>{group.label || 'Groupe sans nom'}</Text>
            </View>
            <Text style={styles.groupCodesText}>{group.codes.join(', ') || 'Aucun code'}</Text>
          </View>
        ))
      )}

      {editMode && (
        <Pressable style={styles.addButton} onPress={addGroup}>
          <Text style={styles.addButtonText}>+ Ajouter un groupe</Text>
        </Pressable>
      )}

      <BottomSheet visible={colorPickerGroup !== undefined} onClose={() => setColorPickerId(null)}>
        <Text style={styles.paletteTitle}>Couleur de "{colorPickerGroup?.label || 'ce groupe'}"</Text>
        <View style={styles.paletteGrid}>
          {COLOR_PALETTE.map((color) => (
            <Pressable
              key={color}
              style={[
                styles.paletteSwatch,
                { backgroundColor: color },
                colorPickerGroup?.color === color && styles.paletteSwatchSelected,
              ]}
              onPress={() => colorPickerGroup && updateColor(colorPickerGroup.id, color)}
              accessibilityRole="button"
              accessibilityLabel={`Couleur ${color}`}
            />
          ))}
        </View>
      </BottomSheet>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
    groupLabelText: {
      fontWeight: '700',
      color: colors.text,
    },
    groupCodesText: {
      opacity: 0.8,
      color: colors.text,
    },
    groupCard: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 8,
      padding: 10,
      marginBottom: 10,
      backgroundColor: colors.background,
    },
    groupCardDragging: {
      borderColor: colors.tint,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    dragHandle: {
      paddingHorizontal: 4,
      paddingVertical: 4,
    },
    dragHandleText: {
      fontSize: 20,
      opacity: 0.5,
      color: colors.text,
    },
    colorDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    groupLabelInput: {
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
    addButton: {
      marginTop: 4,
      padding: 12,
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
    paletteTitle: {
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 12,
      paddingHorizontal: 20,
      color: colors.text,
    },
    paletteGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
      paddingHorizontal: 20,
    },
    paletteSwatch: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    paletteSwatchSelected: {
      borderWidth: 3,
      borderColor: colors.text,
    },
  });
}
