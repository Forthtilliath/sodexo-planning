const { withAppBuildGradle } = require('@expo/config-plugins');

// Le dossier .cxx par défaut (imbriqué dans android/app) dépasse la limite
// Windows de 260 caractères sur les builds release (RelWithDebInfo), à cause
// des chemins de codegen react-native-gesture-handler. On le sort du projet.
const INJECTED = `    externalNativeBuild {
        cmake {
            buildStagingDirectory "C:/rncxx"
        }
    }

    namespace`;

module.exports = function withShortCxxPath(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.contents.includes('buildStagingDirectory')) {
      return config;
    }
    config.modResults.contents = config.modResults.contents.replace('    namespace', INJECTED);
    return config;
  });
};
