// En sombre, une même opacité rend le fond beaucoup plus terne (mélangé à du
// quasi-noir plutôt qu'à du blanc) : on pousse l'opacité pour que la couleur
// du groupe reste repérable, y compris à la lumière du jour.
export function hexToSoftBackground(hex: string, isDark: boolean): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${isDark ? 0.45 : 0.22})`;
}
