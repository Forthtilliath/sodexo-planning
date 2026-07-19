import { useEffect, useState } from 'react';
import { Image, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Point } from '@/lib/ocr';

type Size = { width: number; height: number };

type Props = {
  imageUri: string;
  onConfirm: (topLeft: Point, bottomRight: Point) => void;
};

/**
 * Affiche la photo et laisse l'utilisateur taper 2 points : le coin
 * haut-gauche de la 1ère case du tableau, puis le coin bas-droit de la
 * dernière. Les points sont convertis en pixels de l'image d'origine
 * (nécessaires pour découper la grille côté OCR).
 */
export default function CornerPicker({ imageUri, onConfirm }: Props) {
  const [natural, setNatural] = useState<Size | null>(null);
  const [displayed, setDisplayed] = useState<Size | null>(null);
  const [points, setPoints] = useState<Point[]>([]);

  useEffect(() => {
    setPoints([]);
    setNatural(null);
    Image.getSize(
      imageUri,
      (width, height) => setNatural({ width, height }),
      () => setNatural(null)
    );
  }, [imageUri]);

  function handleLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setDisplayed({ width, height });
  }

  function handlePress(e: { nativeEvent: { locationX: number; locationY: number } }) {
    if (!natural || !displayed) return;
    const scaleX = natural.width / displayed.width;
    const scaleY = natural.height / displayed.height;
    const point: Point = {
      x: e.nativeEvent.locationX * scaleX,
      y: e.nativeEvent.locationY * scaleY,
    };
    const next = [...points, point].slice(-2);
    setPoints(next);
    if (next.length === 2) {
      onConfirm(next[0], next[1]);
    }
  }

  const aspectRatio = natural ? natural.width / natural.height : 1;

  return (
    <View>
      <Text style={styles.hint}>
        {points.length === 0
          ? "Touche le coin haut-gauche de la première case du tableau (ligne 1 / jour 1)"
          : points.length === 1
            ? 'Touche le coin bas-droit de la dernière case (dernière ligne / dernier jour)'
            : 'Calage fait — touche à nouveau pour recommencer'}
      </Text>
      <Pressable onPress={handlePress} onLayout={handleLayout}>
        <Image source={{ uri: imageUri }} style={[styles.image, { aspectRatio }]} resizeMode="contain" />
        {displayed &&
          natural &&
          points.map((p, i) => (
            <View
              key={i}
              pointerEvents="none"
              style={[
                styles.marker,
                {
                  left: (p.x / natural.width) * displayed.width - 8,
                  top: (p.y / natural.height) * displayed.height - 8,
                },
              ]}
            />
          ))}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    textAlign: 'center',
    marginVertical: 8,
    paddingHorizontal: 12,
  },
  image: {
    width: '100%',
    backgroundColor: '#eee',
  },
  marker: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'red',
    borderWidth: 2,
    borderColor: 'white',
  },
});
