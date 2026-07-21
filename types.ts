export type Settings = {
  myName: string;
};

export type TeamGroup = {
  id: string;
  label?: string;
  codes: string[];
};

export type RosterEntry = {
  name: string;
  // Un salarié inactif n'apparaît plus en tête de liste ni comme proposition
  // par défaut dans un nouveau planning, sans perdre ses codes habituels.
  active: boolean;
};

export type ScanRecord = {
  id: string;
  year: number;
  month: number; // 1-12
  createdAt: number;
  days: string[]; // dates ISO (yyyy-mm-dd), une par colonne
  employees: string[]; // noms, un par ligne, dans l'ordre de la photo
  grid: string[][]; // grid[ligne][colonne] = code brut (trim + uppercase)
};
