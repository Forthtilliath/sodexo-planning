import { PrivacySettingsScreen } from '@forthtilliath/react-native-kit/components/settings/PrivacySettingsScreen';
import { ScrollView } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';

export default function PrivacyScreen() {
  const colors = useThemeColors();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16 }}>
      <PrivacySettingsScreen
        sections={[
          {
            title: 'Aucune donnée envoyée nulle part',
            paragraphs: [
              'Cette application ne collecte aucune donnée, ne fait appel à aucun serveur, et ne contient aucun outil de suivi ni de publicité.',
            ],
          },
          {
            title: 'Stockage local uniquement',
            paragraphs: [
              "Tout ce que tu saisis (salariés, plannings, réglages) reste stocké uniquement sur cet appareil, dans le stockage local de l'application. Rien n'est envoyé ailleurs.",
              "Ces données sont perdues si tu désinstalles l'application ou si tu effaces son stockage depuis les réglages Android — pense à utiliser Réglages → Sauvegarde → Exporter régulièrement pour pouvoir les restaurer.",
            ],
          },
          {
            title: 'Partage volontaire uniquement',
            paragraphs: [
              "La seule façon pour une donnée de quitter cet appareil, c'est quand tu choisis toi-même de la partager (export d'une sauvegarde, export d'un planning au format .ics), via le sélecteur de partage natif d'Android.",
            ],
          },
        ]}
        styles={{
          title: { color: colors.text },
          paragraph: { color: colors.text },
          separator: { backgroundColor: colors.borderSubtle },
        }}
      />
    </ScrollView>
  );
}
