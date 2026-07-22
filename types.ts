export type Settings = {
  myName: string;
  // Rappel local la veille de chaque jour travaillé ; absent = désactivé.
  remindersEnabled?: boolean;
  reminderHour?: number; // heure du rappel (0-23) ; absent = 19h par défaut
};

export type TeamGroup = {
  id: string;
  label?: string;
  codes: string[];
  color?: string; // couleur hex, pour repérer le type de poste en un coup d'œil
};

export type RosterEntry = {
  name: string;
  // Un salarié inactif n'apparaît plus en tête de liste ni comme proposition
  // par défaut dans un nouveau planning, sans perdre ses codes habituels.
  active: boolean;
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
