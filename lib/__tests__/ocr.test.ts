import { assignBlocksToGrid, type OcrBlock } from '@/lib/ocr';

describe('assignBlocksToGrid', () => {
  const topLeft = { x: 0, y: 0 };
  const bottomRight = { x: 100, y: 40 };

  it('assigne chaque bloc à la case dont le centre contient le bloc', () => {
    const blocks: OcrBlock[] = [
      { text: 'd1', x: 5, y: 5 }, // ligne 0, colonne 0
      { text: 'x', x: 95, y: 5 }, // ligne 0, dernière colonne
      { text: 'e2', x: 55, y: 35 }, // ligne 1, colonne du milieu
    ];

    const grid = assignBlocksToGrid(blocks, topLeft, bottomRight, 2, 10);

    expect(grid[0][0]).toBe('D1');
    expect(grid[0][9]).toBe('X');
    expect(grid[1][5]).toBe('E2');
  });

  it('ignore les blocs en dehors du rectangle', () => {
    const blocks: OcrBlock[] = [{ text: 'hors-zone', x: -10, y: -10 }];
    const grid = assignBlocksToGrid(blocks, topLeft, bottomRight, 2, 2);
    expect(grid.flat().every((cell) => cell === '')).toBe(true);
  });

  it('concatène plusieurs mots tombant dans la même case', () => {
    const blocks: OcrBlock[] = [
      { text: 'CS', x: 5, y: 5 },
      { text: '++', x: 6, y: 6 },
    ];
    const grid = assignBlocksToGrid(blocks, topLeft, bottomRight, 1, 1);
    expect(grid[0][0]).toBe('CS ++');
  });

  it('retourne une grille vide de la bonne taille si le rectangle est invalide', () => {
    const grid = assignBlocksToGrid([], { x: 10, y: 10 }, { x: 5, y: 5 }, 3, 4);
    expect(grid).toHaveLength(3);
    expect(grid[0]).toHaveLength(4);
    expect(grid.flat().every((cell) => cell === '')).toBe(true);
  });
});
