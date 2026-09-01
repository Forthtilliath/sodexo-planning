import type { ReactNode } from 'react';
import { useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';

// Relâcher au-delà de cette fraction de la largeur supprime directement.
const DELETE_THRESHOLD_RATIO = 0.5;

type Props = {
  children: ReactNode;
  onDelete: () => void;
  deleteLabel?: string;
};

/**
 * Ligne qu'on swipe vers la gauche pour supprimer : dépasser
 * DELETE_THRESHOLD_RATIO puis relâcher supprime directement (à l'appelant de
 * proposer un "Annuler" après coup). PanResponder + Animated plutôt qu'une lib
 * de gestes, pour ne pas ajouter de dépendance native.
 */
export default function SwipeableRow({ children, onDelete, deleteLabel = 'Supprimer' }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const translateX = useRef(new Animated.Value(0)).current;
  // Largeur de la carte (via onLayout), lue en synchrone pendant le geste :
  // un state ne serait pas assez frais au début d'un drag après re-render.
  const cardWidthRef = useRef(0);

  function animateClosed() {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
  }

  function animateDeleted() {
    Animated.timing(translateX, {
      toValue: -cardWidthRef.current,
      duration: 150,
      useNativeDriver: true,
    }).start(() => onDelete());
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => {
        translateX.setValue(Math.min(0, Math.max(-cardWidthRef.current, gesture.dx)));
      },
      onPanResponderRelease: (_, gesture) => {
        const width = cardWidthRef.current;
        if (width > 0 && -gesture.dx >= width * DELETE_THRESHOLD_RATIO) {
          animateDeleted();
        } else {
          animateClosed();
        }
      },
      onPanResponderTerminate: animateClosed,
    })
  ).current;

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        cardWidthRef.current = e.nativeEvent.layout.width;
      }}>
      <Pressable
        style={styles.deleteBackground}
        accessibilityRole="button"
        accessibilityLabel={deleteLabel}
        onPress={animateDeleted}>
        <Text style={styles.deleteButtonText} numberOfLines={1}>
          {deleteLabel}
        </Text>
      </Pressable>
      {/* width explicite : sinon la vue se contracte à son contenu et laisse
          voir le fond rouge en permanence au lieu de le masquer. */}
      <Animated.View style={[styles.row, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      marginBottom: 8,
      borderRadius: 8,
      overflow: 'hidden',
    },
    row: {
      width: '100%',
    },
    deleteBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.dangerStrong,
    },
    deleteButtonText: {
      color: colors.onTint,
      fontWeight: '700',
      fontSize: 15,
      alignSelf: 'flex-end',
      paddingEnd: 16
    },
  });
}
