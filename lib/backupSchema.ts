import { z } from 'zod';

import type { BackupData } from './db';

// Validation en profondeur d'une sauvegarde importée : chaque entrée est
// vérifiée (types, bornes, formats) avant que quoi que ce soit ne soit
// remplacé. Un fichier corrompu ou modifié à la main est rejeté en entier,
// rien n'est importé. Les clés inconnues sont retirées (z.object les ignore).
// Les bornes sont larges : elles écartent l'absurde (texte géant, heure 99)
// sans refuser de vraies données.

const NAME_MAX = 100;
const CODE_MAX = 50;
const LIST_MAX = 1000;
// Colonnes d'un planning : un mois, avec de la marge.
const DAYS_MAX = 62;

const id = z.string().min(1).max(NAME_MAX);
const name = z.string().max(NAME_MAX);
const code = z.string().max(CODE_MAX);
const codes = z.array(code).max(LIST_MAX);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date AAAA-MM-JJ attendue');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'heure HH:MM attendue');
const timestamp = z.number().int().nonnegative();

const settingsSchema = z.object({
  remindersEnabled: z.boolean().optional(),
  reminderHour: z.number().int().min(0).max(23).optional(),
  backupReminderEnabled: z.boolean().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  myName: name.optional(),
  lastUpdateCheckAt: timestamp.nullable().optional(),
  dismissedUpdateVersion: z.string().max(NAME_MAX).nullable().optional(),
});

const teamGroupSchema = z.object({
  id,
  label: name.optional(),
  codes,
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{3,8}$/, 'couleur hexadécimale attendue')
    .optional(),
  weekendVariant: z.boolean().optional(),
});

const rosterEntrySchema = z.object({
  id: id.optional(),
  name,
  active: z.boolean(),
  regular: z.boolean().optional(),
  groupId: id.optional(),
});

const codeScheduleSchema = z.object({ codes, start: time, end: time });

const scanRecordSchema = z.object({
  id,
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  createdAt: timestamp,
  days: z.array(isoDate).max(DAYS_MAX),
  employees: z.array(name).max(LIST_MAX),
  grid: z.array(z.array(code).max(DAYS_MAX)).max(LIST_MAX),
  holidays: z.array(isoDate).max(DAYS_MAX).optional(),
});

const backupDataSchema = z.object({
  version: z.literal(1),
  exportedAt: timestamp,
  settings: settingsSchema.optional(),
  teamGroups: z.array(teamGroupSchema).max(LIST_MAX).optional(),
  roster: z.array(rosterEntrySchema).max(LIST_MAX).optional(),
  codeOptions: z.record(name, codes).optional(),
  codeSchedules: z.array(codeScheduleSchema).max(LIST_MAX).optional(),
  scans: z.array(scanRecordSchema).max(LIST_MAX).optional(),
});

/**
 * Valide en profondeur une sauvegarde dont la forme générale a déjà été
 * reconnue. Lève une erreur au message affichable (champ + raison) à la
 * première anomalie ; renvoie une copie nettoyée des clés inconnues.
 */
export function validateBackupData(data: unknown): BackupData {
  const result = backupDataSchema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join('.') || 'racine';
    throw new Error(
      `Sauvegarde corrompue (champ "${path}" : ${issue?.message ?? 'invalide'}) : rien n'a été importé.`,
    );
  }
  return result.data;
}
