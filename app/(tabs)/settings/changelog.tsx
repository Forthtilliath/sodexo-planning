import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { CHANGELOG } from '@/lib/changelog';

export default function ChangelogScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {CHANGELOG.map((entry, index) => (
        <View key={entry.version} style={[styles.card, index > 0 && styles.cardSpacing]}>
          <View style={styles.header}>
            <Text style={styles.version}>Version {entry.version}</Text>
            <Text style={styles.date}>{entry.date}</Text>
          </View>

          {entry.changes.map((line, i) => (
            <Text key={i} style={styles.item}>
              •  {line}
            </Text>
          ))}
        </View>
      ))}
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
    card: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 10,
      padding: 14,
    },
    cardSpacing: {
      marginTop: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    version: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.tint,
    },
    date: {
      fontSize: 12,
      opacity: 0.6,
      color: colors.text,
    },
    item: {
      fontSize: 13,
      lineHeight: 20,
      opacity: 0.85,
      color: colors.text,
      marginBottom: 4,
    },
  });
}
