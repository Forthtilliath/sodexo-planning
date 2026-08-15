import { ContactSettingsScreen } from '@forthtilliath/react-native-kit/components/settings/ContactSettingsScreen';
import { ScrollView } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';

export default function ContactScreen() {
  const colors = useThemeColors();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16 }}>
      <ContactSettingsScreen
        email="vincent.lisita@gmail.com"
        styles={{
          hint: { color: colors.text },
          emailButton: { borderColor: colors.tint },
          emailButtonText: { color: colors.tint },
          separator: { backgroundColor: colors.borderSubtle },
        }}
      />
    </ScrollView>
  );
}
