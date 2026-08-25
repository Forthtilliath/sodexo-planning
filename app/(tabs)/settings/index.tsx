import { SettingsMenu } from '@forthtilliath/react-native-kit/components/settings/SettingsMenu';
import { router } from 'expo-router';
import { ScrollView } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';

export default function SettingsMenuScreen() {
  const colors = useThemeColors();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16 }}>
      <SettingsMenu
        groups={[
          {
            title: 'Préférences',
            items: [
              {
                key: 'notifications',
                emoji: '🔔',
                title: 'Notifications',
                hint: "Rappel la veille d'un jour travaillé",
                onPress: () => router.push('/settings/notifications'),
              },
              {
                key: 'theme',
                emoji: '🎨',
                title: 'Thème',
                hint: 'Clair, sombre, ou automatique',
                onPress: () => router.push('/settings/theme'),
              },
            ],
          },
          {
            title: 'Planning',
            items: [
              {
                key: 'groups',
                emoji: '👥',
                title: 'Groupes de postes',
                hint: 'Les codes de poste qui vont ensemble',
                onPress: () => router.push('/settings/groups'),
              },
              {
                key: 'roster',
                emoji: '📋',
                title: 'Salariés',
                hint: 'Liste et codes habituels de chacun',
                onPress: () => router.push('/settings/roster'),
              },
              {
                key: 'backup',
                emoji: '💾',
                title: 'Sauvegarde',
                hint: 'Exporter / importer toutes tes données',
                onPress: () => router.push('/settings/backup'),
              },
            ],
          },
          {
            title: 'Application',
            items: [
              {
                key: 'update',
                emoji: '⬇️',
                title: 'Mise à jour',
                hint: 'Vérifier, installer, et voir les nouveautés de chaque version',
                onPress: () => router.push('/settings/update'),
              },
              {
                key: 'about',
                emoji: 'ℹ️',
                title: 'À propos',
                hint: "Version et présentation de l'app",
                onPress: () => router.push('/settings/about'),
              },
              {
                key: 'contact',
                emoji: '✉️',
                title: 'Contact',
                hint: 'Une question, un bug à signaler',
                onPress: () => router.push('/settings/contact'),
              },
              {
                key: 'privacy',
                emoji: '🔒',
                title: 'Confidentialité',
                hint: 'Où vont tes données (nulle part)',
                onPress: () => router.push('/settings/privacy'),
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
