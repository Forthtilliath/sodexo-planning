import { AboutSettingsScreen } from '@forthtilliath/react-native-kit/components/settings/AboutSettingsScreen';
import Constants from 'expo-constants';
import { ScrollView } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';

export default function AboutScreen() {
  const colors = useThemeColors();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16 }}>
      <AboutSettingsScreen
        appName={Constants.expoConfig?.name ?? 'Sodexo Planning'}
        version={Constants.expoConfig?.version ?? '1.0.0'}
        description={[
          "Application personnelle pour gérer un planning de travail mensuel : saisie manuelle poste par poste, codes couleur par groupe de postes, week-ends et jours fériés mis en évidence, export vers l'agenda (.ics), et sauvegarde/restauration des données.",
          'Toutes les données restent uniquement sur cet appareil.',
        ]}
        developerName="Vincent LISITA"
        styles={{
          appName: { color: colors.text },
          version: { color: colors.text },
          separator: { backgroundColor: colors.borderSubtle },
          paragraph: { color: colors.text },
          hint: { color: colors.text },
        }}
      />
    </ScrollView>
  );
}
