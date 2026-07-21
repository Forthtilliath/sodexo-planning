import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { pickAndImportBackup, shareBackup } from '@/lib/backup';

export default function BackupScreen() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      await shareBackup();
    } catch (err) {
      Alert.alert("Échec de l'export", err instanceof Error ? err.message : "Une erreur inconnue s'est produite.");
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    if (importing) return;
    Alert.alert(
      'Importer une sauvegarde ?',
      'Toutes les données actuelles (salariés, groupes, plannings) seront remplacées par celles du fichier choisi.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Choisir un fichier',
          onPress: async () => {
            setImporting(true);
            try {
              const imported = await pickAndImportBackup();
              if (imported) {
                Alert.alert('Importé', 'Tes données ont été restaurées.');
              }
            } catch (err) {
              Alert.alert("Échec de l'import", err instanceof Error ? err.message : "Une erreur inconnue s'est produite.");
            } finally {
              setImporting(false);
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        Les données sont stockées uniquement sur cet appareil et sont perdues en cas de réinstallation ou de mise à
        jour incompatible. Exporte-les régulièrement (mail, Drive, Bluetooth...) pour pouvoir les restaurer.
      </Text>
      <View style={styles.row}>
        <Pressable style={[styles.secondaryButton, exporting && styles.buttonDisabled]} disabled={exporting} onPress={handleExport}>
          {exporting ? <ActivityIndicator /> : <Text style={styles.secondaryButtonText}>⬆️ Exporter</Text>}
        </Pressable>
        <Pressable style={[styles.secondaryButton, importing && styles.buttonDisabled]} disabled={importing} onPress={handleImport}>
          {importing ? <ActivityIndicator /> : <Text style={styles.secondaryButtonText}>⬇️ Importer</Text>}
        </Pressable>
      </View>
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
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2f95dc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#2f95dc',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});
