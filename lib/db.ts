import type { CodeSchedule, RosterEntry, ScanRecord, Settings, TeamGroup } from "@/types";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
	settings: "@rn-planning/settings",
	teamGroups: "@rn-planning/teamGroups",
	scans: "@rn-planning/scans",
	roster: "@rn-planning/roster",
	codeOptions: "@rn-planning/codeOptions",
	codeSchedules: "@rn-planning/codeSchedules",
};

const DEFAULT_SETTINGS: Settings = { myName: "" };

const DEFAULT_TEAM_GROUPS: TeamGroup[] = [
	// Couleur "chef" pour l'encadrement.
	{ id: "e1-e3", label: "E1-E3", codes: ["E1", "E2", "E3"], color: "#c9a227" },
	// Plonge du matin (violet clair, distinct du vert de la chaîne et du rouge) / plonge du soir.
	{ id: "d1-d2", label: "D1-D2", codes: ["D1", "D2"], color: "#ab47bc" },
	{ id: "d3-d4", label: "D3-D4", codes: ["D3", "D4"], color: "#5e35b1" },
	// Chaud / froid.
	{ id: "c2-C3", label: "C2-C3", codes: ["C2", "C3"], color: "#e53935" },
	{ id: "c4-c5", label: "C4-C5", codes: ["C4", "C5"], color: "#1e88e5" },
	// Self, chaîne, allotissement.
	{ id: "c6-c8", label: "C6-C8", codes: ["C6", "C7", "C8"], color: "#43a047" },
	// F1-F3 comme C6-C8, F4-F5 comme D1-D2.
	{ id: "f1-f3", label: "F1-F3", codes: ["F1", "F2", "F3"], color: "#43a047" },
	{ id: "f4-f5", label: "F4-F5", codes: ["F4", "F5"], color: "#ab47bc" },
	// Bleu foncé, distinct du bleu plus clair de C4-C5.
	{ id: "b1", label: "B1", codes: ["B1"], color: "#0d47a1" },
];

const DEFAULT_CODE_SCHEDULES: CodeSchedule[] = [
	{ codes: ["E1"], start: "08:00", end: "16:24" },
	{ codes: ["E2"], start: "08:30", end: "16:54" },
	{ codes: ["E3"], start: "08:00", end: "16:07" },
	{ codes: ["C2"], start: "06:45", end: "14:45" },
	{ codes: ["C3"], start: "07:00", end: "15:00" },
	{ codes: ["C4"], start: "06:45", end: "14:45" },
	{ codes: ["C5"], start: "08:00", end: "16:00" },
	{ codes: ["C6", "C7", "C8"], start: "09:00", end: "17:00" },
	{ codes: ["D1"], start: "08:00", end: "15:00" },
	{ codes: ["D2"], start: "09:00", end: "16:00" },
	{ codes: ["D3", "D4"], start: "13:30", end: "21:00" },
	{ codes: ["B1"], start: "08:00", end: "16:17" },
	{ codes: ["F1", "F2", "F3"], start: "06:45", end: "17:26" },
	{ codes: ["F4", "F5"], start: "09:19", end: "20:00" },
];

