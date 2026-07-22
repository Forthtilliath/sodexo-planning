import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { getEmployeeCodeOptions, getEmployeeRoster, getTeamGroups, saveEmployeeCodeOptions, saveEmployeeRoster } from '@/lib/db';
import type { RosterEntry, TeamGroup } from '@/types';

/** Déplace l'entrée `index` d'un cran parmi les autres entrées qui partagent le même statut actif/inactif. */
function moveWithinGroup(entries: RosterEntry[], index: number, direction: -1 | 1): RosterEntry[] {
  const active = entries[index].active;
  const groupIndices = entries.reduce<number[]>((acc, e, i) => {
    if (e.active === active) acc.push(i);
    return acc;
  }, []);
  const posInGroup = groupIndices.indexOf(index);
  const swapPos = posInGroup + direction;
  if (swapPos < 0 || swapPos >= groupIndices.length) return entries;
  const swapIndex = groupIndices[swapPos];
  const next = [...entries];
  [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  return next;
}

export default function RosterScreen() {
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [codeOptions, setCodeOptions] = useState<Record<string, string[]>>({});
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showInactive, setShowInactive] = useState(false);

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

  function toggleExpanded(index: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function addName() {
    setRoster((prev) => [...prev, { name: '', active: true }]);
  }

  function removeName(index: number, name: string) {
    Alert.alert('Supprimer ce salarié ?', `"${name || `Salarié ${index + 1}`}" sera retiré de la liste.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => setRoster((prev) => prev.filter((_, i) => i !== index)),
      },
    ]);
  }

  function updateName(index: number, value: string) {
    setRoster((prev) => prev.map((e, i) => (i === index ? { ...e, name: value } : e)));
  }

  function toggleActive(index: number) {
    setRoster((prev) => prev.map((e, i) => (i === index ? { ...e, active: !e.active } : e)));
  }

  function moveName(index: number, direction: -1 | 1) {
    setRoster((prev) => moveWithinGroup(prev, index, direction));
  }

  // Les codes proposés à cocher viennent des groupes de postes déjà définis :
  // pas besoin de les retaper, et ça reste cohérent avec le reste.
  const allKnownCodes = useMemo(() => Array.from(new Set(groups.flatMap((g) => g.codes))).sort(), [groups]);

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

  if (!loaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.hint}>Chargement des salariés…</Text>
      </View>
    );
  }

  function renderCard(entry: RosterEntry, index: number) {
    const isExpanded = expanded.has(index);
    const codesCount = (codeOptions[entry.name] ?? []).length;
    const group = roster.filter((e) => e.active === entry.active);
    const posInGroup = group.indexOf(entry);

    return (
      <View key={index} style={styles.rosterCard}>
        <Pressable style={styles.cardHeader} onPress={() => toggleExpanded(index)}>
          <Text style={styles.cardName} numberOfLines={1}>
            {entry.name || `Salarié ${index + 1}`}
          </Text>
          <Text style={styles.cardSummary}>{codesCount > 0 ? `${codesCount} code(s)` : ''}</Text>
          <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
        </Pressable>

        {isExpanded && (
          <View style={styles.cardBody}>
            <View style={styles.rosterRow}>
              <View style={styles.rosterMoveColumn}>
                <Pressable
                  style={[styles.moveButton, posInGroup === 0 && styles.moveButtonDisabled]}
                  disabled={posInGroup === 0}
                  onPress={() => moveName(index, -1)}>
                  <Text style={styles.moveButtonText}>↑</Text>
                </Pressable>
                <Pressable
                  style={[styles.moveButton, posInGroup === group.length - 1 && styles.moveButtonDisabled]}
                  disabled={posInGroup === group.length - 1}
                  onPress={() => moveName(index, 1)}>
                  <Text style={styles.moveButtonText}>↓</Text>
                </Pressable>
              </View>
              <TextInput
                style={styles.rosterNameInput}
                value={entry.name}
                onChangeText={(v) => updateName(index, v)}
                placeholder={`Salarié ${index + 1}`}
              />
              <Pressable onPress={() => removeName(index, entry.name)} hitSlop={8} style={styles.rosterRemoveButton}>
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            </View>

            <View style={styles.activeRow}>
              <Text style={styles.activeLabel}>{entry.active ? 'Actif' : 'Inactif'}</Text>
              <Switch value={entry.active} onValueChange={() => toggleActive(index)} />
            </View>

            {allKnownCodes.length > 0 ? (
              <View style={styles.codeChipsRow}>
                {allKnownCodes.map((code) => {
                  const active = (codeOptions[entry.name] ?? []).includes(code);
                  return (
                    <Pressable
                      key={code}
                      style={[styles.codeChip, active && styles.codeChipActive]}
                      onPress={() => toggleCodeForEmployee(entry.name, code)}>
                      <Text style={[styles.codeChipText, active && styles.codeChipTextActive]}>{code}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.hint}>Ajoute d'abord des groupes de postes pour voir les codes ici.</Text>
            )}
          </View>
        )}
      </View>
    );
  }

  const activeEntries = roster.map((e, i) => [e, i] as const).filter(([e]) => e.active);
  const inactiveEntries = roster.map((e, i) => [e, i] as const).filter(([e]) => !e.active);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        Touche un salarié pour voir/modifier ses codes habituels. Désactive ceux qui ne travaillent plus avec toi —
        ils disparaissent des propositions de planning sans perdre leur historique.
      </Text>

      {activeEntries.map(([entry, index]) => renderCard(entry, index))}

      <Pressable style={styles.addButton} onPress={addName}>
        <Text style={styles.addButtonText}>+ Ajouter un salarié</Text>
      </Pressable>

      {inactiveEntries.length > 0 && (
        <>
          <Pressable style={styles.inactiveToggle} onPress={() => setShowInactive((v) => !v)}>
            <Text style={styles.inactiveToggleText}>
              {showInactive ? '▲' : '▼'} Salariés désactivés ({inactiveEntries.length})
            </Text>
          </Pressable>
          {showInactive && inactiveEntries.map(([entry, index]) => renderCard(entry, index))}
        </>
      )}

      <Text style={styles.hint}>{activeEntries.length} salarié(s) actif(s)</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  },
  hint: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 8,
  },
  rosterCard: {
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  cardName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  cardSummary: {
    fontSize: 12,
    opacity: 0.6,
  },
  chevron: {
    fontSize: 12,
    opacity: 0.5,
  },
  cardBody: {
    padding: 8,
    paddingTop: 0,
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  rosterMoveColumn: {
    gap: 2,
  },
  moveButton: {
    width: 28,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#999',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveButtonDisabled: {
    opacity: 0.3,
  },
  moveButtonText: {
    fontSize: 11,
  },
  rosterNameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    padding: 8,
  },
  rosterRemoveButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  removeText: {
    color: '#d33',
    fontWeight: '700',
    fontSize: 16,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  activeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  codeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  codeChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#999',
  },
  codeChipActive: {
    backgroundColor: '#2f95dc',
    borderColor: '#2f95dc',
  },
  codeChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  codeChipTextActive: {
    color: '#fff',
  },
  addButton: {
    marginTop: 4,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#999',
    alignItems: 'center',
  },
  addButtonText: {
    fontWeight: '600',
  },
  inactiveToggle: {
    marginTop: 16,
    marginBottom: 4,
  },
  inactiveToggleText: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.6,
  },
});
