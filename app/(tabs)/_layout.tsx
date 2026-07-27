import { Tabs } from 'expo-router';
import { ColorValue, Text } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';

function TabIcon({ emoji, color }: { emoji: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{emoji}</Text>;
}

export default function TabLayout() {
  const colors = useThemeColors();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.borderSubtle },
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Saisie',
          // Le titre de l'en-tête est mis à jour dynamiquement (index.tsx)
          // pour afficher "Planning de X" ; le libellé de l'onglet, lui,
          // doit rester fixe.
          tabBarLabel: 'Saisie',
          tabBarIcon: ({ color }) => <TabIcon emoji="📝" color={color} />,
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          title: 'Mon planning',
          // Le titre de l'en-tête est mis à jour dynamiquement (planning.tsx)
          // pour afficher "Planning de X" en consultant un collègue ; le
          // libellé de l'onglet, lui, doit rester fixe.
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
