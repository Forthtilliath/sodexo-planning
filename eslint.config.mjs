import { defineConfig, globalIgnores } from 'eslint/config';
import { createReactConfig } from '@forthtilliath/eslint-config/react';

const eslintConfig = defineConfig([
  ...createReactConfig({ strict: false, turbo: false, a11y: false }),
  {
    // Scripts Node CJS (package.json n'a pas "type": "module") : require() y est légitime.
    files: ['scripts/**/*.js', 'plugins/**/*.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    // COLOR_PALETTE co-localisée avec le composant qui la consomme (une seule
    // grille de nuances, pas de raison de l'isoler dans un autre fichier).
    files: ['components/ColorPalettePicker.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // Tests : require() est imposé par le hoisting des factories jest.mock(),
    // et les mocks de libs tierces (react-native-draggable-flatlist...) n'ont
    // pas de types officiels pratiques à réimporter juste pour un test.
    files: ['**/*.{test,spec}.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  globalIgnores(['.expo/**', 'dist/**', 'android/**', 'ios/**']),
]);

export default eslintConfig;
