import { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';

const CONTACT_EMAIL = 'vincent.lisita@gmail.com';

export default function ContactScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>Une question, un bug, une suggestion ?</Text>

      <Pressable style={styles.emailButton} onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}>
        <Text style={styles.emailButtonText}>✉️ {CONTACT_EMAIL}</Text>
      </Pressable>

      <View style={styles.separator} />

      <Text style={styles.hint}>
        Si tu remontes un bug, précise si possible ce que tu faisais et ce que tu attendais — ça aide à le
        reproduire.
      </Text>
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
    },
    hint: {
      fontSize: 13,
      opacity: 0.7,
      marginBottom: 12,
      color: colors.text,
    },
    emailButton: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.tint,
      alignItems: 'center',
    },
    emailButtonText: {
      color: colors.tint,
      fontWeight: '700',
    },
    separator: {
      height: 1,
      marginVertical: 16,
      backgroundColor: colors.borderSubtle,
    },
  });
}
