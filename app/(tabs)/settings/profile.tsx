import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { getEmployeeRoster, getSettings, saveEmployeeRoster, saveSettings } from '@/lib/db';
import type { RosterEntry } from '@/types';

export default function ProfileScreen() {
  const [myName, setMyName] = useState('');
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const [settings, employeeRoster] = await Promise.all([getSettings(), getEmployeeRoster()]);
    // "Mon nom" doit toujours faire partie de la liste des salariés, sinon
    // impossible de retrouver sa propre ligne dans un planning.
    const trimmedName = settings.myName.trim();
    const alreadyInRoster = employeeRoster.some((r) => r.name.trim().toLowerCase() === trimmedName.toLowerCase());
    setMyName(settings.myName);
    setRoster(trimmedName && !alreadyInRoster ? [...employeeRoster, { name: trimmedName, active: true }] : employeeRoster);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (!loaded) return;
    saveSettings({ myName });
  }, [myName, loaded]);

  useEffect(() => {
    if (!loaded) return;
    saveEmployeeRoster(roster);
  }, [roster, loaded]);

  function ensureNameInRoster() {
    const trimmedName = myName.trim();
    if (!trimmedName) return;
    setRoster((prev) => {
      if (prev.some((r) => r.name.trim().toLowerCase() === trimmedName.toLowerCase())) return prev;
      return [...prev, { name: trimmedName, active: true }];
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        Doit correspondre au nom utilisé dans tes plannings (pour retrouver ta ligne).
      </Text>
      <TextInput
        style={styles.nameInput}
        value={myName}
        onChangeText={setMyName}
        onBlur={ensureNameInRoster}
        placeholder="ex: PETIT HUGO"
        autoCapitalize="characters"
      />
      <Text style={styles.hint}>Automatiquement ajouté à la liste des salariés.</Text>
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
    marginBottom: 8,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    padding: 10,
  },
});
