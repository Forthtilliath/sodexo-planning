import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { getTeamGroups } from '@/lib/db';
import type { TeamGroup } from '@/types';

export default function GroupsScreen() {
  const [groups, setGroups] = useState<TeamGroup[]>([]);

  const load = useCallback(async () => {
    setGroups(await getTeamGroups());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        Un groupe = les codes de poste qui vont ensemble (ex: D1, D2, D3, D4). Ces codes servent aussi de boutons
        rapides dans "Salariés".
      </Text>

      {groups.length === 0 ? (
        <Text style={styles.hint}>Aucun groupe configuré.</Text>
      ) : (
        groups.map((group) => (
          <View key={group.id} style={[styles.groupCard, group.color && { borderLeftColor: group.color, borderLeftWidth: 4 }]}>
            <View style={styles.groupHeader}>
              {group.color && <View style={[styles.colorDot, { backgroundColor: group.color }]} />}
              <Text style={styles.groupLabel}>{group.label || 'Groupe sans nom'}</Text>
            </View>
            <Text style={styles.groupCodes}>{group.codes.join(', ')}</Text>
          </View>
        ))
      )}
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
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  groupLabel: {
    fontWeight: '700',
  },
  groupCodes: {
    opacity: 0.8,
  },
});
