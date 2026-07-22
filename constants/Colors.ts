const tintColorLight = '#2f95dc';
const tintColorDark = '#5aa9e6';

const Colors = {
  light: {
    text: '#000',
    background: '#fff',
    card: '#fff',
    modalCard: '#fff',
    border: '#999',
    borderSubtle: 'rgba(128,128,128,0.3)',
    divider: '#ccc',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
    danger: '#a33',
    dangerStrong: '#d33',
    holiday: '#e08a00',
    overlay: 'rgba(0,0,0,0.4)',
    tintSoft: 'rgba(47,149,220,0.1)',
    dangerSoft: 'rgba(200,50,50,0.08)',
    onTint: '#fff', // texte/icône sur un fond de couleur d'accent (bouton plein, badge...)
  },
  dark: {
    text: '#f2f2f2',
    background: '#121212',
    card: '#1e1e1e',
    modalCard: '#242424',
    border: '#5c5c5c',
    borderSubtle: 'rgba(255,255,255,0.16)',
    divider: '#444',
    tint: tintColorDark,
    tabIconDefault: '#888',
    tabIconSelected: tintColorDark,
    danger: '#e57373',
    dangerStrong: '#ef5350',
    holiday: '#f2b459',
    overlay: 'rgba(0,0,0,0.6)',
    tintSoft: 'rgba(90,169,230,0.16)',
    dangerSoft: 'rgba(229,115,115,0.14)',
    onTint: '#fff',
  },
};

export default Colors;

export type ThemeColors = typeof Colors.light;
