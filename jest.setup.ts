import type * as React from 'react';

// Insets à 0 hors SafeAreaProvider (les tests rendent les composants sans le provider racine).
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// ReanimatedSwipeable (SwipeableRow du kit) exige le runtime natif de Reanimated, absent sous Jest :
// on rend la ligne et son action, et openRight() simule une ouverture complète (onSwipeableOpen).
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const { Fragment, createElement } = jest.requireActual<typeof React>('react');
  return {
    __esModule: true,
    default: function ReanimatedSwipeable(props: {
      children?: unknown;
      onSwipeableOpen?: (direction: 'left' | 'right') => void;
      renderRightActions?: (progress: unknown, translation: unknown, methods: Record<string, () => void>) => unknown;
    }) {
      const methods = {
        close: () => undefined,
        reset: () => undefined,
        openLeft: () => undefined,
        openRight: () => props.onSwipeableOpen?.('right'),
      };
      return createElement(Fragment, null, props.renderRightActions?.(0, 0, methods), props.children);
    },
  };
});
