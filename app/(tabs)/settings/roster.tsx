import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';

import AddButton from '@/components/AddButton';
import BottomSheet from '@/components/BottomSheet';
import CategoryHeader from '@/components/CategoryHeader';
import RosterCard from '@/components/RosterCard';
import RosterEntrySheet from '@/components/RosterEntrySheet';
import type { ThemeColors } from '@/constants/Colors';
import { useDbData, usePersistedDbState } from '@/hooks/useDbData';
import { useMyName } from '@/hooks/useMyName';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  getEmployeeCodeOptions,
  getEmployeeRoster,
  getTeamGroups,
  propagateEmployeeRename,
  saveEmployeeCodeOptions,
  saveEmployeeRoster,
} from '@/lib/db';
import { randomId } from '@/lib/id';
import { isRegular, normalizeName } from '@/lib/teams';
import type { RosterEntry, TeamGroup } from '@/types';

const EMPTY_GROUPS: TeamGroup[] = [];
const EMPTY_ROSTER: RosterEntry[] = [];
const EMPTY_CODE_OPTIONS: Record<string, string[]> = {};

type SortMode = 'manual' | 'alpha';
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

// Chaque salarié doit porter un `id` stable avant d'entrer dans la liste
// glissable : c'est la clé de DraggableFlatList. Une clé dérivée de l'index (ou
// du nom, souvent vide/dupliqué) change de cible à chaque réordonnancement, et
// la lib réapplique alors ses décalages animés sur les mauvaises lignes —
// d'où les emplacements vides et les superpositions. On renseigne l'id à la
// volée pour les listes enregistrées avant son ajout ; le prochain save le
// persiste.
function ensureIds(entries: RosterEntry[]): RosterEntry[] {
  return entries.map((e) => (e.id ? e : { ...e, id: randomId() }));
}

