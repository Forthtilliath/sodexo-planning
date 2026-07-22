import Constants from 'expo-constants';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';

const APP_NAME = Constants.expoConfig?.name ?? 'Sodexo Planning';
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function AboutScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.appName}>{APP_NAME}</Text>
      <Text style={styles.version}>Version {APP_VERSION}</Text>

      <View style={styles.separator} />

      <Text style={styles.paragraph}>
        Application personnelle pour gérer un planning de travail mensuel : saisie manuelle poste par poste, codes
        couleur par groupe de postes, week-ends et jours fériés mis en évidence, export vers l'agenda (.ics), et
        sauvegarde/restauration des données.
      </Text>
      <Text style={styles.paragraph}>Toutes les données restent uniquement sur cet appareil.</Text>

      <View style={styles.separator} />

      <Text style={styles.hint}>Développée par Vincent LISITA.</Text>
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
    appName: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
    },
    version: {
      fontSize: 13,
      opacity: 0.6,
      marginTop: 2,
      color: colors.text,
    },
    separator: {
      height: 1,
      marginVertical: 16,
      backgroundColor: colors.borderSubtle,
    },
    paragraph: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 12,
      color: colors.text,
    },
    hint: {
      fontSize: 13,
      opacity: 0.6,
      color: colors.text,
    },
  });
}
