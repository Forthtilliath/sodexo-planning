#!/usr/bin/env node
// Régénère CHANGELOG.md (pour GitHub) à partir de lib/changelog.ts, qui est
// la seule source à éditer à la main (en français, pour l'écran "Nouveautés"
// de l'app). Appelé automatiquement par bump-version.js.
//
// Usage: node scripts/render-changelog.js

const fs = require('fs');
const path = require('path');

const { loadChangelog } = require('./lib/loadChangelog');

const root = path.join(__dirname, '..');
const changelogMdPath = path.join(root, 'CHANGELOG.md');

function toMarkdown(entries) {
  const lines = ['# Journal des modifications', ''];
  for (const entry of entries) {
    lines.push(`## ${entry.version} — ${entry.date}`, '');
    for (const change of entry.changes) lines.push(`- ${change}`);
    lines.push('');
  }
  return lines.join('\n').trimEnd() + '\n';
}

const entries = loadChangelog();
fs.writeFileSync(changelogMdPath, toMarkdown(entries));
console.log(`CHANGELOG.md régénéré (${entries.length} version(s)).`);
