import { useCallback, useEffect, useRef, useState } from 'react';

import { subscribeToData } from '@/lib/db';

/**
 * Lit une donnée d'AsyncStorage et la garde à jour : recharge au montage, puis
 * à chaque écriture faite n'importe où dans l'app (voir `subscribeToData` dans
 * lib/db.ts). Remplace le couple `useState` + `useFocusEffect(load)` pour les
 * écrans qui ne font que consulter la donnée.
 *
 * `load` peut changer de référence à chaque rendu (ex: `() => getScans()`), il
 * est lu via une ref ; `initial` doit être stable (constante de module).
 */
export function useDbData<T>(load: () => Promise<T>, initial: T): T {
	const [data, setData] = useState<T>(initial);
	const loadRef = useRef(load);
	loadRef.current = load;
	// Dernier contenu appliqué, sérialisé : évite un re-render quand un
	// rechargement ramène exactement la même donnée (cas le plus fréquent).
	const appliedJsonRef = useRef<string | null>(null);

	useEffect(() => {
		let alive = true;
		const pull = async () => {
			let next: T;
			try {
				next = await loadRef.current();
			} catch (err) {
				console.error('useDbData load failed', err);
				return;
			}
			if (!alive) return;
			const json = JSON.stringify(next);
			if (json === appliedJsonRef.current) return;
			appliedJsonRef.current = json;
			setData(next);
		};
		pull();
		const unsubscribe = subscribeToData(pull);
		return () => {
			alive = false;
			unsubscribe();
		};
	}, []);

	return data;
}

/**
 * Comme `useDbData`, mais pour un écran qui édite aussi la donnée : elle reste
 * modifiable localement (`setValue`) avec enregistrement automatique, tout en
 * se resynchronisant si la donnée change ailleurs.
 *
 * - `load` : lecture (peut appliquer une migration idempotente).
 * - `save` : écriture ; déclenchée dès que `setValue` produit un contenu
 *   différent du dernier connu.
 *
 * Anti-boucle / anti-course : chaque enregistrement incrémente un compteur ; un
 * rechargement dont le compteur a bougé entre-temps est ignoré (une écriture
 * plus récente prime, et un nouveau rechargement suit de toute façon).
 */
export function usePersistedDbState<T>(
	load: () => Promise<T>,
	save: (value: T) => Promise<void>,
	initial: T,
): readonly [T, (updater: T | ((prev: T) => T)) => void, boolean] {
	const [value, setValueRaw] = useState<T>(initial);
	const [loaded, setLoaded] = useState(false);
	const loadRef = useRef(load);
	loadRef.current = load;
	const saveRef = useRef(save);
	saveRef.current = save;
	const syncedJsonRef = useRef<string | null>(null);
	const writeSeqRef = useRef(0);

	const pull = useCallback(async () => {
		const seq = writeSeqRef.current;
		let next: T;
		try {
			next = await loadRef.current();
		} catch (err) {
			console.error('usePersistedDbState load failed', err);
			return;
		}
		// Une écriture locale a eu lieu pendant la lecture : résultat périmé.
		if (seq !== writeSeqRef.current) return;
		const json = JSON.stringify(next);
		if (json !== syncedJsonRef.current) {
			syncedJsonRef.current = json;
			setValueRaw(next);
		}
		setLoaded(true);
	}, []);

	useEffect(() => {
		pull();
		return subscribeToData(pull);
	}, [pull]);

	const setValue = useCallback((updater: T | ((prev: T) => T)) => {
		setValueRaw((prev) => {
			const next = typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
			const json = JSON.stringify(next);
			if (json !== syncedJsonRef.current) {
				syncedJsonRef.current = json;
				writeSeqRef.current += 1;
				saveRef.current(next).catch((err) => console.error('usePersistedDbState save failed', err));
			}
			return next;
		});
	}, []);

	return [value, setValue, loaded] as const;
}
