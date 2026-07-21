import type { RosterEntry, ScanRecord, Settings, TeamGroup } from "@/types";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
	settings: "@rn-planning/settings",
	teamGroups: "@rn-planning/teamGroups",
	scans: "@rn-planning/scans",
	roster: "@rn-planning/roster",
	codeOptions: "@rn-planning/codeOptions",
};

const DEFAULT_SETTINGS: Settings = { myName: "" };

const DEFAULT_TEAM_GROUPS: TeamGroup[] = [
	{ id: "e1-e3", label: "E1-E3", codes: ["E1", "E2", "E3"] },
	{ id: "d1-d2", label: "D1-D2", codes: ["D1", "D2"] },
	{ id: "d3-d4", label: "D3-D4", codes: ["D3", "D4"] },
	{ id: "c2-C3", label: "C2-C3", codes: ["C2", "C3"] },
	{ id: "c4-c5", label: "C4-C5", codes: ["C4", "C5"] },
	{ id: "c6-c8", label: "C6-C8", codes: ["C6", "C7", "C8"] },
	{ id: "f1-f3", label: "F1-F3", codes: ["F1", "F2", "F3"] },
	{ id: "f4-f5", label: "F4-F5", codes: ["F4", "F5"] },
	{ id: "b1", label: "B1", codes: ["B1"] },
];

// Filet de sécurité : si le stockage est vide (réinstallation, mise à jour
// incompatible...), on retrouve au moins la liste des noms sans tout retaper.
// Ne s'applique jamais si une liste a déjà été sauvegardée, même vide.
const DEFAULT_ROSTER: RosterEntry[] = [
	"DURAND Claire",
	"PETIT Hugo",
	"LEROY Paul",
	"Camille",
	"Nolan",
	"Sofia",
	"Mathis",
	"Emma",
	"Lucas",
	"Jade",
	"Inès",
	"Ethan",
	"Léo",
	"Chloé",
	"Louis",
	"Manon",
	"Zoé",
].map((name) => ({ name, active: true }));

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

/** Liste des salariés, gérée dans Réglages et réutilisée à chaque saisie (photo, OCR ou manuelle). */
export async function getEmployeeRoster(): Promise<RosterEntry[]> {
	const raw = await AsyncStorage.getItem(KEYS.roster);
	if (!raw) return DEFAULT_ROSTER;
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return DEFAULT_ROSTER;
		// Ancien format = string[] (avant l'ajout du statut actif/inactif) : on
		// migre à la volée pour ne rien perdre des listes déjà enregistrées.
		return parsed.map((item): RosterEntry =>
			typeof item === "string"
				? { name: item, active: true }
				: { name: String(item?.name ?? ""), active: item?.active !== false },
		);
	} catch {
		return DEFAULT_ROSTER;
	}
}

export function saveEmployeeRoster(entries: RosterEntry[]): Promise<void> {
	return writeJson(KEYS.roster, entries);
}

/** Codes habituels par salarié (ex: "DURAND CLAIRE" -> ["E2"]), pour proposer des boutons rapides à la saisie. */
export function getEmployeeCodeOptions(): Promise<Record<string, string[]>> {
	return readJson(KEYS.codeOptions, {});
}

export function saveEmployeeCodeOptions(options: Record<string, string[]>): Promise<void> {
	return writeJson(KEYS.codeOptions, options);
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
		scans.filter((s) => s.id !== id),
	);
}

export async function getScanById(id: string): Promise<ScanRecord | undefined> {
	const scans = await getScans();
	return scans.find((s) => s.id === id);
}

export type BackupData = {
	version: 1;
	exportedAt: number;
	settings: Settings;
	teamGroups: TeamGroup[];
	roster: RosterEntry[];
	codeOptions: Record<string, string[]>;
	scans: ScanRecord[];
};

/** Regroupe toutes les données de l'app pour l'export/partage (survivre à une réinstallation ou un changement de version). */
export async function exportAllData(): Promise<BackupData> {
	const [settings, teamGroups, roster, codeOptions, scans] = await Promise.all([
		getSettings(),
		getTeamGroups(),
		getEmployeeRoster(),
		getEmployeeCodeOptions(),
		getScans(),
	]);
	return { version: 1, exportedAt: Date.now(), settings, teamGroups, roster, codeOptions, scans };
}

/** Écrase toutes les données locales avec celles d'une sauvegarde importée. */
export async function importAllData(data: BackupData): Promise<void> {
	await Promise.all([
		saveSettings(data.settings),
		saveTeamGroups(data.teamGroups),
		saveEmployeeRoster(data.roster),
		saveEmployeeCodeOptions(data.codeOptions),
		writeJson(KEYS.scans, data.scans),
	]);
}
