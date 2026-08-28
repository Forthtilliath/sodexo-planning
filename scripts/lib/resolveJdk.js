// Adapte l'environnement Java pour que `assembleRelease` passe même avec un JDK
// récent (24+).
//
// AGP 8.x lance le CLI prefab dans un sous-JVM (le même JDK que le démon
// Gradle) et fait échouer la tâche `configureCMake…` sur toute ligne inconnue
// de sa sortie d'erreur. Depuis le JDK 24, `System.load()` est une « méthode
// restreinte » : le JVM écrit des avertissements « restricted method … » sur
// stderr, qui déclenchent cet échec. C'est le cas de la JBR d'Android Studio,
// passée en JDK 25.
//
// Contournement : passer --enable-native-access=ALL-UNNAMED au sous-JVM via
// JAVA_TOOL_OPTIONS. Ça fait taire les avertissements, et la seule ligne
// ajoutée (« Picked up JAVA_TOOL_OPTIONS: … ») fait partie des lignes que AGP
// tolère explicitement. Sans effet sur un JDK plus ancien (< 24), où on ne
// touche à rien.

const { spawnSync } = require('child_process');
const path = require('path');

const NATIVE_ACCESS_FLAG = '--enable-native-access=ALL-UNNAMED';
const FIRST_BROKEN_MAJOR = 24;
const JAVA_BIN = process.platform === 'win32' ? 'java.exe' : 'java';

// Version majeure du JDK courant (JAVA_HOME sinon le PATH), ou null.
function currentJavaMajor() {
  const bin = process.env.JAVA_HOME
    ? path.join(process.env.JAVA_HOME, 'bin', JAVA_BIN)
    : JAVA_BIN;
  const res = spawnSync(bin, ['-version'], { encoding: 'utf8' });
  if (res.status !== 0) return null;
  const text = `${res.stderr || ''}${res.stdout || ''}`;
  const m = text.match(/version "(\d+)(?:\.(\d+))?/);
  if (!m) return null;
  const major = Number(m[1]);
  return major === 1 ? Number(m[2]) : major; // ancien schéma "1.8"
}

// Met à jour process.env si nécessaire. Renvoie un message à logguer, ou null.
function prepareJavaEnv() {
  const major = currentJavaMajor();
  if (!major || major < FIRST_BROKEN_MAJOR) return null;

  const existing = process.env.JAVA_TOOL_OPTIONS || '';
  if (!existing.includes('--enable-native-access')) {
    process.env.JAVA_TOOL_OPTIONS = `${existing} ${NATIVE_ACCESS_FLAG}`.trim();
  }
  return `JDK ${major} détecté → JAVA_TOOL_OPTIONS="${process.env.JAVA_TOOL_OPTIONS}" (contournement prefab/native-access).`;
}

module.exports = { prepareJavaEnv, currentJavaMajor };
