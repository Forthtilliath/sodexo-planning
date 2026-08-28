import { Stack } from 'expo-router';

import { useHeaderOptions } from '@/hooks/useHeaderOptions';

export default function SettingsLayout() {
  const headerOptions = useHeaderOptions();

  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: 'Réglages' }} />
      <Stack.Screen name="me" options={{ title: 'Mon nom' }} />
      <Stack.Screen name="backup" options={{ title: 'Sauvegarde' }} />
      <Stack.Screen name="groups" options={{ title: 'Groupes de postes' }} />
      <Stack.Screen name="roster" options={{ title: 'Salariés' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="theme" options={{ title: 'Thème' }} />
      <Stack.Screen name="update" options={{ title: 'Mise à jour' }} />
      <Stack.Screen name="about" options={{ title: 'À propos' }} />
      <Stack.Screen name="contact" options={{ title: 'Contact' }} />
      <Stack.Screen name="privacy" options={{ title: 'Confidentialité' }} />
    </Stack>
  );
}
