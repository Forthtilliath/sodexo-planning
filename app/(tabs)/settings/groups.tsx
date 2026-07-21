import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getTeamGroups, saveTeamGroups } from '@/lib/db';
import type { TeamGroup } from '@/types';

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function GroupsScreen() {
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setGroups(await getTeamGroups());
    setLoaded(true);
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
    setGroups((prev) => [...prev, { id: randomId(), label: '', codes: [] }]);
  }

  function removeGroup(id: string) {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }

  function updateGroupLabel(id: string, label: string) {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, label } : g)));
  }

  function updateGroupCodes(id: string, codesText: string) {
    const codes = codesText
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, codes } : g)));
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        Un groupe = les codes de poste qui vont ensemble (ex: D1, D2, D3, D4). Seul toi connais le mapping complet —
        ajoute autant de groupes que nécessaire. Ces codes serviront aussi de boutons rapides dans "Salariés".
      </Text>

      {groups.map((group) => (
        <View key={group.id} style={styles.groupCard}>
          <View style={styles.groupHeader}>
            <TextInput
              style={styles.groupLabelInput}
              value={group.label}
              onChangeText={(v) => updateGroupLabel(group.id, v)}
              placeholder="Nom du groupe (optionnel)"
            />
            <Pressable onPress={() => removeGroup(group.id)} hitSlop={8}>
              <Text style={styles.removeText}>Supprimer</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.codesInput}
            value={group.codes.join(', ')}
            onChangeText={(v) => updateGroupCodes(group.id, v)}
            placeholder="D1, D2, D3, D4"
            autoCapitalize="characters"
          />
        </View>
      ))}

      <Pressable style={styles.addButton} onPress={addGroup}>
        <Text style={styles.addButtonText}>+ Ajouter un groupe</Text>
      </Pressable>
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
  hint: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 12,
  },
  groupCard: {
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.4)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  groupLabelInput: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: '#999',
    paddingVertical: 4,
  },
  removeText: {
    color: '#d33',
    fontWeight: '700',
    fontSize: 16,
  },
  codesInput: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 6,
    padding: 8,
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
});
