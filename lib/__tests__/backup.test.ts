import { buildBackupFilename } from '@/lib/backup';

describe('buildBackupFilename', () => {
  it('formate "sodexo-planning-sauvegarde-YYYYMMDDHHMMSS.json"', () => {
    const date = new Date(2026, 6, 22, 9, 38, 0); // 22 juillet 2026, 09:38:00
    expect(buildBackupFilename(date)).toBe('sodexo-planning-sauvegarde-20260722093800.json');
  });

  it('utilise la date courante par défaut', () => {
    expect(buildBackupFilename()).toMatch(/^sodexo-planning-sauvegarde-\d{14}\.json$/);
  });
});
