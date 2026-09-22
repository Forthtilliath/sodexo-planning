import { computeMonthPlanning } from '@/lib/teams';
import type { CodeSchedule, ScanRecord, TeamGroup } from '@/types';

/** Un évènement d'agenda pour un jour travaillé, indépendant du format de sortie (.ics ou agenda natif). */
export type PlanningEvent = {
  date: string; // yyyy-mm-dd
  title: string;
  description: string;
  // Heures "HH:MM" quand l'horaire du code est connu, sinon journée entière.
  start?: string;
  end?: string;
};

export function nextDay(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Vrai si l'horaire finit le lendemain (ex. 20:00 → 02:00). */
export function endsNextDay(start: string, end: string): boolean {
  return end <= start;
}

/**
 * Évènements du mois pour la ligne `rowIndex` : un par jour avec un code.
 * La description liste les coéquipiers détectés (même groupe de code ce jour-là).
 */
export function buildPlanningEvents(
  scan: ScanRecord,
  groups: TeamGroup[],
  rowIndex: number,
  schedules: CodeSchedule[] = []
): PlanningEvent[] {
  return computeMonthPlanning(scan, rowIndex, groups, schedules)
    .filter((day) => day.code)
    .map((day) => ({
      date: day.date,
      title: day.code,
      description:
        day.teammates.length > 0 ? `Équipe : ${day.teammates.map((t) => `${t.name} (${t.code})`).join(', ')}` : '',
      start: day.schedule?.start,
      end: day.schedule?.end,
    }));
}
