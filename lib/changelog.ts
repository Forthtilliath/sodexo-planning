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
    version: '1.2.0',
    date: '2026-07-24',
    changes: [
      "Nouveau : l'app se met à jour toute seule — elle vérifie au lancement si une nouvelle version existe et propose de l'installer directement.",
      'Nouveau : choix du thème (clair, sombre, ou automatique selon le téléphone) dans Réglages.',
      'Nouveau : recherche et tri (alphabétique, ou par poste principal) dans la liste des salariés.',
      'Correction : export agenda (.ics) — un ré-export met maintenant à jour les événements déjà importés au lieu de créer des doublons en cas de changement de poste.',
      'Correction : suppression du bouton croix dans Saisie qui ne servait à rien (le salarié réapparaissait aussitôt).',
      'Correction : les couleurs de poste ressortent mieux dans le calendrier de "Mon planning" en mode sombre.',
      "Correction : dans le détail d'un jour (calendrier), les équipes sont maintenant triées dans le même ordre que les postes (E, D, C, B1).",
    ],
  },
  {
    version: '1.1.3',
    date: '2026-07-23',
    changes: [
      'Correction : les rappels de travail ne se doublonnent plus (l\'ancienne notification restait parfois à côté de la nouvelle).',
      'Le calendrier de "Mon planning" affiche maintenant, en touchant un jour, tout le monde qui travaille ce jour-là, groupé par équipe.',
      'L\'onglet "Planning" est renommé "Saisie", pour bien le distinguer de "Mon planning".',
    ],
  },
  {
    version: '1.1.2',
    date: '2026-07-23',
    changes: ['Ajout de cette page "Nouveautés" pour voir ce qui a changé à chaque mise à jour.'],
  },
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
