// Insets à 0 hors SafeAreaProvider (les tests rendent les composants sans le provider racine).
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
