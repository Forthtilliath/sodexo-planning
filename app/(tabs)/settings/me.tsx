import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { ThemeColors } from '@/constants/Colors';
import { useMyName } from '@/hooks/useMyName';
import { useThemeColors } from '@/hooks/useThemeColors';
import { normalizeName } from '@/lib/teams';

export default function MyNameScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { myName, setMyName } = useMyName();
  const [value, setValue] = useState(myName);
  const [busy, setBusy] = useState(false);

  const trimmed = value.trim();
  const unchanged = normalizeName(trimmed) === normalizeName(myName);
  const canSave = trimmed.length > 0 && !unchanged && !busy;

  async function handleSave() {
    if (!canSave) return;
    Keyboard.dismiss();
    setBusy(true);
    try {
      await setMyName(trimmed);
      Alert.alert('Enregistré', `Ta ligne s'appelle maintenant "${trimmed}" dans toute l'app.`);
    } catch (err) {
      Alert.alert('Impossible', err instanceof Error ? err.message : "Une erreur s'est produite.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Ton nom</Text>
      <Text style={styles.hint}>
        C'est le nom de ta ligne dans un planning : l'app s'en sert pour retrouver automatiquement ton planning.
        Par défaut « Moi », mais tu peux mettre ton prénom.
      </Text>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setValue}
        placeholder="Moi"
        placeholderTextColor={colors.border}
        autoCapitalize="words"
        editable={!busy}
      />

      <Pressable style={[styles.saveButton, !canSave && styles.saveButtonDisabled]} disabled={!canSave} onPress={handleSave}>
        {busy ? (
          <ActivityIndicator color={colors.onTint} />
        ) : (
          <Text style={styles.saveButtonText}>Enregistrer</Text>
        )}
      </Pressable>

      <Text style={styles.hint}>
        Le renommage s'applique aussi à l'entrée « Salariés » et à tes plannings déjà enregistrés.
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
    label: {
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 4,
      color: colors.text,
    },
    hint: {
      fontSize: 13,
      opacity: 0.7,
      marginBottom: 12,
      color: colors.text,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
    },
    saveButton: {
      paddingVertical: 14,
      borderRadius: 8,
      backgroundColor: colors.tint,
      alignItems: 'center',
      marginBottom: 16,
    },
    saveButtonDisabled: {
      opacity: 0.4,
    },
    saveButtonText: {
      color: colors.onTint,
      fontWeight: '700',
      fontSize: 15,
    },
  });
}
