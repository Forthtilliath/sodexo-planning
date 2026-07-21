import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Réglages' }} />
      <Stack.Screen name="backup" options={{ title: 'Sauvegarde' }} />
      <Stack.Screen name="profile" options={{ title: 'Mon nom' }} />
      <Stack.Screen name="groups" options={{ title: 'Groupes de postes' }} />
      <Stack.Screen name="roster" options={{ title: 'Salariés' }} />
    </Stack>
  );
}
