#!/usr/bin/env node
// Enchaîne bump de version (optionnel) + prebuild natif + build release +
// install sur le téléphone connecté (USB ou adb sans fil) + publication sur
// GitHub (push + Release avec l'APK attaché, pour que le bandeau de mise à
// jour dans l'app puisse la détecter), pour éviter de relancer toutes ces
// étapes à la main à chaque changement.
//
// Usage:
//   node scripts/release.js            (rebuild avec la version actuelle, sans publier)
//   node scripts/release.js patch      (fix)
//   node scripts/release.js minor      (petite mise à jour)
//   node scripts/release.js major      (grosse mise à jour)

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const { loadChangelog } = require('./lib/loadChangelog');
const { prepareJavaEnv } = require('./lib/resolveJdk');

const root = path.join(__dirname, '..');
const bumpType = process.argv[2];

function run(cmd, cwd = root) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

// La JBR d'Android Studio (JDK 25) casse `assembleRelease` (voir lib/resolveJdk.js).
// On ajoute au besoin --enable-native-access=ALL-UNNAMED pour les sous-JVM Gradle.
const jdkNote = prepareJavaEnv();
if (jdkNote) console.log(`\nℹ️  ${jdkNote}`);

const androidDir = path.join(root, 'android');
const gradlewPath = path.join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');

if (bumpType) {
  if (!['patch', 'minor', 'major'].includes(bumpType)) {
    console.error('Usage: node scripts/release.js [patch|minor|major]');
    process.exit(1);
  }
  run(`node scripts/bump-version.js ${bumpType}`);
}

// Un démon Gradle encore actif verrouille android/ et fait échouer
// `prebuild --clean` en EBUSY — on l'arrête d'abord.
if (fs.existsSync(gradlewPath)) {
  try {
    run(`"${gradlewPath}" --stop`, androidDir);
  } catch {}
}

run('npx expo prebuild --clean --platform android');

run(`"${gradlewPath}" assembleRelease`, androidDir);

const apkPath = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
if (!fs.existsSync(apkPath)) {
  console.error(`\n❌ APK introuvable à ${apkPath}`);
  process.exit(1);
}

const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
const adbBin = androidHome
  ? path.join(androidHome, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb')
  : 'adb';

try {
  run(`"${adbBin}" install -r "${apkPath}"`);
  console.log('\n✅ APK installé sur le téléphone.');
} catch {
  console.warn(`\n⚠️  Installation adb impossible (téléphone non détecté ?). L'APK est prêt ici :\n${apkPath}`);
}

// Seulement si on vient de changer de version : pas la peine de re-publier
// une Release GitHub identique en cas de simple rebuild.
if (bumpType) {
  const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  const version = appJson.expo.version;
  const tag = `v${version}`;

  const entries = loadChangelog();
  const notes = entries.find((e) => e.version === version)?.changes.map((c) => `- ${c}`).join('\n') ?? '';

  // Nom d'asset lisible sur la Release (l'updater prend le 1er *.apk).
  const releaseApkPath = path.join(path.dirname(apkPath), `sodexo-planning-${tag}.apk`);
  const notesPath = path.join(root, '.release-notes.tmp.md');
  fs.copyFileSync(apkPath, releaseApkPath);
  fs.writeFileSync(notesPath, notes);

  try {
    run('git push origin main');
    run(`gh release create ${tag} "${releaseApkPath}" --title "${tag}" --notes-file "${notesPath}"`);
    console.log(`\n✅ Release ${tag} publiée sur GitHub.`);
  } catch {
    console.warn(
      `\n⚠️  Publication GitHub impossible (push ou "gh release create" a échoué). L'app reste installée en local, mais le bandeau de mise à jour ne verra pas ${tag}.`
    );
  } finally {
    fs.rmSync(notesPath, { force: true });
    fs.rmSync(releaseApkPath, { force: true });
  }
}
