// Historique des versions, écrit à la main en français pour l'écran
// "Nouveautés" de l'app. À compléter à chaque nouvelle version (voir
// scripts/render-changelog.js pour la génération de CHANGELOG.md).

export type ChangelogEntry = {
  version: string;
  date: string;
  changes: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.1.1',
    date: '2026-07-23',
    changes: [
      "Le nom de l'onglet \"Planning\" ne change plus quand le titre de l'écran change.",
      'Les boutons avec juste une icône (supprimer, monter, descendre...) sont maintenant décrits pour les lecteurs d\'écran.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-07-19',
    changes: [
      "Renommage de l'app en \"Sodexo Planning\", avec une nouvelle icône.",
      "Possibilité d'exporter le planning d'un(e) collègue, pas seulement le sien.",
      'Rappel la veille de chaque jour travaillé, avec heure réglable.',
      'Rappel périodique pour penser à faire une sauvegarde.',
      'Nouvelle vue calendrier du mois, avec les couleurs des groupes de postes.',
      "Sélection d'un collègue et navigation entre les mois simplifiées dans \"Mon planning\".",
      "Nouvelles pages dans Réglages : À propos, Contact, Confidentialité, Sauvegarde.",
      "Écran de secours si l'app rencontre un problème inattendu, au lieu d'un plantage.",
    ],
  },
];
