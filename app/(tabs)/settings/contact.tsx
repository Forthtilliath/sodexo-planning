import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const CONTACT_EMAIL = 'forth.jdronline@gmail.com';

export default function ContactScreen() {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  hint: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 12,
  },
  emailButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2f95dc',
    alignItems: 'center',
  },
  emailButtonText: {
    color: '#2f95dc',
    fontWeight: '700',
  },
  separator: {
    height: 1,
    marginVertical: 16,
    backgroundColor: 'rgba(128,128,128,0.3)',
  },
});