// Filet de sécurité : si le stockage est vide (réinstallation, mise à jour
// incompatible...), on retrouve au moins la liste des noms sans tout retaper.
// Ne s'applique jamais si une liste a déjà été sauvegardée, même vide.
const DEFAULT_ROSTER: RosterEntry[] = [
	"BICE Cécilia",
	"MARTIN Nicolas",
	"CLAIR Benjamin",
	"Patoch",
	"Luka",
	"Yacoub",
	"Baptiste",
	"Marie",
	"Thibert",
	"Lucie",
	"Lydia",
	"Yannick",
	"Mario",
	"Philippe",
	"Quentin",
	"Benjamin",
	"Lorina",
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

/** Horodatage de la dernière vérification de mise à jour (voir components/UpdateBanner.tsx). */
export async function recordUpdateCheck(lastCheckedAt: number): Promise<void> {
	const settings = await getSettings();
	await saveSettings({ ...settings, lastUpdateCheckAt: lastCheckedAt });
}

/** Mémorise la version fermée par l'utilisateur, pour ne pas la re-proposer tant qu'il n'y en a pas de plus récente. */
export async function dismissUpdateVersion(version: string): Promise<void> {
	const settings = await getSettings();
	await saveSettings({ ...settings, dismissedUpdateVersion: version });
}

export async function getTeamGroups(): Promise<TeamGroup[]> {
	const raw = await AsyncStorage.getItem(KEYS.teamGroups);
	if (!raw) return DEFAULT_TEAM_GROUPS;
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return DEFAULT_TEAM_GROUPS;
		// Les groupes ne sont plus modifiables dans l'app : la couleur définie
		// dans le code prime toujours sur celle éventuellement déjà enregistrée
		// (ex: après un ajustement de palette), par id de groupe.
		return (parsed as TeamGroup[]).map((g) => {
			const withDefaultColor = DEFAULT_TEAM_GROUPS.find((d) => d.id === g.id);
			return withDefaultColor?.color ? { ...g, color: withDefaultColor.color } : g;
		});
	} catch {
		return DEFAULT_TEAM_GROUPS;
	}
}

export function saveTeamGroups(groups: TeamGroup[]): Promise<void> {
	return writeJson(KEYS.teamGroups, groups);
}

/** Liste des salariés, gérée dans Réglages et réutilisée à chaque planning. */
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

/** Codes habituels par salarié (ex: "BICE CECILIA" -> ["E2"]), pour proposer des boutons rapides à la saisie. */
export async function getEmployeeCodeOptions(): Promise<Record<string, string[]>> {
	const options = await readJson(KEYS.codeOptions, {} as Record<string, string[]>);
	const sorted: Record<string, string[]> = {};
	for (const name of Object.keys(options)) {
		sorted[name] = [...options[name]].sort();
	}
	return sorted;
}

export function saveEmployeeCodeOptions(options: Record<string, string[]>): Promise<void> {
	return writeJson(KEYS.codeOptions, options);
}

/** Horaires (début/fin) par code de poste, pour les afficher et générer des évènements .ics avec heure. */
export function getCodeSchedules(): Promise<CodeSchedule[]> {
	return readJson(KEYS.codeSchedules, DEFAULT_CODE_SCHEDULES);
}

export function saveCodeSchedules(schedules: CodeSchedule[]): Promise<void> {
	return writeJson(KEYS.codeSchedules, schedules);
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

export type BackupData = {
	version: 1;
	exportedAt: number;
	settings: Settings;
	teamGroups: TeamGroup[];
	roster: RosterEntry[];
	codeOptions: Record<string, string[]>;
	codeSchedules?: CodeSchedule[]; // absent sur les sauvegardes créées avant cet ajout
	scans: ScanRecord[];
};

/** Regroupe toutes les données de l'app pour l'export/partage (survivre à une réinstallation ou un changement de version). */
export async function exportAllData(): Promise<BackupData> {
	const [settings, teamGroups, roster, codeOptions, codeSchedules, scans] = await Promise.all([
		getSettings(),
		getTeamGroups(),
		getEmployeeRoster(),
		getEmployeeCodeOptions(),
		getCodeSchedules(),
		getScans(),
	]);
	return { version: 1, exportedAt: Date.now(), settings, teamGroups, roster, codeOptions, codeSchedules, scans };
}

/** Écrase toutes les données locales avec celles d'une sauvegarde importée. */
export async function importAllData(data: BackupData): Promise<void> {
	await Promise.all([
		saveSettings(data.settings),
		saveTeamGroups(data.teamGroups),
		saveEmployeeRoster(data.roster),
		saveEmployeeCodeOptions(data.codeOptions),
		...(data.codeSchedules ? [saveCodeSchedules(data.codeSchedules)] : []),
		writeJson(KEYS.scans, data.scans),
	]);
}
