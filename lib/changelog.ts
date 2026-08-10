// Historique des versions, écrit à la main en français : source des notes de
// version affichées dans Réglages > Mise à jour (historique des releases) et
// du CHANGELOG.md du dépôt (voir scripts/render-changelog.js). À compléter à
// chaque nouvelle version.

export type ChangelogEntry = {
  version: string;
  date: string;
  changes: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.3.0',
    date: '2026-08-07',
    changes: [
      'Nouveau : bouton "Modifier ce planning" dans "Mon planning", qui ouvre directement la Saisie sur le bon mois et la bonne personne.',
      'Nouveau : le jour actuel est mis en évidence dans "Mon planning" (calendrier et liste).',
      'Nouveau : "Mon planning" s\'ouvre directement sur le mois en cours au lieu du dernier planning créé.',
      'Nouveau : les groupes de postes ont des noms lisibles (Direction, Plonge Matin, Plonge Soir, Chaud, Froid, Chaîne, Boutique) au lieu de codes bruts (E1-E3, D1-D2...).',
      'Nouveau : le détail d\'un jour dans le calendrier affiche une vraie fiche avec badges colorés par poste, au lieu d\'une popup système austère.',
      'Nouveau : la Saisie colore maintenant chaque jour selon le poste affecté, comme dans "Mon planning".',
      'Nouveau : écran "Mise à jour" dans Réglages, avec vérification manuelle, barre de progression et historique des versions — remplace la page "Nouveautés".',
      'Correction : les jours fériés étaient trop voyants dans "Mon planning" et se confondaient avec le jour actuel — bordure allégée.',
      'Correction : l\'ordre des codes de weekend/férié (F1 à F5) dans le détail d\'un jour était aléatoire.',
      'Correction : le calendrier ne défilait pas quand il y avait trop de monde à afficher dans le détail d\'un jour.',
      'Correction : la couleur du jour actuel écrasait la couleur du poste dans le calendrier.',
    ],
  },
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
