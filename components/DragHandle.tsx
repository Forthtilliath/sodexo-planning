import { DragHandle as KitDragHandle } from '@forthtilliath/react-native-kit/components/list/DragHandle';

import { useThemeColors } from '@/hooks/useThemeColors';

type Props = {
  onPressIn: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
};

/** Poignée "⠿" pour réordonner une ligne dans une DraggableFlatList (roster, groupes de postes). */
export default function DragHandle(props: Props) {
  const colors = useThemeColors();
  return <KitDragHandle {...props} styles={{ text: { color: colors.text } }} />;
}
