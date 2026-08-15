import { ThemeSettingsScreen } from '@forthtilliath/react-native-kit/components/settings/ThemeSettingsScreen';

import { useThemeColors, useThemePreference } from '@/hooks/useThemeColors';

export default function ThemeScreen() {
  const colors = useThemeColors();
  const { preference, setPreference } = useThemePreference();

  return (
    <ThemeSettingsScreen
      value={preference}
      onChange={setPreference}
      styles={{
        container: { flex: 1, backgroundColor: colors.background, padding: 16 },
        hint: { color: colors.text },
        row: { borderColor: colors.borderSubtle },
        rowActive: { borderColor: colors.tint, backgroundColor: colors.tintSoft },
        label: { color: colors.text },
        labelActive: { color: colors.tint },
        check: { color: colors.tint },
      }}
    />
  );
}
