import type { ViewStyle } from 'react-native';

import { AddButton as KitAddButton } from '@forthtilliath/react-native-kit/components/list/AddButton';

import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
};

/** Bouton pointillé "+ ..." réutilisé partout où on ajoute une ligne (salarié, groupe...). */
export default function AddButton({ label, onPress, style }: Props) {
  const colors = useThemeColors();

  return (
    <KitAddButton
      label={label}
      onPress={onPress}
      styles={{ button: [{ borderColor: colors.border }, style], text: { color: colors.text } }}
    />
  );
}
