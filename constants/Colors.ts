// Couleurs de marque Sodexo : le bleu porte l'identité (en-têtes, accents,
// éléments actifs) et le rouge sert de touche ponctuelle (filet sous l'en-tête,
// actions destructrices marquées).
const sodexoBlue = '#03318C';
const sodexoBlueDark = '#0A2E7A';
const sodexoRed = '#E30613';
const sodexoRedDark = '#F2554E';

const tintColorLight = sodexoBlue;
const tintColorDark = '#6E9BF0';

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
    tabIconDefault: '#5f6368',
    tabIconSelected: tintColorLight,
    danger: '#a33',
    dangerStrong: sodexoRed,
    holiday: '#e08a00',
    overlay: 'rgba(0,0,0,0.4)',
    tintSoft: 'rgba(3,49,140,0.1)',
    dangerSoft: 'rgba(200,50,50,0.08)',
    onTint: '#fff', // texte/icône sur un fond de couleur d'accent (bouton plein, badge...)
    headerBackground: sodexoBlue,
    headerText: '#fff', // titre, flèche de retour et icônes de l'en-tête
    headerAccent: sodexoRed, // filet de rappel sous l'en-tête
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
    tabIconDefault: '#9aa0a6',
    tabIconSelected: tintColorDark,
    danger: '#e57373',
    dangerStrong: sodexoRedDark,
    holiday: '#f2b459',
    overlay: 'rgba(0,0,0,0.6)',
    tintSoft: 'rgba(110,155,240,0.16)',
    dangerSoft: 'rgba(229,115,115,0.14)',
    onTint: '#fff',
    headerBackground: sodexoBlueDark,
    headerText: '#fff',
    headerAccent: sodexoRedDark,
  },
};

export default Colors;

export type ThemeColors = typeof Colors.light;
