import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/hooks/useThemeColors';

/**
 * En-tête de marque unique, partagé par tous les navigateurs (onglets + piles) :
 * fond bleu Sodexo, titre centré en blanc, flèche de retour blanche et un fin
 * filet rouge en rappel de marque sous l'en-tête.
 *
 * On le pose via l'option `header` plutôt que via `headerStyle` : l'en-tête
 * natif des piles `expo-router` n'accepte que `backgroundColor` (ni bordure ni
 * titre centré fiable), donc un rendu 100 % maison est le seul moyen d'avoir
 * exactement le même en-tête partout.
 */

type HeaderButtonProps = { tintColor?: string };

export type BrandHeaderProps = {
  navigation: { goBack: () => void };
  route: { name: string };
  options: {
    title?: string;
    headerLeft?: (props: HeaderButtonProps) => ReactNode;
    headerRight?: (props: HeaderButtonProps) => ReactNode;
  };
  /** Présent (pile) quand un écran précédent existe ; absent pour un onglet. */
  back?: { title?: string };
};

const CONTENT_HEIGHT = 56;

export default function BrandHeader({ navigation, route, options, back }: BrandHeaderProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const title = options.title ?? route.name;
  const buttonProps: HeaderButtonProps = { tintColor: colors.headerText };

  const left = back ? (
    <Pressable
      onPress={navigation.goBack}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Retour">
      <Text style={[styles.backIcon, { color: colors.headerText }]}>←</Text>
    </Pressable>
  ) : (
    options.headerLeft?.(buttonProps) ?? null
  );

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.headerBackground,
          paddingTop: insets.top,
          borderBottomColor: colors.headerAccent,
        },
      ]}>
      <View style={[styles.row, { height: CONTENT_HEIGHT }]}>
        {left ? <View style={styles.left}>{left}</View> : null}
        <Text numberOfLines={1} style={[styles.title, { color: colors.headerText }]}>
          {title}
        </Text>
        {options.headerRight ? (
          <View style={styles.right}>{options.headerRight(buttonProps)}</View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 2,
  },
  row: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    maxWidth: '68%',
    textAlign: 'center',
  },
  left: {
    position: 'absolute',
    left: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  right: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    fontWeight: '600',
    paddingHorizontal: 8,
  },
});
