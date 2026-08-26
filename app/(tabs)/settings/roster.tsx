import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';

import BottomSheet from '@/components/BottomSheet';
import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getEmployeeCodeOptions, getEmployeeRoster, getTeamGroups, saveEmployeeCodeOptions, saveEmployeeRoster } from '@/lib/db';
import { CODE_DISPLAY_ORDER, isRegular, majorityCode, normalizeName } from '@/lib/teams';
import type { RosterEntry, TeamGroup } from '@/types';

type SortMode = 'manual' | 'alpha' | 'majority';
type IndexedEntry = readonly [RosterEntry, number];

// Une "catégorie" de la liste = un groupe de postes, plus une catégorie
// "Sans catégorie" en dernier pour ceux qui n'en ont pas.
type CategoryDef = { groupId: string | undefined; label: string; color?: string };

// Toute la liste (en-têtes de catégorie + salariés) tient dans un seul
// DraggableFlatList — un seul composant scrollable pour tout l'écran, header
// et footer inclus (recherche, tri, bouton d'ajout, archivés...) : nester un
// second scrollable dedans (même un DraggableFlatList "Nestable") entre en
// conflit avec le geste de scroll et bloque tout défilement.
type RosterListItem =
  | { type: 'header'; key: string; def: CategoryDef; count: number }
  | { type: 'entry'; key: string; index: number };

