import type { ColorValue} from 'react-native';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';

import { useHeaderOptions } from '@/hooks/useHeaderOptions';
import { useThemeColors } from '@/hooks/useThemeColors';

function TabIcon({ emoji, color }: { emoji: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{emoji}</Text>;
}

export default function TabLayout() {
  const colors = useThemeColors();
  const headerOptions = useHeaderOptions();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.borderSubtle },
        ...headerOptions,
      }}>
      <Tabs.Screen
        name="saisie"
        options={{
          title: 'Saisie',
          // Le libellé de l'onglet reste fixe même quand l'en-tête devient
          // "Planning de X" (titre mis à jour dans saisie.tsx).
          tabBarLabel: 'Saisie',
          tabBarIcon: ({ color }) => <TabIcon emoji="📝" color={color} />,
        }}
      />
      {/* "Mon planning" est la route index : c'est l'écran affiché au lancement. */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mon planning',
          // Libellé d'onglet fixe même quand l'en-tête devient "Planning de X"
          // (titre mis à jour dans index.tsx).
          tabBarLabel: 'Mon planning',
          tabBarIcon: ({ color }) => <TabIcon emoji="📅" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Réglages',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabIcon emoji="⚙️" color={color} />,
        }}
      />
    </Tabs>
  );
}
