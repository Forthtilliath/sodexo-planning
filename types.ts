export type Settings = {
  myName: string;
};

export type TeamGroup = {
  id: string;
  label?: string;
  codes: string[];
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
