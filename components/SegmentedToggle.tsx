import { useMemo } from 'react';

import { SegmentedToggle as KitSegmentedToggle } from '@forthtilliath/react-native-kit/components/picker/SegmentedToggle';

import { useThemeColors } from '@/hooks/useThemeColors';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** Rangée de boutons de même largeur dont un seul est actif (ex. Calendrier / Liste). */
export default function SegmentedToggle<T extends string>(props: Props<T>) {
  const colors = useThemeColors();
  const styles = useMemo(
    () => ({
      button: { borderColor: colors.border },
      buttonActive: { backgroundColor: colors.tint, borderColor: colors.tint },
      text: { color: colors.text },
      textActive: { color: colors.onTint },
    }),
    [colors]
  );

  return <KitSegmentedToggle {...props} styles={styles} />;
}
