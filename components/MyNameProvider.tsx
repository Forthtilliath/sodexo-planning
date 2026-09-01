import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { MyNameContext } from '@/hooks/useMyName';
import { getMyName, getSettings, renameMe, subscribeToData } from '@/lib/db';
import { rescheduleWorkReminders } from '@/lib/notifications';
import { MY_NAME } from '@/lib/teams';

/** Charge le nom de "ma" ligne enregistré et le rend disponible (+ modifiable) à toute l'app. */
export default function MyNameProvider({ children }: { children: ReactNode }) {
  const [myName, setMyNameState] = useState<string>(MY_NAME);

  // Rechargé au montage puis à chaque écriture (renommage, restauration d'une
  // sauvegarde...) pour que "mon nom" reste cohérent partout.
  useEffect(() => {
    const pull = () => {
      getMyName()
        .then((name) => setMyNameState((prev) => (prev === name ? prev : name)))
        .catch((err) => console.error('getMyName failed', err));
    };
    pull();
    return subscribeToData(pull);
  }, []);

  const setMyName = useCallback(async (next: string) => {
    await renameMe(next);
    const resolved = await getMyName();
    setMyNameState(resolved);
    // Les rappels ciblent "ma" ligne par son nom : à reprogrammer si actifs.
    const settings = await getSettings();
    if (settings.remindersEnabled) await rescheduleWorkReminders();
  }, []);

  return <MyNameContext.Provider value={{ myName, setMyName }}>{children}</MyNameContext.Provider>;
}
