import { ScrollView } from 'react-native';

import { PrivacySettingsScreen } from '@forthtilliath/react-native-kit/components/settings/PrivacySettingsScreen';

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
          {
            title: 'Accès à ton agenda',
            paragraphs: [
              "Si tu utilises « Synchroniser avec mon agenda », l'application te demande l'accès à ton agenda. Elle s'en sert uniquement pour écrire ton planning dans un calendrier « Sodexo Planning » créé sur ce téléphone, sans compte en ligne : elle ne lit ni ne modifie tes autres calendriers.",
              'Tu peux refuser cet accès et utiliser l’export .ics à la place, ou le retirer à tout moment dans les réglages Android de l’application.',
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
