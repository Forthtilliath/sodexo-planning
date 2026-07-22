# Sodexo Planning

Application mobile personnelle (React Native / Expo) pour gérer un planning de travail mensuel : saisie manuelle des postes, code couleur par groupe de postes, jours fériés, export vers l'agenda, et rappel avant chaque jour travaillé.

## Fonctionnalités

- **Création de planning** — grille pré-remplie avec la liste des salariés, saisie multi-jours (sélection + un tap pour affecter un poste).
- **Groupes de postes** — codes de poste regroupés par équipe, avec une couleur dédiée pour les repérer en un coup d'œil.
- **Horaires par poste** — heures de début/fin associées à chaque code, affichées à la demande et utilisées dans l'export agenda.
- **Jours fériés** — marquage manuel par mois, mis en évidence dans le calendrier.
- **Mon planning** — vue personnelle (liste ou calendrier) avec les coéquipiers du jour, et consultation du planning d'un(e) collègue.
- **Export .ics** — génère un fichier d'agenda avec les vrais horaires quand ils sont connus.
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

## Tests et vérification de types

```bash
npx jest
npx tsc --noEmit
```

## Confidentialité

Toutes les données (salariés, plannings, réglages) restent stockées uniquement sur l'appareil. Rien n'est envoyé à un serveur. La seule donnée qui quitte l'appareil est celle que l'utilisateur partage explicitement (export de sauvegarde ou d'un planning au format `.ics`).

## Projet personnel

Développé par [Forthtilliath](https://github.com/Forthtilliath) pour un usage personnel — pas de licence spécifique définie.