export default function RosterScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [codeOptions, setCodeOptions] = useState<Record<string, string[]>>({});
  const [loaded, setLoaded] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('manual');

  const load = useCallback(async () => {
    const [teamGroups, employeeRoster, options] = await Promise.all([
      getTeamGroups(),
      getEmployeeRoster(),
      getEmployeeCodeOptions(),
    ]);
    setGroups(teamGroups);
    setRoster(employeeRoster);
    setCodeOptions(options);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (!loaded) return;
    saveEmployeeRoster(roster);
  }, [roster, loaded]);

  useEffect(() => {
    if (!loaded) return;
    saveEmployeeCodeOptions(codeOptions);
  }, [codeOptions, loaded]);

  function addName() {
    setRoster((prev) => [...prev, { name: '', active: true }]);
  }

  function removeName(index: number, name: string) {
    Alert.alert('Supprimer ce salarié ?', `"${name || `Salarié ${index + 1}`}" sera retiré de la liste.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          setRoster((prev) => prev.filter((_, i) => i !== index));
          setOpenIndex(null);
        },
      },
    ]);
  }

  function updateName(index: number, value: string) {
    setRoster((prev) => prev.map((e, i) => (i === index ? { ...e, name: value } : e)));
  }

  // "Archivé" dans l'UI ; le champ garde son nom historique `active` (inversé).
  function toggleArchived(index: number) {
    setRoster((prev) => prev.map((e, i) => (i === index ? { ...e, active: !e.active } : e)));
  }

  function toggleRegular(index: number) {
    setRoster((prev) => prev.map((e, i) => (i === index ? { ...e, regular: !isRegular(e) } : e)));
  }

  function setCategory(index: number, groupId: string | undefined) {
    setRoster((prev) => prev.map((e, i) => (i === index ? { ...e, groupId } : e)));
  }

  // En tri Manuel, les catégories (groupes de postes) sont les en-têtes de la
  // liste glissable : on reconstitue l'ordre + la catégorie de chaque salarié
  // actif depuis la position finale de son en-tête, puis on recolle les
  // salariés archivés (jamais dans cette liste) tels quels.
  function applyManualDragEnd(data: RosterListItem[]) {
    let currentGroupId: string | undefined;
    const newActive: RosterEntry[] = [];
    for (const item of data) {
      if (item.type === 'header') {
        currentGroupId = item.def.groupId;
      } else {
        newActive.push({ ...roster[item.index], groupId: currentGroupId });
      }
    }
    const archived = roster.filter((e) => !e.active);
    setRoster([...newActive, ...archived]);
  }

  // Les codes proposés à cocher viennent des groupes de postes déjà définis :
  // pas besoin de les retaper, et ça reste cohérent avec le reste. On garde
  // aussi les codes des variantes week-end (F1-F5...) : seule la catégorie
  // (pas le code) est masquée de la liste des affectations.
  const allKnownCodes = useMemo(() => Array.from(new Set(groups.flatMap((g) => g.codes))).sort(), [groups]);
  // Catégories affectables à un salarié : une variante week-end (même poste,
  // code différent) n'est pas une "catégorie" à part entière — un salarié
  // reste rattaché à sa catégorie habituelle.
  const assignableGroups = groups.filter((g) => !g.weekendVariant);

  function toggleCodeForEmployee(name: string, code: string) {
    setCodeOptions((prev) => {
      const current = prev[name] ?? [];
      const nextCodes = current.includes(code) ? current.filter((c) => c !== code) : [...current, code].sort();
      const next = { ...prev };
      if (nextCodes.length === 0) delete next[name];
      else next[name] = nextCodes;
      return next;
    });
  }

  function majorityRank(name: string): number {
    const code = majorityCode(codeOptions[name] ?? []);
    if (!code) return CODE_DISPLAY_ORDER.length + 1;
    const idx = CODE_DISPLAY_ORDER.indexOf(code);
    return idx === -1 ? CODE_DISPLAY_ORDER.length : idx;
  }

  function sortEntries(entries: IndexedEntry[]): IndexedEntry[] {
    if (sortMode === 'alpha') {
      return [...entries].sort((a, b) => a[0].name.localeCompare(b[0].name, 'fr', { sensitivity: 'base' }));
    }
    if (sortMode === 'majority') {
      return [...entries].sort((a, b) => {
        const rankDiff = majorityRank(a[0].name) - majorityRank(b[0].name);
        return rankDiff !== 0 ? rankDiff : a[0].name.localeCompare(b[0].name, 'fr', { sensitivity: 'base' });
      });
    }
    return entries;
  }

  if (!loaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.hint}>Chargement des salariés…</Text>
      </View>
    );
  }

  const openEntry = openIndex !== null ? roster[openIndex] : null;

  function renderRow(entry: RosterEntry, index: number, dragHandle?: () => void, isDragging?: boolean) {
    const codesCount = (codeOptions[entry.name] ?? []).length;
    const category = groups.find((g) => g.id === entry.groupId);
    const summaryParts = [!isRegular(entry) ? 'Intérimaire' : null, codesCount > 0 ? `${codesCount} code(s)` : null]
      .filter(Boolean)
      .join(' · ');

    return (
      <View key={index} style={[styles.rosterCard, isDragging && styles.rosterCardDragging]}>
        {dragHandle && (
          <Pressable
            onPressIn={dragHandle}
            hitSlop={10}
            style={styles.dragHandle}
            accessibilityRole="button"
            accessibilityLabel={`Réordonner ${entry.name || `Salarié ${index + 1}`}`}>
            <Text style={styles.dragHandleText}>⠿</Text>
          </Pressable>
        )}
        <Pressable style={styles.rosterCardBody} onPress={() => setOpenIndex(index)}>
          {category?.color && <View style={[styles.categoryDot, { backgroundColor: category.color }]} />}
          <View style={styles.cardNameColumn}>
            <Text style={styles.cardName} numberOfLines={1}>
              {entry.name || `Salarié ${index + 1}`}
            </Text>
            {summaryParts.length > 0 && (
              <Text style={styles.cardSummary} numberOfLines={1}>
                {summaryParts}
              </Text>
            )}
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>
    );
  }

  // Toutes les catégories, "Sans catégorie" en dernier. En tri Manuel elles
  // restent listées même vides (cibles de dépôt valides) ; dans les autres
  // tris, seules celles qui contiennent au moins un salarié sont affichées.
  function categoryDefs(): CategoryDef[] {
    return [
      ...assignableGroups.map((g) => ({ groupId: g.id, label: g.label || 'Groupe sans nom', color: g.color })),
      { groupId: undefined, label: 'Sans catégorie' },
    ];
  }

  const searching = search.trim().length > 0;
  const matchesSearch = ([entry]: IndexedEntry) => !searching || normalizeName(entry.name).includes(normalizeName(search));

  const activeIndexed = roster.map((e, i) => [e, i] as const).filter(([e]) => e.active).filter(matchesSearch);
  const archivedIndexed = roster.map((e, i) => [e, i] as const).filter(([e]) => !e.active).filter(matchesSearch);
  const archivedVisible = showArchived || searching;

  function buildListItems(): RosterListItem[] {
    // La recherche traverse toutes les catégories : un seul groupe plat, sans en-tête.
    if (searching) {
      return sortEntries(activeIndexed).map(([, index]) => ({ type: 'entry', key: `e-${index}`, index }) as const);
    }
    const items: RosterListItem[] = [];
    for (const def of categoryDefs()) {
      const entries = sortEntries(
        activeIndexed.filter(([e]) =>
          def.groupId ? e.groupId === def.groupId : !assignableGroups.some((g) => g.id === e.groupId)
        )
      );
      if (sortMode !== 'manual' && entries.length === 0) continue;
      items.push({ type: 'header', key: `h-${def.groupId ?? 'none'}`, def, count: entries.length });
      for (const [, index] of entries) {
        items.push({ type: 'entry', key: `e-${index}`, index });
      }
    }
    return items;
  }

  const listItems = buildListItems();
  // Le glissé ne recatégorise/réordonne qu'en tri Manuel hors recherche ; dans
  // les autres modes, aucune poignée n'est rendue donc aucun glissé ne peut
  // être initié — cette garde n'est qu'un filet de sécurité sur onDragEnd.
  const draggingEnabled = sortMode === 'manual' && !searching;

  function renderListItem({ item, drag, isActive }: RenderItemParams<RosterListItem>) {
    if (item.type === 'header') {
      return (
        <View style={styles.categoryHeader}>
          {item.def.color && <View style={[styles.categoryDot, { backgroundColor: item.def.color }]} />}
          <Text style={styles.categoryHeaderText}>{item.def.label}</Text>
          {item.count === 0 && <Text style={styles.categoryEmptyHint}>glisse un salarié ici</Text>}
        </View>
      );
    }
    return renderRow(roster[item.index], item.index, draggingEnabled ? drag : undefined, isActive);
  }

  return (
    <View style={styles.container}>
      <DraggableFlatList
        // `style` ne dimensionne que la FlatList interne ; le vrai wrapper
        // englobant (celui qui gère le geste et la mesure du conteneur) est
        // dimensionné séparément via `containerStyle` — sans lui, ce wrapper
        // reste haut de zéro et tout l'écran (y compris header/footer) reste invisible.
        style={styles.flatList}
        containerStyle={styles.flatList}
        contentContainerStyle={styles.content}
        data={listItems}
        keyExtractor={(item) => item.key}
        renderItem={renderListItem}
        onDragEnd={({ data }) => draggingEnabled && applyManualDragEnd(data)}
        activationDistance={0}
        initialNumToRender={listItems.length}
        ListHeaderComponent={
          <>
            <Text style={styles.hint}>
              Touche un salarié pour voir/modifier ses codes, sa catégorie et son statut. Archive ceux qui ne
              travaillent plus avec toi — ils disparaissent de la liste et des nouveaux plannings, sans perdre leur
              historique.
            </Text>

            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Rechercher un salarié…"
              placeholderTextColor={colors.border}
            />

            <View style={styles.sortRow}>
              {(
                [
                  { mode: 'manual', label: '↕️ Manuel' },
                  { mode: 'alpha', label: '🔤 A-Z' },
                  { mode: 'majority', label: '🎯 Poste' },
                ] as const
              ).map(({ mode, label }) => (
                <Pressable
                  key={mode}
                  style={[styles.sortButton, sortMode === mode && styles.sortButtonActive]}
                  onPress={() => setSortMode(mode)}>
                  <Text style={[styles.sortButtonText, sortMode === mode && styles.sortButtonTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {draggingEnabled && (
              <Text style={styles.hint}>
                Glisse un salarié par sa poignée ⠿ pour le réordonner, ou dépose-le sous une autre catégorie pour l'y
                déplacer.
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          searching ? <Text style={styles.hint}>Aucun salarié actif ne correspond à "{search}".</Text> : null
        }
        ListFooterComponent={
          <>
            {!searching && (
              <Pressable style={styles.addButton} onPress={addName}>
                <Text style={styles.addButtonText}>+ Ajouter un salarié</Text>
              </Pressable>
            )}

            {archivedIndexed.length > 0 && (
              <>
                {!searching && (
                  <Pressable style={styles.archivedToggle} onPress={() => setShowArchived((v) => !v)}>
                    <Text style={styles.archivedToggleText}>
                      {showArchived ? '▲' : '▼'} Salariés archivés ({archivedIndexed.length})
                    </Text>
                  </Pressable>
                )}
                {archivedVisible && archivedIndexed.map(([entry, index]) => renderRow(entry, index))}
              </>
            )}

            {!searching && <Text style={styles.hint}>{roster.filter((e) => e.active).length} salarié(s) actif(s)</Text>}
          </>
        }
      />

      <BottomSheet visible={openEntry !== null} onClose={() => setOpenIndex(null)}>
        {openEntry && openIndex !== null && (
          <View style={styles.sheetContent}>
            <TextInput
              style={styles.rosterNameInput}
              value={openEntry.name}
              onChangeText={(v) => updateName(openIndex, v)}
              placeholder={`Salarié ${openIndex + 1}`}
              placeholderTextColor={colors.border}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Archivé</Text>
              <Switch value={!openEntry.active} onValueChange={() => toggleArchived(openIndex)} />
            </View>
            <Text style={styles.switchHint}>
              N'apparaît plus dans la liste ni dans les nouveaux mois, mais reste dans les plannings existants.
            </Text>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Salarié régulier</Text>
              <Switch value={isRegular(openEntry)} onValueChange={() => toggleRegular(openIndex)} />
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
                style={[styles.categoryChip, !openEntry.groupId && styles.categoryChipActive]}
                onPress={() => setCategory(openIndex, undefined)}>
                <Text style={[styles.categoryChipText, !openEntry.groupId && styles.categoryChipTextActive]}>
                  Aucune
                </Text>
              </Pressable>
              {assignableGroups.map((g) => (
                <Pressable
                  key={g.id}
                  style={[styles.categoryChip, openEntry.groupId === g.id && styles.categoryChipActive]}
                  onPress={() => setCategory(openIndex, g.id)}>
                  {g.color && <View style={[styles.categoryChipDot, { backgroundColor: g.color }]} />}
                  <Text
                    style={[styles.categoryChipText, openEntry.groupId === g.id && styles.categoryChipTextActive]}>
                    {g.label || 'Sans nom'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Codes habituels</Text>
            {allKnownCodes.length > 0 ? (
              <View style={styles.codeChipsRow}>
                {allKnownCodes.map((code) => {
                  const active = (codeOptions[openEntry.name] ?? []).includes(code);
                  return (
                    <Pressable
                      key={code}
                      style={[styles.codeChip, active && styles.codeChipActive]}
                      onPress={() => toggleCodeForEmployee(openEntry.name, code)}>
                      <Text style={[styles.codeChipText, active && styles.codeChipTextActive]}>{code}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.hint}>Ajoute d'abord des groupes de postes pour voir les codes ici.</Text>
            )}

            <Pressable
              style={styles.deleteButton}
              onPress={() => removeName(openIndex, openEntry.name)}
              accessibilityRole="button"
              accessibilityLabel={`Supprimer ${openEntry.name || 'ce salarié'}`}>
              <Text style={styles.deleteButtonText}>🗑️ Supprimer ce salarié</Text>
            </Pressable>
          </View>
        )}
      </BottomSheet>
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
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.background,
    },
    hint: {
      fontSize: 13,
      opacity: 0.7,
      marginBottom: 8,
      color: colors.text,
    },
    searchInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
      marginBottom: 10,
      color: colors.text,
    },
    sortRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    sortButton: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    sortButtonActive: {
      backgroundColor: colors.tint,
      borderColor: colors.tint,
    },
    sortButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    sortButtonTextActive: {
      color: colors.onTint,
    },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
      marginBottom: 6,
    },
    categoryHeaderText: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      opacity: 0.6,
      color: colors.text,
    },
    categoryEmptyHint: {
      fontSize: 11,
      fontStyle: 'italic',
      opacity: 0.4,
      color: colors.text,
    },
    categoryDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    rosterCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      backgroundColor: colors.card,
    },
    rosterCardDragging: {
      borderColor: colors.tint,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
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
    rosterCardBody: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    cardNameColumn: {
      flex: 1,
    },
    cardName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    cardSummary: {
      fontSize: 12,
      opacity: 0.6,
      marginTop: 2,
      color: colors.text,
    },
    chevron: {
      fontSize: 20,
      opacity: 0.4,
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
    archivedToggle: {
      marginTop: 16,
      marginBottom: 4,
    },
    archivedToggleText: {
      fontSize: 13,
      fontWeight: '600',
      opacity: 0.6,
      color: colors.text,
    },
    sheetContent: {
      paddingHorizontal: 20,
    },
    rosterNameInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
      marginBottom: 16,
      fontSize: 16,
      fontWeight: '600',
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
    categoryChipDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
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
