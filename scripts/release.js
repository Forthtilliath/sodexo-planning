#!/usr/bin/env node
// Enchaîne bump de version (optionnel) + prebuild natif + build release + install
// sur le téléphone connecté (USB ou adb sans fil), pour éviter de relancer ces
// étapes à la main une par une à chaque changement.
//
// Usage:
//   node scripts/release.js            (rebuild avec la version actuelle)
//   node scripts/release.js patch      (fix)
//   node scripts/release.js minor      (petite mise à jour)
//   node scripts/release.js major      (grosse mise à jour)

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const bumpType = process.argv[2];

function run(cmd, cwd = root) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

if (bumpType) {
  if (!['patch', 'minor', 'major'].includes(bumpType)) {
    console.error('Usage: node scripts/release.js [patch|minor|major]');
    process.exit(1);
  }
  run(`node scripts/bump-version.js ${bumpType}`);
}

run('npx expo prebuild --clean --platform android');

const androidDir = path.join(root, 'android');
const gradlewPath = path.join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
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
