const { withGradleProperties } = require('expo/config-plugins');

/**
 * N'embarque le code natif que pour les vrais téléphones (ARM 32 et 64 bits) : x86/x86_64 ne servent
 * qu'aux émulateurs et doublent presque la taille de l'APK. `expo run:android` passe de toute façon
 * `-PreactNativeArchitectures=<abi de l'appareil>`, ce qui prime sur cette valeur en développement.
 */
const ABIS = 'armeabi-v7a,arm64-v8a';

module.exports = function withAndroidAbis(config) {
  return withGradleProperties(config, (mod) => {
    // Seules les entrées de type `property` ont une clé (les commentaires n'en ont pas).
    const existing = mod.modResults.find((item) => item.key === 'reactNativeArchitectures');
    if (existing) existing.value = ABIS;
    else mod.modResults.push({ type: 'property', key: 'reactNativeArchitectures', value: ABIS });
    return mod;
  });
};
