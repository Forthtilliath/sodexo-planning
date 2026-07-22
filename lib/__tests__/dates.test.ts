import { dayNumber, mondayFirstWeekday, timestampCompact } from '@/lib/dates';

describe('mondayFirstWeekday', () => {
  it('renvoie 0 pour un lundi et 6 pour un dimanche', () => {
    expect(mondayFirstWeekday('2026-07-20')).toBe(0); // lundi
    expect(mondayFirstWeekday('2026-07-26')).toBe(6); // dimanche
  });

  it('place les autres jours entre les deux', () => {
    expect(mondayFirstWeekday('2026-07-21')).toBe(1); // mardi
    expect(mondayFirstWeekday('2026-07-24')).toBe(4); // vendredi
  });
});

describe('dayNumber', () => {
  it("extrait le quantième du mois depuis une date ISO", () => {
    expect(dayNumber('2026-07-01')).toBe(1);
    expect(dayNumber('2026-07-31')).toBe(31);
  });
});

describe('timestampCompact', () => {
  it('formate en YYYYMMDDHHMMSS sans séparateurs', () => {
    const date = new Date(2026, 6, 22, 9, 8, 5); // 22 juillet 2026, 09:08:05 (heure locale)
    expect(timestampCompact(date)).toBe('20260722090805');
  });

  it('utilise la date courante par défaut', () => {
    const before = timestampCompact();
    expect(before).toMatch(/^\d{14}$/);
  });
});
