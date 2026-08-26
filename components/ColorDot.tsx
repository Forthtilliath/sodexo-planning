import { View, type ViewStyle } from 'react-native';

type Props = {
  color?: string;
  size?: number;
  style?: ViewStyle;
};

/** Petit rond de couleur (catégorie, groupe de postes...) ; rien n'est rendu sans couleur. */
export default function ColorDot({ color, size = 10, style }: Props) {
  if (!color) return null;
  return (
    <View
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}
    />
  );
}
