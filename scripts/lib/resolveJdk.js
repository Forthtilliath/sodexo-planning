// Choisit un JDK utilisable pour le build Android release.
//
// Contexte : la JBR embarquée d'Android Studio est passée en JDK 25, et avec
// ce JDK `gradlew assembleRelease` casse à la tâche `configureCMakeRelWithDebInfo`
// (AGP prend les avertissements « restricted method » du JDK récent, écrits sur
// stderr par le sous-processus prefab, pour des erreurs fatales). AGP + React
// Native 0.86 veulent un JDK 17.
//
// Si le `java` courant (via JAVA_HOME ou le PATH) est dans la plage supportée,
// on ne touche à rien. Sinon on cherche un JDK 17 déjà installé (dont celui
// que Gradle télécharge dans ~/.gradle/jdks) et on renvoie son chemin, à
// mettre dans JAVA_HOME pour les sous-processus Gradle.

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MIN_SUPPORTED = 17;
const MAX_SUPPORTED = 21;
const PREFERRED = 17;
const JAVA_BIN = process.platform === 'win32' ? 'java.exe' : 'java';

// Renvoie la version majeure du JDK à ce chemin (dossier home ou binaire), ou null.
function javaMajor(javaHomeOrBin) {
  let bin = javaHomeOrBin;
  try {
    if (fs.statSync(javaHomeOrBin).isDirectory()) {
      bin = path.join(javaHomeOrBin, 'bin', JAVA_BIN);
    }
  } catch {
    return null;
  }
  const res = spawnSync(bin, ['-version'], { encoding: 'utf8' });
  if (res.status !== 0) return null;
  const text = `${res.stderr || ''}${res.stdout || ''}`;
  const m = text.match(/version "(\d+)(?:\.(\d+))?/);
  if (!m) return null;
  const major = Number(m[1]);
  return major === 1 ? Number(m[2]) : major; // ancien schéma "1.8"
}

function currentJavaMajor() {
  if (process.env.JAVA_HOME) {
    const major = javaMajor(process.env.JAVA_HOME);
    if (major) return major;
  }
  return javaMajor(JAVA_BIN); // via le PATH
}

// Emplacements candidats d'un JDK 17, du plus spécifique au plus générique.
function candidateJdkHomes() {
  const homes = [];

  // JDK téléchargés par Gradle (toolchains auto-provisioning).
  const gradleJdks = path.join(os.homedir(), '.gradle', 'jdks');
  try {
    for (const name of fs.readdirSync(gradleJdks)) {
      const dir = path.join(gradleJdks, name);
      homes.push(dir);
      // Gradle imbrique parfois le vrai JDK dans un sous-dossier.
      try {
        for (const sub of fs.readdirSync(dir)) homes.push(path.join(dir, sub));
      } catch {}
    }
  } catch {}

  // Installations classiques par plateforme.
  if (process.platform === 'win32') {
    for (const base of [
      'C:\\Program Files\\Eclipse Adoptium',
      'C:\\Program Files\\Java',
      'C:\\Program Files\\Microsoft',
    ]) {
      try {
        for (const name of fs.readdirSync(base)) homes.push(path.join(base, name));
      } catch {}
    }
  } else if (process.platform === 'darwin') {
    const base = '/Library/Java/JavaVirtualMachines';
    try {
      for (const name of fs.readdirSync(base)) homes.push(path.join(base, name, 'Contents', 'Home'));
    } catch {}
  } else {
    const base = '/usr/lib/jvm';
    try {
      for (const name of fs.readdirSync(base)) homes.push(path.join(base, name));
    } catch {}
  }

  return homes;
}

// Renvoie { javaHome } à injecter dans l'environnement, ou null si le JDK
// courant convient déjà. Lève une erreur si aucun JDK utilisable n'est trouvé.
function resolveJdkHome() {
  const current = currentJavaMajor();
  if (current && current >= MIN_SUPPORTED && current <= MAX_SUPPORTED) {
    return null;
  }

  const seen = new Set();
  const found = [];
  for (const home of candidateJdkHomes()) {
    const real = path.normalize(home);
    if (seen.has(real)) continue;
    seen.add(real);
    const major = javaMajor(real);
    if (major && major >= MIN_SUPPORTED && major <= MAX_SUPPORTED) {
      found.push({ home: real, major });
    }
  }

  found.sort((a, b) => Math.abs(a.major - PREFERRED) - Math.abs(b.major - PREFERRED));

  if (found.length === 0) {
    const label = current ? `JDK ${current}` : 'JDK inconnu';
    throw new Error(
      `Le ${label} courant n'est pas compatible avec le build Android release ` +
        `(il faut un JDK ${MIN_SUPPORTED}–${MAX_SUPPORTED}) et aucun JDK compatible n'a été trouvé.\n` +
        `Installe un JDK 17 (ex. Temurin 17) puis relance, ou pointe JAVA_HOME dessus.`
    );
  }

  return { javaHome: found[0].home, major: found[0].major, currentMajor: current };
}

module.exports = { resolveJdkHome };
