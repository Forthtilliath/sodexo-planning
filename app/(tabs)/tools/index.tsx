import { ScrollView } from 'react-native';
import { router } from 'expo-router';

import { SettingsMenu } from '@forthtilliath/react-native-kit/components/settings/SettingsMenu';

import { useThemeColors } from '@/hooks/useThemeColors';

export default function ToolsMenuScreen() {
  const colors = useThemeColors();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16 }}>
      <SettingsMenu
        groups={[
          {
            title: 'Petit-déjeuner',
            items: [
              {
                key: 'collations',
                emoji: '🥐',
                title: 'Collations & PDJ',
                hint: 'Produits à préparer pour les collations ambu et les petits-déjeuners demandés',
                onPress: () => router.push('/tools/collations'),
              },
            ],
          },
        ]}
        styles={{
          row: { borderColor: colors.borderSubtle },
          groupTitle: { color: colors.text },
          title: { color: colors.text },
          hint: { color: colors.text },
          chevronColor: colors.text,
        }}
      />
    </ScrollView>
  );
}
