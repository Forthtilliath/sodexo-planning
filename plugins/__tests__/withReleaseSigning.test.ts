const { applyReleaseSigning } = require('../withReleaseSigning') as {
  applyReleaseSigning: (contents: string, prefix: string | undefined) => string;
};

// Extrait du android/app/build.gradle généré par `expo prebuild` (SDK 57).
const EXPO_BUILD_GRADLE = `
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug
            def enableShrinkResources = findProperty('android.enableShrinkResourcesInReleaseBuilds') ?: 'false'
        }
    }
`;

describe('applyReleaseSigning', () => {
  it("signe le release avec la clé d'upload, lue en propriétés Gradle préfixées", () => {
    const result = applyReleaseSigning(EXPO_BUILD_GRADLE, 'MONAPP');

    expect(result).toMatch(
      /release \{[^}]*?\/\/ see [^\n]*\n\s*signingConfig signingConfigs\.release/,
    );
    expect(result).toContain("storeFile file(findProperty('MONAPP_UPLOAD_STORE_FILE'))");
    expect(result).toContain("keyPassword findProperty('MONAPP_UPLOAD_KEY_PASSWORD')");
  });

  it('garde la clé de debug pour le build debug', () => {
    const result = applyReleaseSigning(EXPO_BUILD_GRADLE, 'MONAPP');

    expect(result).toMatch(/debug \{\s*signingConfig signingConfigs\.debug/);
    expect(result.match(/signingConfig signingConfigs\.debug/g)).toHaveLength(1);
  });

  it('ne modifie pas un fichier déjà traité (prebuild relancé)', () => {
    const once = applyReleaseSigning(EXPO_BUILD_GRADLE, 'MONAPP');

    expect(applyReleaseSigning(once, 'MONAPP')).toBe(once);
  });

  it('échoue si le modèle Gradle ne correspond plus, plutôt que de laisser la clé de debug', () => {
    expect(() => applyReleaseSigning('android { }', 'MONAPP')).toThrow(
      'bloc de signature introuvable',
    );
  });

  it('exige un préfixe de propriétés', () => {
    expect(() => applyReleaseSigning(EXPO_BUILD_GRADLE, undefined)).toThrow('propertyPrefix');
    expect(() => applyReleaseSigning(EXPO_BUILD_GRADLE, 'mon-app')).toThrow('propertyPrefix');
  });
});
