import { createContext, useContext } from 'react';

import { MY_NAME } from '@/lib/teams';

type MyNameContextValue = {
  myName: string;
  /** Renomme "ma" ligne partout (réglage, roster, plannings, codes). Peut throw (nom vide / déjà pris). */
  setMyName: (name: string) => Promise<void>;
};

/** Valeur par défaut si consommée hors du Provider (tests, rendu isolé) : le nom historique. */
export const MyNameContext = createContext<MyNameContextValue>({
  myName: MY_NAME,
  setMyName: async () => {},
});

/** Nom de "ma" ligne dans un planning, choisi dans Réglages › Mon nom, avec le setter pour le changer. */
export function useMyName(): MyNameContextValue {
  return useContext(MyNameContext);
}
