# Sodexo Planning

Application mobile personnelle (React Native / Expo) pour gérer un planning de travail mensuel : saisie manuelle des postes, code couleur par groupe de postes, jours fériés, export vers l'agenda, et rappel avant chaque jour travaillé.

## Fonctionnalités

- **Création de planning** — grille pré-remplie avec la liste des salariés, saisie multi-jours (sélection + un tap pour affecter un poste).
- **Groupes de postes** — codes de poste regroupés par équipe, avec une couleur dédiée pour les repérer en un coup d'œil.
- **Horaires par poste** — heures de début/fin associées à chaque code, affichées à la demande et utilisées dans l'export agenda.
- **Jours fériés** — marquage manuel par mois, mis en évidence dans le calendrier.
- **Mon planning** — vue personnelle (liste ou calendrier) avec les coéquipiers du jour, et consultation du planning d'un(e) collègue.
- **Synchro agenda (Android)** — écrit son propre planning dans un calendrier local « Sodexo Planning » du téléphone ; une nouvelle synchro remplace le mois, sans doublon.
- **Export .ics** — génère un fichier d'agenda avec les vrais horaires quand ils sont connus (pour un/une collègue, ou si l'accès à l'agenda est refusé). Les identifiants d'événements dépendent de la personne et de la date, pour qu'un ré-export mette à jour au lieu de dupliquer.
- **Rappel local** — notification la veille de chaque jour travaillé, heure configurable.
- **Sauvegarde / restauration** — export/import de toutes les données au format JSON (l'app ne stocke rien ailleurs que sur l'appareil).

## Stack technique

- [Expo](https://docs.expo.dev/versions/v57.0.0/) (SDK 57) / React Native
- [Expo Router](https://docs.expo.dev/router/introduction/) pour la navigation
- TypeScript
- Stockage local via `@react-native-async-storage/async-storage`
- Jest pour les tests unitaires (`lib/`)

## Démarrage

```bash
npm install
npx expo start
```

Build natif local (Android) :

```bash
npx expo run:android
```

### Signer l'APK de release

L'APK de release (`npm run release`) est signé avec une clé propre à Sodexo Planning, jamais avec le `debug.keystore` public de React Native (plugin [`plugins/withReleaseSigning.js`](./plugins/withReleaseSigning.js)). Sans cette clé, `gradlew assembleRelease` échoue (« Keystore file not set »).

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

3. Vérifier avec `cd android && ./gradlew :app:signingReport` (section `Variant: release`).

L'APK n'embarque que le code natif des téléphones ARM (plugin [`plugins/withAndroidAbis.js`](./plugins/withAndroidAbis.js)) ; `npx expo run:android` cible de toute façon l'architecture de l'appareil branché, émulateur compris.

## Tests et vérification de types

```bash
npx jest
npx tsc --noEmit
```

## Confidentialité

Toutes les données (salariés, plannings, réglages) restent stockées uniquement sur l'appareil. Rien n'est envoyé à un serveur. La seule donnée qui quitte l'appareil est celle que l'utilisateur partage explicitement (export de sauvegarde ou d'un planning au format `.ics`). L'accès à l'agenda, s'il est accordé, sert uniquement à écrire dans le calendrier local « Sodexo Planning ».

## Projet personnel

Développé par [Forthtilliath](https://github.com/Forthtilliath) pour un usage personnel — pas de licence spécifique définie.
