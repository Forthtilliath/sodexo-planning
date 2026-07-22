#!/usr/bin/env node
// Bump la version de l'app (semver) et incrémente le versionCode Android.
// Usage: node scripts/bump-version.js <major|minor|patch>
//   patch = correctif (fix)
//   minor = petite mise à jour (nouvelle fonctionnalité sans casser l'existant)
//   major = grosse mise à jour
//
// Avant de lancer ce script, ajoute une entrée pour la nouvelle version dans
// lib/changelog.ts (à la main, en français, pour l'écran "Nouveautés") —
// ce script se contente ensuite de régénérer CHANGELOG.md à partir de ça.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const bumpType = process.argv[2];
if (!['major', 'minor', 'patch'].includes(bumpType)) {
  console.error('Usage: node scripts/bump-version.js <major|minor|patch>');
  process.exit(1);
}

const appJsonPath = path.join(__dirname, '..', 'app.json');
const packageJsonPath = path.join(__dirname, '..', 'package.json');

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const current = appJson.expo.version;
const [major, minor, patch] = current.split('.').map(Number);

let next;
if (bumpType === 'major') next = `${major + 1}.0.0`;
else if (bumpType === 'minor') next = `${major}.${minor + 1}.0`;
else next = `${major}.${minor}.${patch + 1}`;

const nextVersionCode = (appJson.expo.android?.versionCode ?? 1) + 1;

appJson.expo.version = next;
appJson.expo.android = { ...appJson.expo.android, versionCode: nextVersionCode };
packageJson.version = next;

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`Version : ${current} -> ${next} (versionCode ${nextVersionCode})`);

execFileSync(process.execPath, [path.join(__dirname, 'render-changelog.js')], { stdio: 'inherit' });
