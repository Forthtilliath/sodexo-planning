import { Stack } from 'expo-router';

import { useHeaderOptions } from '@/hooks/useHeaderOptions';

export default function ToolsLayout() {
  const headerOptions = useHeaderOptions();

  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: 'Outils' }} />
      <Stack.Screen name="collations" options={{ title: 'Collations & PDJ' }} />
    </Stack>
  );
}
