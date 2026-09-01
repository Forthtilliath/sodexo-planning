// En sombre, la couleur se mélange à du quasi-noir : on pousse l'opacité pour
// qu'elle reste repérable.
export function hexToSoftBackground(hex: string, isDark: boolean): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${isDark ? 0.45 : 0.22})`;
}