export default function RosterScreen() {
  const colors = useThemeColors();
  const { myName } = useMyName();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const groups = useDbData(getTeamGroups, EMPTY_GROUPS);
  // Chaque salarié doit porter un `id` stable (clé du DraggableFlatList) : on
  // le renseigne à la lecture pour les listes enregistrées avant son ajout, et
  // on persiste tout de suite (opération idempotente : au 2ᵉ passage, rien à
  // faire).
  const loadRoster = useCallback(async () => {
    const raw = await getEmployeeRoster();
    const ensured = ensureIds(raw);
    if (ensured.some((e, i) => e !== raw[i])) await saveEmployeeRoster(ensured);
    return ensured;
  }, []);
  const [roster, setRoster, loaded] = usePersistedDbState(loadRoster, saveEmployeeRoster, EMPTY_ROSTER);
  const [codeOptions, setCodeOptions] = usePersistedDbState(
    getEmployeeCodeOptions,
    saveEmployeeCodeOptions,
    EMPTY_CODE_OPTIONS,
  );
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('manual');

  // Renommer un salarié doit se répercuter partout où son nom est stocké en dur
  // (plannings enregistrés, codes habituels). On le fait à la fermeture de la
  // fiche (pas à chaque frappe), en comparant au nom qu'elle portait à
  // l'ouverture.
  const renameBaselineRef = useRef<string | null>(null);
  const rosterRef = useRef(roster);
  rosterRef.current = roster;
  const openIndexRef = useRef(openIndex);
  openIndexRef.current = openIndex;

  const commitPendingRename = useCallback(() => {
    const baseline = renameBaselineRef.current;
    renameBaselineRef.current = null;
    if (baseline === null) return;
    const idx = openIndexRef.current;
    const current = idx !== null ? rosterRef.current[idx]?.name ?? '' : '';
    if (baseline.trim() && current.trim() && baseline.trim() !== current.trim()) {
      propagateEmployeeRename(baseline, current).catch((err) => console.error('propagate rename failed', err));
    }
  }, []);

  const openEntrySheet = useCallback((index: number) => {
    renameBaselineRef.current = rosterRef.current[index]?.name ?? '';
    setOpenIndex(index);
  }, []);

  const closeEntrySheet = useCallback(() => {
    commitPendingRename();
    setOpenIndex(null);
  }, [commitPendingRename]);

  // Fiche laissée ouverte en quittant l'écran : on répercute quand même le
  // renommage en cours, et on reprend une référence au retour.
  useFocusEffect(
    useCallback(() => {
      if (openIndexRef.current !== null && renameBaselineRef.current === null) {
        renameBaselineRef.current = rosterRef.current[openIndexRef.current]?.name ?? '';
      }
      return () => {
        commitPendingRename();
      };
    }, [commitPendingRename]),
  );

  function addName() {
    setRoster((prev) => [...prev, { id: randomId(), name: '', active: true }]);
  }

  function removeName(index: number, name: string) {
    Alert.alert('Supprimer ce salarié ?', `"${name || `Salarié ${index + 1}`}" sera retiré de la liste.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          renameBaselineRef.current = null;
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

  // Les codes proposés à cocher viennent des groupes de postes déjà définis :
  // pas besoin de les retaper, et ça reste cohérent avec le reste. On garde
  // aussi les codes des variantes week-end (F1-F5...) : seule la catégorie
  // (pas le code) est masquée de la liste des affectations.
  const allKnownCodes = useMemo(() => Array.from(new Set(groups.flatMap((g) => g.codes))).sort(), [groups]);
  // Catégories affectables à un salarié : une variante week-end (même poste,
  // code différent) n'est pas une "catégorie" à part entière — un salarié
  // reste rattaché à sa catégorie habituelle.
  const assignableGroups = useMemo(() => groups.filter((g) => !g.weekendVariant), [groups]);

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

  const searching = search.trim().length > 0;
  const matchesSearch = (name: string) => !searching || normalizeName(name).includes(normalizeName(search));

  // Le glissé ne recatégorise/réordonne qu'en tri Manuel hors recherche ; dans
  // les autres modes, aucune poignée n'est rendue donc aucun glissé ne peut
  // être initié — cette garde n'est qu'un filet de sécurité sur onDragEnd.
  const draggingEnabled = sortMode === 'manual' && !searching;

  // Liste à plat pour le DraggableFlatList (en-têtes de catégorie + salariés
  // actifs). Mémoïsée pour que la lib ne reçoive pas une nouvelle référence de
  // `data` — et ne rejoue pas ses animations de position — sur un rendu qui ne
  // touche pas à la liste (thème, sauvegarde, retour d'écran...).
  const listItems = useMemo<RosterListItem[]>(() => {
    const active = roster
      .map((e, i) => [e, i] as IndexedEntry)
      .filter(([e]) => e.active && matchesSearch(e.name));
    const sorted = (entries: IndexedEntry[]) =>
      sortMode === 'alpha'
        ? [...entries].sort((a, b) => a[0].name.localeCompare(b[0].name, 'fr', { sensitivity: 'base' }))
        : entries;

    // Recherche : un seul groupe plat, sans en-tête, toutes catégories confondues.
    if (searching) {
      return sorted(active).map(([entry, index]) => ({ type: 'entry', key: `e-${entry.id ?? index}`, index }) as const);
    }

    // Toutes les catégories, "Sans catégorie" en dernier. En tri Manuel elles
    // restent listées même vides (cibles de dépôt valides).
    const defs: CategoryDef[] = [
      ...assignableGroups.map((g) => ({ groupId: g.id, label: g.label || 'Groupe sans nom', color: g.color })),
      { groupId: undefined, label: 'Sans catégorie' },
    ];
    const items: RosterListItem[] = [];
    for (const def of defs) {
      const entries = sorted(
        active.filter(([e]) =>
          def.groupId ? e.groupId === def.groupId : !assignableGroups.some((g) => g.id === e.groupId)
        )
      );
      if (sortMode !== 'manual' && entries.length === 0) continue;
      items.push({ type: 'header', key: `h-${def.groupId ?? 'none'}`, def, count: entries.length });
      for (const [entry, index] of entries) {
        items.push({ type: 'entry', key: `e-${entry.id ?? index}`, index });
      }
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `matchesSearch` dépend de `search`/`searching`, déjà listés
  }, [roster, assignableGroups, sortMode, search, searching]);

  const archivedIndexed = useMemo(
    () => roster.map((e, i) => [e, i] as IndexedEntry).filter(([e]) => !e.active && matchesSearch(e.name)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roster, search, searching]
  );
  const archivedVisible = showArchived || searching;

  const keyExtractor = useCallback((item: RosterListItem) => item.key, []);

  // Reconstitue l'ordre + la catégorie de chaque salarié actif depuis la
  // position finale de son en-tête, puis recolle les archivés (jamais dans la
  // liste glissable) tels quels.
  const handleDragEnd = useCallback(
    ({ data }: { data: RosterListItem[] }) => {
      if (sortMode !== 'manual' || searching) return;
      let currentGroupId: string | undefined;
      const newActive: RosterEntry[] = [];
      for (const item of data) {
        if (item.type === 'header') currentGroupId = item.def.groupId;
        else newActive.push({ ...roster[item.index], groupId: currentGroupId });
      }
      setRoster([...newActive, ...roster.filter((e) => !e.active)]);
    },
    [roster, sortMode, searching]
  );

  const renderListItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<RosterListItem>) => {
      if (item.type === 'header') {
        return (
          <CategoryHeader
            label={item.def.label}
            color={item.def.color}
            hint={item.count === 0 ? 'glisse un salarié ici' : undefined}
          />
        );
      }
      const entry = roster[item.index];
      const category = groups.find((g) => g.id === entry.groupId);
      return (
        <RosterCard
          entry={entry}
          index={item.index}
          categoryColor={category?.color}
          codesCount={(codeOptions[entry.name] ?? []).length}
          dragHandle={draggingEnabled ? drag : undefined}
          isDragging={isActive}
          onPress={() => openEntrySheet(item.index)}
        />
      );
    },
    [roster, groups, codeOptions, draggingEnabled, openEntrySheet]
  );

  if (!loaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.hint}>Chargement des salariés…</Text>
      </View>
    );
  }

  const openEntry = openIndex !== null ? roster[openIndex] : null;

  // Lignes de la section "archivés" (footer) : jamais glissables, pas besoin de
  // les mémoïser — le footer se re-rend rarement et hors du geste.
  function renderArchivedRow(entry: RosterEntry, index: number) {
    const category = groups.find((g) => g.id === entry.groupId);
    return (
      <RosterCard
        key={entry.id ?? index}
        entry={entry}
        index={index}
        categoryColor={category?.color}
        codesCount={(codeOptions[entry.name] ?? []).length}
        onPress={() => openEntrySheet(index)}
      />
    );
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
        keyExtractor={keyExtractor}
        renderItem={renderListItem}
        onDragEnd={handleDragEnd}
        activationDistance={0}
        initialNumToRender={listItems.length}
        ListHeaderComponent={
          <>
            <Text style={styles.hint}>
              Touche un salarié pour voir/modifier ses codes, sa catégorie et son statut. Archive ceux qui ne
              travaillent plus avec toi — ils disparaissent de la liste et des nouveaux plannings, sans perdre leur
              historique.
            </Text>

            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Rechercher un salarié…"
                placeholderTextColor={colors.border}
              />
              {searching && (
                <Pressable style={styles.searchClearButton} onPress={() => setSearch('')}>
                  <Text style={styles.searchClearText}>×</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.sortRow}>
              {(
                [
                  { mode: 'manual', label: '↕️ Manuel' },
                  { mode: 'alpha', label: '🔤 A-Z' },
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
            {!searching && <AddButton label="+ Ajouter un salarié" onPress={addName} />}

            {archivedIndexed.length > 0 && (
              <>
                {!searching && (
                  <Pressable style={styles.archivedToggle} onPress={() => setShowArchived((v) => !v)}>
                    <Text style={styles.archivedToggleText}>
                      {showArchived ? '▲' : '▼'} Salariés archivés ({archivedIndexed.length})
                    </Text>
                  </Pressable>
                )}
                {archivedVisible && archivedIndexed.map(([entry, index]) => renderArchivedRow(entry, index))}
              </>
            )}

            {!searching && <Text style={styles.hint}>{roster.filter((e) => e.active).length} salarié(s) actif(s)</Text>}
          </>
        }
      />

      <BottomSheet visible={openEntry !== null} onClose={closeEntrySheet}>
        {openEntry && openIndex !== null && (
          <RosterEntrySheet
            entry={openEntry}
            index={openIndex}
            isMe={normalizeName(openEntry.name) === normalizeName(myName)}
            assignableGroups={assignableGroups}
            allKnownCodes={allKnownCodes}
            employeeCodes={codeOptions[openEntry.name] ?? []}
            onChangeName={(v) => updateName(openIndex, v)}
            onEditMyName={() => {
              closeEntrySheet();
              router.push('/settings/me');
            }}
            onToggleArchived={() => toggleArchived(openIndex)}
            onToggleRegular={() => toggleRegular(openIndex)}
            onSetCategory={(groupId) => setCategory(openIndex, groupId)}
            onToggleCode={(code) => toggleCodeForEmployee(openEntry.name, code)}
            onDelete={() => removeName(openIndex, openEntry.name)}
          />
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
    searchRow: {
      marginBottom: 10,
      justifyContent: 'center',
    },
    searchInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
      paddingRight: 36,
      color: colors.text,
    },
    searchClearButton: {
      position: 'absolute',
      right: 4,
      padding: 8,
    },
    searchClearText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      opacity: 0.6,
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
  });
}
