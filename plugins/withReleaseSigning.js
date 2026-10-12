const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Signe l'APK de release avec la clé d'upload du projet au lieu du `debug.keystore` public de
 * React Native (même clé dans tous les projets RN : n'importe qui pourrait signer une fausse mise
 * à jour). La clé et ses mots de passe restent hors du dépôt, lus en propriétés Gradle
 * `<PREFIXE>_UPLOAD_*` (`~/.gradle/gradle.properties` ou variables `ORG_GRADLE_PROJECT_*`, voir
 * README). Le préfixe, propre à chaque app, se passe en option dans app.json :
 * `["./plugins/withReleaseSigning", { "propertyPrefix": "MONAPP" }]`.
 *
 * Sans ces propriétés, le build release échoue (« Keystore file not set ») plutôt que de
 * retomber silencieusement sur la clé de debug. Le build debug n'est pas touché.
 */

/** Le `signingConfig signingConfigs.debug` du bloc `release` de `buildTypes` (pas celui du `debug`). */
const RELEASE_USES_DEBUG_KEY =
  /(buildTypes\s*\{[\s\S]*?release\s*\{[^}]*?)signingConfig signingConfigs\.debug/;

function releaseSigningConfig(prefix) {
  const property = (name) => `findProperty('${prefix}_UPLOAD_${name}')`;
  return `signingConfigs {
        release {
            if (${property('STORE_FILE')}) {
                storeFile file(${property('STORE_FILE')})
                storePassword ${property('STORE_PASSWORD')}
                keyAlias ${property('KEY_ALIAS')}
                keyPassword ${property('KEY_PASSWORD')}
            }
        }`;
}

function applyReleaseSigning(contents, prefix) {
  if (!/^[A-Z][A-Z0-9_]*$/.test(prefix ?? '')) {
    throw new Error(
      'withReleaseSigning : option propertyPrefix manquante ou invalide (ex. MONAPP)',
    );
  }
  if (contents.includes('signingConfig signingConfigs.release')) return contents;
  if (!RELEASE_USES_DEBUG_KEY.test(contents) || !contents.includes('signingConfigs {')) {
    // Le modèle Gradle d'Expo a changé : mieux vaut casser le prebuild que livrer un APK signé
    // avec la clé de debug.
    throw new Error(
      'withReleaseSigning : bloc de signature introuvable dans android/app/build.gradle',
    );
  }
  return contents
    .replace(RELEASE_USES_DEBUG_KEY, '$1signingConfig signingConfigs.release')
    .replace('signingConfigs {', releaseSigningConfig(prefix));
}

module.exports = function withReleaseSigning(config, { propertyPrefix } = {}) {
  return withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = applyReleaseSigning(mod.modResults.contents, propertyPrefix);
    return mod;
  });
};

module.exports.applyReleaseSigning = applyReleaseSigning;
