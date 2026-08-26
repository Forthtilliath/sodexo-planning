export type Settings = {
  // Rappel local la veille de chaque jour travaillé ; absent = désactivé.
  remindersEnabled?: boolean;
  reminderHour?: number; // heure du rappel (0-23) ; absent = 19h par défaut
  // Rappel récurrent incitant à exporter une sauvegarde ; absent = désactivé.
  backupReminderEnabled?: boolean;
  // Thème de l'app ; absent = "system" (suit le thème du téléphone).
  theme?: 'light' | 'dark' | 'system';
  // Suivi de la vérification de mise à jour (voir components/UpdateBanner.tsx).
  lastUpdateCheckAt?: number | null;
  dismissedUpdateVersion?: string | null;
};

export type TeamGroup = {
  id: string;
  label?: string;
  codes: string[];
  color?: string; // couleur hex, pour repérer le type de poste en un coup d'œil
  // Variante week-end/férié d'un autre groupe (même poste, code différent) :
  // ses codes restent proposés normalement, mais elle est masquée de la
  // liste des catégories affectables à un salarié (Réglages > Salariés) —
  // un salarié n'a pas de "catégorie week-end" à part entière.
  weekendVariant?: boolean;
};

export type RosterEntry = {
  name: string;
  // "Archivé" dans l'UI (le champ garde son nom historique) : un salarié
  // inactif n'apparaît plus dans la liste ni comme proposition par défaut
  // dans un nouveau planning, sans perdre ses codes habituels ni son
  // historique dans les plannings déjà enregistrés.
  active: boolean;
  // Ajouté automatiquement à chaque nouveau planning ; absent = régulier
  // (comportement historique). `false` = intérimaire, ajouté seulement à la main.
  regular?: boolean;
  // Id d'un groupe de postes (Réglages > Groupes de postes), pour regrouper
  // visuellement les salariés ; absent = "Sans catégorie".
  groupId?: string;
};

export type CodeSchedule = {
  codes: string[]; // codes de poste concernés (ex: ["C6", "C7", "C8"])
  start: string; // heure de début, format "HH:MM"
  end: string; // heure de fin, format "HH:MM"
};

export type ScanRecord = {
  id: string;
  year: number;
  month: number; // 1-12
  createdAt: number;
  days: string[]; // dates ISO (yyyy-mm-dd), une par colonne
  employees: string[]; // noms, un par ligne, dans l'ordre de la photo
  grid: string[][]; // grid[ligne][colonne] = code brut (trim + uppercase)
  holidays?: string[]; // dates ISO marquées fériées ; absent sur les scans créés avant cet ajout
};
