export type Settings = {
  // Rappel local la veille de chaque jour travaillé ; absent = désactivé.
  remindersEnabled?: boolean;
  reminderHour?: number; // heure du rappel (0-23) ; absent = 19h
  // Rappel récurrent incitant à exporter une sauvegarde ; absent = désactivé.
  backupReminderEnabled?: boolean;
  theme?: 'light' | 'dark' | 'system'; // absent = "system"
  myName?: string; // nom de "ma" ligne dans un planning ; absent = "Moi"
  // Suivi de la vérification de mise à jour (voir components/UpdateBanner.tsx).
  lastUpdateCheckAt?: number | null;
  dismissedUpdateVersion?: string | null;
};

export type TeamGroup = {
  id: string;
  label?: string;
  codes: string[];
  color?: string; // couleur hex du type de poste
  // Variante week-end/férié d'un autre groupe (même poste, code différent) :
  // ses codes restent proposés, mais la catégorie est masquée de la liste des
  // catégories affectables à un salarié (Réglages > Salariés).
  weekendVariant?: boolean;
};

export type RosterEntry = {
  // Identité stable, indépendante de la position et du nom (souvent vide ou
  // dupliqué) : clé React/DnD dans Réglages > Salariés. Renseignée à la volée
  // pour les listes enregistrées avant son ajout — voir roster.tsx (ensureIds).
  id?: string;
  name: string;
  // "Archivé" dans l'UI : n'apparaît plus dans la liste ni dans les nouveaux
  // plannings, sans perdre ses codes ni son historique.
  active: boolean;
  // `false` = intérimaire (ajouté à la main) ; absent/true = régulier (ajouté
  // à chaque nouveau planning).
  regular?: boolean;
  groupId?: string; // groupe de postes pour le regroupement ; absent = "Sans catégorie"
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
