# Sodexo Planning — README développeurs

Tout ce qu'il faut pour travailler sur le code de Sodexo Planning. La présentation de l'app (fonctionnalités, captures) est dans le [README principal](../README.md).

## Sommaire

- [Stack](#stack)
- [Démarrer](#démarrer)
- [Arborescence](#arborescence)
- [Modèle de données](#modèle-de-données)
- [Stockage et réactivité](#stockage-et-réactivité)
- [Sauvegarde et import](#sauvegarde-et-import)
- [Agenda, .ics et notifications](#agenda-ics-et-notifications)
- [Mises à jour intégrées](#mises-à-jour-intégrées)
- [Tests](#tests)
- [Signature et publication](#signature-et-publication)
- [Captures d'écran du README](#captures-décran-du-readme)

## Stack

| | |
|---|---|
| Framework | Expo SDK 57, React Native 0.86, React 19, TypeScript |
| Navigation | Expo Router (onglets Saisie, Mon planning, Outils, Réglages), routes typées |
| Stockage | AsyncStorage (`lib/db.ts`) |
| Validation | zod 4 (import des sauvegardes, `lib/backupSchema.ts`) |
| Natif | `expo-calendar` (agenda), `expo-notifications` (rappels), `expo-sharing`, `expo-file-system`, `react-native-draggable-flatlist` |
| Paquets maison | `@forthtilliath/react-native-kit` (BottomSheet, sélecteurs, `SwipeableRow`, `UndoToast`, `pickTextFile`, synchro agenda, écrans de réglages), `@forthtilliath/ts-kit` (dates, `.ics`, `slugify`), `@forthtilliath/expo-release-updates(-ui)`, `@forthtilliath/expo-config-plugins` |
| Plateforme | **Android uniquement**, identifiant `com.forth.sodexoplanning` (historique : ne pas le changer, Android y verrait une autre app) |

## Démarrer

```bash
npm install
npx expo run:android   # build de développement sur l'émulateur ou le téléphone branché
npm start              # Metro seul, pour une build de développement déjà installée
npx jest               # tests
npx tsc --noEmit       # types
npm run lint           # eslint (@forthtilliath/eslint-config)
```

## Arborescence

```
app/                       routes Expo Router
  (tabs)/index.tsx          Mon planning (ouvert au lancement)
  (tabs)/saisie.tsx         Saisie : créer / reprendre un planning
  (tabs)/tools/             Outils : collations & petits-déjeuners
  (tabs)/settings/          Réglages : mon nom, notifications, thème, groupes, salariés,
                            sauvegarde, mise à jour, à propos, contact, confidentialité
components/                composants d'écran (GridEditor, PersonDayEditor, MonthCalendarView,
                           DayDetailSheet, RosterCard, PlanningExportActions…) et adaptateurs
                           minces des composants du kit (palette appliquée)
hooks/                     useDbData (relecture sur écriture), useThemeColors, useKitStyles…
lib/
  db.ts                     lecture / écriture AsyncStorage, valeurs par défaut, renommages
  backup.ts, backupSchema.ts  export, import vérifié (zod), plafond de taille
  teams.ts                  codes de poste, groupes, horaires, « ma » ligne
  planningEvents.ts         jours travaillés → événements (agenda, .ics, rappels)
  calendarSync.ts           synchro dans le calendrier « Sodexo Planning »
  ics.ts, exportIcs.ts      fichier .ics (UID stables, lignes pliées à 75 octets)
  exportImage.ts            planning en image
  notifications.ts          rappels de la veille et rappel de sauvegarde
  collations.ts             menus et produits de l'outil Collations
  appUpdate.ts              mises à jour (releases GitHub vérifiées)
  changelog.ts              nouveautés de chaque version, rédigées à la main (source du CHANGELOG.md)
scripts/                   bump-version.js, release.js, render-changelog.js
types.ts                   types partagés (ScanRecord, RosterEntry, TeamGroup…)
```

## Modèle de données

Types dans `types.ts`, à la racine (alias `@/types`) :

- **`ScanRecord`** (un planning mensuel ; nom historique de l'époque où il venait d'un scan) : `year`, `month`, `days` (`AAAA-MM-JJ`), `employees` (noms, une ligne chacun), `grid` (`grid[ligne][jour]` = code de poste, `''` = repos), `holidays`.
- **`RosterEntry`** : un salarié — `name`, `active`, `regular` (ajouté à chaque nouveau planning, faux pour un intérimaire), `groupId`.
- **`TeamGroup`** : `label`, `codes`, `color`, `weekendVariant` (codes F1-F5 : même rôle que leur groupe de semaine, exclus des catégories affectables).
- **`CodeSchedule`** : `codes`, `start`, `end` (`HH:MM`).
- **Codes habituels** (`codeOptions`) : par nom de salarié, ses codes proposés en boutons rapides.
- **`Settings`** : `myName` (« Moi » par défaut, la ligne cherchée dans la grille), rappels, thème, suivi des mises à jour.

`lib/teams.ts` fixe l'ordre d'affichage des codes (`CODE_DISPLAY_ORDER` : E, D, C6-C8, C2-C5, B1, F) et le « poste majoritaire » d'un salarié.

## Stockage et réactivité

- Tout passe par `lib/db.ts` (clés `@rn-planning/*` d'AsyncStorage). Chaque écriture incrémente une version et prévient les abonnés : `hooks/useDbData.ts` recharge les écrans concernés, donc une modification faite dans Réglages apparaît tout de suite dans Saisie et Mon planning.
- Les valeurs par défaut (groupes de postes, horaires) ne servent que si le stockage est vide. La liste de salariés par défaut ne contient que « Moi » : **jamais de vrais noms dans le code**, le dépôt est public. Les collègues s'ajoutent dans l'app et voyagent avec la sauvegarde.
- Renommer un salarié réécrit son nom dans tous les plannings et ses codes habituels.

## Sauvegarde et import

`lib/backup.ts` :

- **Export** : les catégories cochées (`BackupSelection` : salariés, groupes, plannings, réglages) dans un JSON (`version: 1`), partagé par la feuille de partage Android.
- **Import** : `pickTextFile` du kit (sélecteur système, **10 Mo maximum vérifiés avant lecture**) → `JSON.parse` → `isValidBackup` (forme générale) → `validateBackupData` (`lib/backupSchema.ts`, **zod, chaque entrée** : types, bornes, formats de date et d'heure, couleurs ; clés inconnues retirées ; **rejet total** à la première anomalie avec un message affichable) → `importAllData` des seules catégories cochées et présentes.
- Toute évolution du format : mettre à jour le schéma **et** ses tests (`lib/__tests__/backup.test.ts`), garder la compatibilité avec les anciens fichiers.

## Agenda, .ics et notifications

- **Synchro agenda** : `syncDedicatedCalendar` du kit écrit les jours travaillés dans un calendrier local « Sodexo Planning » (créé au premier usage), après avoir effacé ceux du mois : pas de doublon. `toCalendarEventDetails` gère les postes de nuit (fin le lendemain) et les jours sans horaire (journée entière à minuit UTC, sinon Android les décale).
- **.ics** : `lib/ics.ts` (helpers de ts-kit) ; l'UID d'un événement dépend de la personne et de la date, pour qu'un ré-export mette à jour au lieu de dupliquer.
- **Rappels** : `lib/notifications.ts` programme une notification la veille de chaque jour travaillé, sur 60 jours, à l'heure choisie ; tout est reprogrammé à chaque changement de planning ou de réglage. Rappel de sauvegarde tous les 14 jours.

## Mises à jour intégrées

`lib/appUpdate.ts` (dépôt `Forthtilliath/sodexo-planning`) :

- `fetchLatestRelease` ne propose que les releases dont GitHub donne l'empreinte SHA-256 de l'APK (`requireVerifiedApk`) ;
- `downloadAndInstallApk(apkUrl, onProgress, apkSha256)` refuse une release sans empreinte, vérifie le SHA-256 et n'accepte que les URL des releases du dépôt (`allowedUrlPrefix`), puis confie l'APK à l'installeur d'Android.

Le bandeau du lancement et l'écran Réglages ▸ Mise à jour viennent d'`expo-release-updates-ui` et de `react-native-kit`.

## Tests

```bash
npx jest
```

Jest + `@testing-library/react-native`, à côté du code (`lib/__tests__`, `components/__tests__`, `app/**/__tests__`). Les modules natifs (fichiers, partage, agenda, notifications) sont simulés dans chaque test.

## Signature et publication

L'APK de release est signé avec la clé de Sodexo Planning, jamais avec le `debug.keystore` public (`@forthtilliath/expo-config-plugins/withReleaseSigning`, préfixe `SODEXOPLANNING`). Sans la clé, `assembleRelease` échoue (« Keystore file not set »).

1. Générer la clé une seule fois, **hors du dépôt**, et la sauvegarder (gestionnaire de mots de passe) : la perdre empêche toute mise à jour de l'app installée.
   ```powershell
   keytool -genkeypair -v -storetype PKCS12 -keyalg RSA -keysize 2048 -validity 10000 -alias sodexoplanning-upload -keystore "$env:USERPROFILE\keys\sodexoplanning-upload.keystore"
   ```
2. Déclarer son emplacement et son mot de passe dans `~/.gradle/gradle.properties` (jamais dans `android/`, régénéré par `expo prebuild`) :
   ```properties
   SODEXOPLANNING_UPLOAD_STORE_FILE=C:/Users/<toi>/keys/sodexoplanning-upload.keystore
   SODEXOPLANNING_UPLOAD_STORE_PASSWORD=...
   SODEXOPLANNING_UPLOAD_KEY_ALIAS=sodexoplanning-upload
   SODEXOPLANNING_UPLOAD_KEY_PASSWORD=...
   ```
3. Vérifier : `cd android && ./gradlew :app:signingReport` (section `Variant: release`).

`withAndroidAbis` limite le code natif aux téléphones ARM ; `npx expo run:android` cible de toute façon l'architecture de l'appareil branché.

**Version** : écrire d'abord les nouveautés dans `lib/changelog.ts` (en français, pour l'écran de l'app), puis `npm run version:patch | minor | major` : version semver et `versionCode` dans `app.json`, et `CHANGELOG.md` régénéré depuis `lib/changelog.ts`.

**Publication**, en deux temps, sans jamais pousser sur `main` :

1. `npm run release [patch|minor|major]`, depuis `main` à jour (seul `lib/changelog.ts` peut être modifié) : montée de version, branche `chore/release-v<version>`, `expo prebuild --clean` + `assembleRelease`, installation sur le téléphone branché, commit, push de la branche et ouverture de la PR.
2. Une fois la PR fusionnée : `git switch main` puis `npm run release:publish` : rebuild du code fusionné, release GitHub `v<version>` avec l'APK renommé `Sodexo-Planning-<version>.apk` et les notes de `lib/changelog.ts`, puis branche `release/v<version>`.

`npm run release` sans argument se contente de rebuilder et d'installer sur le téléphone.

## Captures d'écran du README

Les captures de [`screenshots/`](screenshots/) viennent de l'émulateur Pixel 6 (1080 × 2400), réduites à 540 × 1200, avec des données fictives :

1. Build release pour l'émulateur (les APK publiés, ARM uniquement, ne démarrent pas sur un émulateur x86_64) :
   ```bash
   npx expo prebuild --platform android
   cd android && ./gradlew assembleRelease -PreactNativeArchitectures=x86_64
   adb install -r app/build/outputs/apk/release/app-release.apk
   ```
2. Sauvegarde de démonstration (12 salariés fictifs, novembre 2026, fériés des 1er et 11), poussée par `adb push demo.json /sdcard/Download/` puis importée par Réglages ▸ Sauvegarde ▸ Importer.
3. Barre d'état en mode démo :
   ```bash
   adb shell settings put global sysui_demo_allowed 1
   adb shell am broadcast -a com.android.systemui.demo -e command enter
   adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 2030
   adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
   ```
4. `adb shell screencap -p /sdcard/s.png` puis `adb pull /sdcard/s.png`, réduire à 540 × 1200.
