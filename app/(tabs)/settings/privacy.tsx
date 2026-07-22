import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function PrivacyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Aucune donnée envoyée nulle part</Text>
      <Text style={styles.paragraph}>
        Cette application ne collecte aucune donnée, ne fait appel à aucun serveur, et ne contient aucun outil de
        suivi ni de publicité.
      </Text>

      <View style={styles.separator} />

      <Text style={styles.title}>Stockage local uniquement</Text>
      <Text style={styles.paragraph}>
        Tout ce que tu saisis (salariés, plannings, réglages) reste stocké uniquement sur cet appareil, dans le
        stockage local de l'application. Rien n'est envoyé ailleurs.
      </Text>
      <Text style={styles.paragraph}>
        Ces données sont perdues si tu désinstalles l'application ou si tu effaces son stockage depuis les réglages
        Android — pense à utiliser Réglages → Sauvegarde → Exporter régulièrement pour pouvoir les restaurer.
      </Text>

      <View style={styles.separator} />

      <Text style={styles.title}>Partage volontaire uniquement</Text>
      <Text style={styles.paragraph}>
        La seule façon pour une donnée de quitter cet appareil, c'est quand tu choisis toi-même de la partager
        (export d'une sauvegarde, export d'un planning au format .ics), via le sélecteur de partage natif d'Android.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.85,
    marginBottom: 8,
  },
  separator: {
    height: 1,
    marginVertical: 16,
    backgroundColor: 'rgba(128,128,128,0.3)',
  },
});
