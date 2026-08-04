// Charge lib/changelog.ts (source unique, éditée à la main) sans passer par
// ts-node : transpile à la volée avec le compilateur TypeScript déjà présent
// en devDependency. Partagé par render-changelog.js et release.js.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const changelogTsPath = path.join(__dirname, '..', '..', 'lib', 'changelog.ts');

function loadChangelog() {
  const source = fs.readFileSync(changelogTsPath, 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module_ = { exports: {} };
  new Function('module', 'exports', js)(module_, module_.exports);
  return module_.exports.CHANGELOG;
}

module.exports = { loadChangelog };
