import { OptionsModal as KitOptionsModal } from '@forthtilliath/react-native-kit/components/picker/OptionsModal';

import { useOptionsModalStyles } from '@/hooks/useKitStyles';

type Option<T> = { value: T; label: string };

type Props<T extends string | number> = {
  visible: boolean;
  onClose: () => void;
  options: Option<T>[];
  onSelect: (value: T) => void;
};

/** Popup centrée avec une liste d'options défilante ; tap sur une option = sélection + fermeture. */
export default function OptionsModal<T extends string | number>(props: Props<T>) {
  return <KitOptionsModal {...props} styles={useOptionsModalStyles()} />;
}
