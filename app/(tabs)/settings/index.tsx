import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const MENU = [
  { href: '/settings/backup', emoji: '💾', title: 'Sauvegarde', hint: 'Exporter / importer toutes tes données' },
  { href: '/settings/profile', emoji: '🙋', title: 'Mon nom', hint: 'Pour te retrouver dans "Mon planning"' },
  {
    href: '/settings/groups',
    emoji: '👥',
    title: 'Groupes de postes',
    hint: 'Les codes de poste qui vont ensemble',
  },
  { href: '/settings/roster', emoji: '📋', title: 'Salariés', hint: 'Liste et codes habituels de chacun' },
  { href: '/settings/notifications', emoji: '🔔', title: 'Notifications', hint: 'Rappel la veille d\'un jour travaillé' },
  { href: '/settings/about', emoji: 'ℹ️', title: 'À propos', hint: "Version et présentation de l'app" },
  { href: '/settings/contact', emoji: '✉️', title: 'Contact', hint: 'Une question, un bug à signaler' },
  { href: '/settings/privacy', emoji: '🔒', title: 'Confidentialité', hint: 'Où vont tes données (nulle part)' },
] as const;

export default function SettingsMenu() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {MENU.map((item) => (
        <Pressable key={item.href} style={styles.row} onPress={() => router.push(item.href)}>
          <Text style={styles.emoji}>{item.emoji}</Text>
          <View style={styles.textColumn}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowHint}>{item.hint}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  emoji: {
    fontSize: 24,
  },
  textColumn: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  rowHint: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    opacity: 0.4,
  },
});
