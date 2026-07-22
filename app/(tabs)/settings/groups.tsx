import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getTeamGroups } from '@/lib/db';
import type { TeamGroup } from '@/types';

export default function GroupsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
    groupCard: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
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
      color: colors.text,
    },
    groupCodes: {
      opacity: 0.8,
      color: colors.text,
    },
  });
}
