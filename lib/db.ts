import { MY_NAME, normalizeName } from "@/lib/teams";
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

const DEFAULT_SETTINGS: Settings = {};

const DEFAULT_TEAM_GROUPS: TeamGroup[] = [
	// Couleur "chef" pour l'encadrement.
	{ id: "e1-e3", label: "Direction", codes: ["E1", "E2", "E3"], color: "#c9a227" },
	// Plonge du matin (violet clair, distinct du vert de la chaîne et du rouge) / plonge du soir.
	{ id: "d1-d2", label: "Plonge Matin", codes: ["D1", "D2"], color: "#ab47bc" },
	{ id: "d3-d4", label: "Plonge Soir", codes: ["D3", "D4"], color: "#5e35b1" },
	// Chaud / froid.
	{ id: "c2-C3", label: "Chaud", codes: ["C2", "C3"], color: "#e53935" },
	{ id: "c4-c5", label: "Froid", codes: ["C4", "C5"], color: "#1e88e5" },
	// Self, chaîne, allotissement.
	{ id: "c6-c8", label: "Chaîne", codes: ["C6", "C7", "C8"], color: "#43a047" },
	// Bleu foncé, distinct du bleu plus clair de C4-C5.
	{ id: "b1", label: "Boutique", codes: ["B1"], color: "#0d47a1" },
	// F1-F3 comme C6-C8, F4-F5 comme D1-D2 : même rôle/couleur, mais un code
	// de weekend/férié distinct — préfixé "WE" pour les distinguer de leur
	// équivalent semaine dans l'affichage, et exclus des catégories
	// affectables à un salarié (voir `weekendVariant` sur TeamGroup).
	{ id: "f1-f3", label: "WE Chaîne", codes: ["F1", "F2", "F3"], color: "#43a047", weekendVariant: true },
	{ id: "f4-f5", label: "WE Plonge", codes: ["F4", "F5"], color: "#ab47bc", weekendVariant: true },
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
	MY_NAME,
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

/** Nom de "ma" ligne dans un planning (Réglages › Mon nom) ; "Moi" par défaut. */
export async function getMyName(): Promise<string> {
	const settings = await getSettings();
	return settings.myName?.trim() || MY_NAME;
}

/**
 * Renomme "ma" ligne partout : réglage, entrée du roster, lignes des plannings
 * déjà enregistrés et clés des codes habituels. Refuse un nom vide ou déjà
 * porté par un autre salarié (fusion involontaire).
 */
export async function renameMe(newName: string): Promise<void> {
	const trimmed = newName.trim();
	if (!trimmed) throw new Error("Le nom ne peut pas être vide.");

	const oldName = await getMyName();
	if (normalizeName(trimmed) === normalizeName(oldName)) return;

	const [settings, roster, codeOptions, scans] = await Promise.all([
		getSettings(),
		getEmployeeRoster(),
		getEmployeeCodeOptions(),
		getScans(),
	]);

	if (roster.some((e) => normalizeName(e.name) !== normalizeName(oldName) && normalizeName(e.name) === normalizeName(trimmed))) {
		throw new Error(`"${trimmed}" est déjà un salarié de la liste. Choisis un autre nom.`);
	}

	const nextRoster = roster.map((e) =>
		normalizeName(e.name) === normalizeName(oldName) ? { ...e, name: trimmed } : e
	);

	const nextScans = scans.map((scan) => ({
		...scan,
		employees: scan.employees.map((name) => (normalizeName(name) === normalizeName(oldName) ? trimmed : name)),
	}));

	const nextCodeOptions = { ...codeOptions };
	for (const key of Object.keys(nextCodeOptions)) {
		if (normalizeName(key) === normalizeName(oldName) && key !== trimmed) {
			nextCodeOptions[trimmed] = nextCodeOptions[key];
			delete nextCodeOptions[key];
		}
	}

	await Promise.all([
		saveSettings({ ...settings, myName: trimmed }),
		saveEmployeeRoster(nextRoster),
		saveEmployeeCodeOptions(nextCodeOptions),
		writeJson(KEYS.scans, nextScans),
	]);
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

// Ids des groupes par défaut marqués variante week-end, pour rattraper une
// sauvegarde faite avant l'ajout de `weekendVariant` (ex: WE Chaîne/WE
// Plonge enregistrés tels quels par une simple ouverture de l'écran avant
// cet ajout). Ne complète que les groupes qui n'ont encore aucune valeur —
// un choix explicite (y compris `false`) de l'utilisateur n'est jamais écrasé.
const WEEKEND_VARIANT_DEFAULT_IDS = new Set(DEFAULT_TEAM_GROUPS.filter((g) => g.weekendVariant).map((g) => g.id));

export async function getTeamGroups(): Promise<TeamGroup[]> {
	const groups = await readJson(KEYS.teamGroups, DEFAULT_TEAM_GROUPS);
	return groups.map((g) =>
		g.weekendVariant === undefined && WEEKEND_VARIANT_DEFAULT_IDS.has(g.id) ? { ...g, weekendVariant: true } : g
	);
}

export function saveTeamGroups(groups: TeamGroup[]): Promise<void> {
	return writeJson(KEYS.teamGroups, groups);
}

// "Ma" ligne (nom configurable, "Moi" par défaut — voir getMyName) doit
// toujours pouvoir être choisie comme ligne dans un planning : on la garantit
// en tête du roster, y compris pour une liste enregistrée sans cette entrée.
function ensureMyEntry(entries: RosterEntry[], myName: string): RosterEntry[] {
	if (entries.some((e) => normalizeName(e.name) === normalizeName(myName))) return entries;
	return [{ name: myName, active: true }, ...entries];
}

/** Liste des salariés, gérée dans Réglages et réutilisée à chaque planning. */
export async function getEmployeeRoster(): Promise<RosterEntry[]> {
	const [raw, myName] = await Promise.all([AsyncStorage.getItem(KEYS.roster), getMyName()]);
	if (!raw) return DEFAULT_ROSTER;
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return DEFAULT_ROSTER;
		// Ancien format = string[] (avant l'ajout du statut actif/inactif) : on
		// migre à la volée pour ne rien perdre des listes déjà enregistrées.
		// Le spread préserve les champs ajoutés depuis (regular, groupId...).
		const migrated = parsed.map((item): RosterEntry =>
			typeof item === "string"
				? { name: item, active: true }
				: { ...item, name: String(item?.name ?? ""), active: item?.active !== false },
		);
		return ensureMyEntry(migrated, myName);
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

export async function deleteScan(id: string): Promise<void> {
	const scans = await getScans();
	await writeJson(KEYS.scans, scans.filter((s) => s.id !== id));
}

export type BackupData = {
	version: 1;
	exportedAt: number;
	// Chaque bloc est optionnel : une sauvegarde peut ne contenir qu'une partie
	// des catégories (voir BackupSelection). Les anciennes sauvegardes les ont
	// toutes, sauf codeSchedules ajouté plus tard.
	settings?: Settings;
	teamGroups?: TeamGroup[];
	roster?: RosterEntry[];
	codeOptions?: Record<string, string[]>;
	codeSchedules?: CodeSchedule[];
	scans?: ScanRecord[];
};

/**
 * Catégories qu'on peut inclure/exclure d'une sauvegarde ou d'une restauration
 * (écran Réglages › Sauvegarde). Les horaires des postes (codeSchedules) et les
 * codes habituels par salarié (codeOptions) suivent respectivement `groups` et
 * `employees`.
 */
export type BackupSelection = {
	settings: boolean;
	employees: boolean;
	groups: boolean;
	plannings: boolean;
};

export const FULL_BACKUP_SELECTION: BackupSelection = {
	settings: true,
	employees: true,
	groups: true,
	plannings: true,
};

/** Regroupe les données de l'app pour l'export/partage, en ne gardant que les catégories cochées. */
export async function exportAllData(selection: BackupSelection = FULL_BACKUP_SELECTION): Promise<BackupData> {
	const [settings, teamGroups, roster, codeOptions, codeSchedules, scans] = await Promise.all([
		getSettings(),
		getTeamGroups(),
		getEmployeeRoster(),
		getEmployeeCodeOptions(),
		getCodeSchedules(),
		getScans(),
	]);
	const data: BackupData = { version: 1, exportedAt: Date.now() };
	if (selection.settings) data.settings = settings;
	if (selection.employees) {
		data.roster = roster;
		data.codeOptions = codeOptions;
	}
	if (selection.groups) {
		data.teamGroups = teamGroups;
		data.codeSchedules = codeSchedules;
	}
	if (selection.plannings) data.scans = scans;
	return data;
}

/** Catégories réellement restaurées : cochées dans `selection` ET présentes dans le fichier. */
export function resolveImportedCategories(data: BackupData, selection: BackupSelection): (keyof BackupSelection)[] {
	const restored: (keyof BackupSelection)[] = [];
	if (selection.settings && data.settings) restored.push('settings');
	if (selection.employees && (data.roster || data.codeOptions)) restored.push('employees');
	if (selection.groups && (data.teamGroups || data.codeSchedules)) restored.push('groups');
	if (selection.plannings && data.scans) restored.push('plannings');
	return restored;
}

/**
 * Écrase les données locales avec celles d'une sauvegarde importée, catégorie
 * par catégorie : seules celles cochées dans `selection` et présentes dans le
 * fichier sont remplacées ; les autres ne bougent pas.
 */
export async function importAllData(data: BackupData, selection: BackupSelection = FULL_BACKUP_SELECTION): Promise<void> {
	const tasks: Promise<void>[] = [];
	if (selection.settings && data.settings) tasks.push(saveSettings(data.settings));
	if (selection.employees) {
		if (data.roster) tasks.push(saveEmployeeRoster(data.roster));
		if (data.codeOptions) tasks.push(saveEmployeeCodeOptions(data.codeOptions));
	}
	if (selection.groups) {
		if (data.teamGroups) tasks.push(saveTeamGroups(data.teamGroups));
		if (data.codeSchedules) tasks.push(saveCodeSchedules(data.codeSchedules));
	}
	if (selection.plannings && data.scans) tasks.push(writeJson(KEYS.scans, data.scans));
	await Promise.all(tasks);
}
