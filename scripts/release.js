#!/usr/bin/env node
// Build et publication de l'app, sans jamais pousser sur main : une nouvelle
// version passe par une branche et une pull request, la release GitHub n'est
// créée qu'une fois la PR fusionnée, à partir du code de main.
//
// Usage:
//   node scripts/release.js                 rebuild + installation sur le téléphone (rien n'est publié)
//   node scripts/release.js patch|minor|major
//       1. depuis main à jour : monte la version (lib/changelog.ts déjà rempli à la main),
//       2. crée la branche chore/release-v<version>, build, installe sur le téléphone,
//       3. committe, pousse la branche et ouvre la pull request.
//   node scripts/release.js publish
//       après fusion de la PR, depuis main : rebuild du code fusionné, release GitHub
//       v<version> avec l'APK Sodexo-Planning-<version>.apk, branche release/v<version>.

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const { loadChangelog } = require('./lib/loadChangelog');
const { prepareJavaEnv } = require('./lib/resolveJdk');

const root = path.join(__dirname, '..');
const androidDir = path.join(root, 'android');
const gradlewPath = path.join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
const apkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
// Fichiers modifiés par une montée de version (lib/changelog.ts est rempli à la main avant).
const VERSION_FILES = ['app.json', 'package.json', 'CHANGELOG.md', 'lib/changelog.ts'];

function run(cmd, cwd = root) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function read(cmd) {
  return execSync(cmd, { cwd: root, encoding: 'utf8' }).trim();
}

function fail(message) {
  console.error(`\n❌ ${message}`);
  process.exit(1);
}

function currentVersion() {
  return JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo.version;
}

/** Depuis main, à jour avec origin/main, sans autre modification que `allowed`. */
function assertCleanMain(allowed = []) {
  if (read('git rev-parse --abbrev-ref HEAD') !== 'main') fail('Lance cette commande depuis la branche main.');
  run('git pull --rebase origin main');
  const dirty = read('git status --porcelain')
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3))
    .filter((file) => !allowed.includes(file));
  if (dirty.length) fail(`Modifications en cours à committer ou ranger d'abord :\n  ${dirty.join('\n  ')}`);
}

function buildAndInstall() {
  // La JBR d'Android Studio (JDK 25) casse `assembleRelease` (voir lib/resolveJdk.js).
  const jdkNote = prepareJavaEnv();
  if (jdkNote) console.log(`\nℹ️  ${jdkNote}`);

  // Un démon Gradle encore actif verrouille android/ et fait échouer `prebuild --clean` en EBUSY.
  if (fs.existsSync(gradlewPath)) {
    try {
      run(`"${gradlewPath}" --stop`, androidDir);
    } catch {
      // Best-effort : le démon n'est peut-être déjà pas lancé.
    }
  }
  run('npx expo prebuild --clean --platform android');
  run(`"${gradlewPath}" assembleRelease`, androidDir);
  if (!fs.existsSync(apkPath)) fail(`APK introuvable à ${apkPath}`);

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
}

/** Monte la version sur une branche dédiée, vérifie le build, puis ouvre la pull request. */
function prepareRelease(bumpType) {
  assertCleanMain(['lib/changelog.ts']);
  run(`node scripts/bump-version.js ${bumpType}`);
  const version = currentVersion();
  if (!loadChangelog().some((entry) => entry.version === version)) {
    console.warn(`\n⚠️  Aucune entrée ${version} dans lib/changelog.ts : la release n'aura pas de notes.`);
  }
  const branch = `chore/release-v${version}`;
  run(`git switch -c ${branch}`);

  buildAndInstall();

  run(`git add ${VERSION_FILES.join(' ')}`);
  run(`git commit -m "chore: release v${version}"`);
  run(`git push -u origin ${branch}`);
  run(`gh pr create --base main --title "chore: release v${version}" --body "Version ${version}." --label chore`);
  console.log(`\n✅ PR ouverte. Une fois fusionnée : git switch main && npm run release:publish`);
}

/** Après fusion : rebuild depuis main, release GitHub avec l'APK, branche release/v<version>. */
function publishRelease() {
  assertCleanMain();
  const version = currentVersion();
  const tag = `v${version}`;
  if (read(`git ls-remote --tags origin refs/tags/${tag}`)) fail(`La release ${tag} existe déjà.`);

  buildAndInstall();

  const notes = loadChangelog().find((e) => e.version === version)?.changes.map((c) => `- ${c}`).join('\n') ?? '';
  // Nom avec l'app et la version : l'updater intégré prend le .apk de la release, quel que soit son nom.
  const releaseApkPath = path.join(path.dirname(apkPath), `Sodexo-Planning-${version}.apk`);
  const notesPath = path.join(root, '.release-notes.tmp.md');
  fs.copyFileSync(apkPath, releaseApkPath);
  fs.writeFileSync(notesPath, notes);
  try {
    run(`gh release create ${tag} "${releaseApkPath}" --target main --title "Sodexo Planning ${version}" --notes-file "${notesPath}"`);
    run(`git push origin HEAD:refs/heads/release/${tag}`);
    console.log(`\n✅ Release ${tag} publiée sur GitHub, branche release/${tag} créée.`);
  } finally {
    fs.rmSync(notesPath, { force: true });
    fs.rmSync(releaseApkPath, { force: true });
  }
}

const mode = process.argv[2];
if (mode === undefined) buildAndInstall();
else if (['patch', 'minor', 'major'].includes(mode)) prepareRelease(mode);
else if (mode === 'publish') publishRelease();
else fail('Usage: node scripts/release.js [patch|minor|major|publish]');
