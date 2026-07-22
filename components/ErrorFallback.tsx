import type { ErrorBoundaryProps } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

/**
 * Remplace l'écran d'erreur par défaut d'Expo Router (fond noir, message brut,
 * pensé pour le développement) par un écran de secours lisible : les données
 * restent en place (stockage local), on peut réessayer sans perdre le fil.
 */
export default function ErrorFallback({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>😕</Text>
      <Text style={styles.title}>Une erreur est survenue</Text>
      <Text style={styles.hint}>
        Désolé, quelque chose s'est mal passé. Tes données restent sur l'appareil, rien n'est perdu — réessaie
        ci-dessous.
      </Text>
      <Pressable style={styles.button} onPress={retry}>
        <Text style={styles.buttonText}>Réessayer</Text>
      </Pressable>
      <ScrollView style={styles.detailsBox} contentContainerStyle={styles.detailsContent}>
        <Text style={styles.detailsText}>{error.message}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#2f95dc',
    marginBottom: 24,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  detailsBox: {
    maxHeight: 120,
    width: '100%',
    borderRadius: 8,
    backgroundColor: 'rgba(128,128,128,0.08)',
  },
  detailsContent: {
    padding: 12,
  },
  detailsText: {
    fontSize: 12,
    opacity: 0.6,
    fontFamily: 'monospace',
  },
});
