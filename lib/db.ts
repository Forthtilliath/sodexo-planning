import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ScanRecord, Settings, TeamGroup } from '@/types';

const KEYS = {
  settings: '@rn-planning/settings',
  teamGroups: '@rn-planning/teamGroups',
  scans: '@rn-planning/scans',
};

const DEFAULT_SETTINGS: Settings = { myName: '' };

const DEFAULT_TEAM_GROUPS: TeamGroup[] = [
  { id: 'd1-d4', label: 'D1-D4', codes: ['D1', 'D2', 'D3', 'D4'] },
  { id: 'c6-c8', label: 'C6-C8', codes: ['C6', 'C7', 'C8'] },
];

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export function getSettings(): Promise<Settings> {
  return readJson(KEYS.settings, DEFAULT_SETTINGS);
}

export function saveSettings(settings: Settings): Promise<void> {
  return writeJson(KEYS.settings, settings);
}

export function getTeamGroups(): Promise<TeamGroup[]> {
  return readJson(KEYS.teamGroups, DEFAULT_TEAM_GROUPS);
}

export function saveTeamGroups(groups: TeamGroup[]): Promise<void> {
  return writeJson(KEYS.teamGroups, groups);
}

export function getScans(): Promise<ScanRecord[]> {
  return readJson(KEYS.scans, []);
}

export async function saveScan(scan: ScanRecord): Promise<void> {
  const scans = await getScans();
  const index = scans.findIndex((s) => s.id === scan.id);
  if (index >= 0) {
    scans[index] = scan;
  } else {
    scans.push(scan);
  }
  scans.sort((a, b) => b.createdAt - a.createdAt);
  await writeJson(KEYS.scans, scans);
}

export async function deleteScan(id: string): Promise<void> {
  const scans = await getScans();
  await writeJson(
    KEYS.scans,
    scans.filter((s) => s.id !== id)
  );
}

export async function getScanById(id: string): Promise<ScanRecord | undefined> {
  const scans = await getScans();
  return scans.find((s) => s.id === id);
}
