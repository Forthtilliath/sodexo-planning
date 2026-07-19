export type Point = { x: number; y: number };

export type OcrBlock = {
  text: string;
  x: number; // centre de la bbox, en pixels de l'image d'origine
  y: number;
};

/**
 * Découpe le rectangle [topLeft, bottomRight] en rowCount x colCount cases
 * régulières et y assigne chaque bloc OCR selon le centre de sa bbox.
 * Logique pure, indépendante de ML Kit, testable unitairement.
 */
export function assignBlocksToGrid(
  blocks: OcrBlock[],
  topLeft: Point,
  bottomRight: Point,
  rowCount: number,
  colCount: number
): string[][] {
  const grid: string[][] = Array.from({ length: rowCount }, () => Array(colCount).fill(''));

  const width = bottomRight.x - topLeft.x;
  const height = bottomRight.y - topLeft.y;
  if (width <= 0 || height <= 0 || rowCount <= 0 || colCount <= 0) {
    return grid;
  }

  const cellWidth = width / colCount;
  const cellHeight = height / rowCount;

  for (const block of blocks) {
    const relX = block.x - topLeft.x;
    const relY = block.y - topLeft.y;
    if (relX < 0 || relY < 0 || relX > width || relY > height) continue;

    const col = Math.min(colCount - 1, Math.floor(relX / cellWidth));
    const row = Math.min(rowCount - 1, Math.floor(relY / cellHeight));

    const current = grid[row][col];
    grid[row][col] = current ? `${current} ${block.text}` : block.text;
  }

  return grid.map((row) => row.map((cell) => cell.trim().toUpperCase()));
}

/**
 * Lance l'OCR ML Kit sur l'image et retourne les mots détectés avec leur
 * position (centre de bbox). Nécessite le module natif
 * @react-native-ml-kit/text-recognition, donc un dev client (pas Expo Go).
 */
export async function recognizeWords(imageUri: string): Promise<OcrBlock[]> {
  const { default: TextRecognition } = await import('@react-native-ml-kit/text-recognition');
  const result = await TextRecognition.recognize(imageUri);

  const words: OcrBlock[] = [];
  for (const block of result.blocks) {
    for (const line of block.lines) {
      for (const element of line.elements) {
        const frame = element.frame;
        if (!frame) continue;
        words.push({
          text: element.text,
          x: frame.left + frame.width / 2,
          y: frame.top + frame.height / 2,
        });
      }
    }
  }
  return words;
}
