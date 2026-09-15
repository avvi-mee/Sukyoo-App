import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLinkedSeniors } from '@sukyoo/core';
import { useCurrentUserId } from '../hooks/useCurrentUserId';

const STORAGE_KEY = 'sukyoo.activeSeniorId';

type LinkedSenior = { linkId: string; seniorId: string; name: string };

type ActiveSeniorContextValue = {
  seniors: LinkedSenior[];
  activeSenior: LinkedSenior | undefined;
  setActiveSeniorId: (seniorId: string) => void;
  isLoading: boolean;
};

const ActiveSeniorContext = createContext<ActiveSeniorContextValue>({
  seniors: [],
  activeSenior: undefined,
  setActiveSeniorId: () => {},
  isLoading: true,
});

export function ActiveSeniorProvider({ children }: { children: ReactNode }) {
  const familyMemberId = useCurrentUserId();
  const { data: links, isLoading } = useLinkedSeniors(familyMemberId);
  const [activeSeniorId, setActiveSeniorIdState] = useState<string | null>(null);

  // Persisted so a family member caring for two parents doesn't silently snap
  // back to whichever one happens to sort first every time the app restarts.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) setActiveSeniorIdState(saved);
    });
  }, []);

  const setActiveSeniorId = useCallback((seniorId: string) => {
    setActiveSeniorIdState(seniorId);
    AsyncStorage.setItem(STORAGE_KEY, seniorId);
  }, []);

  const seniors = useMemo<LinkedSenior[]>(
    () => (links ?? []).map((l) => ({ linkId: l.id, seniorId: l.senior_id, name: l.senior?.full_name ?? 'Family member' })),
    [links]
  );

  // Falls back to the first link if the stored id is stale — e.g. that senior
  // unlinked while the app was closed.
  const activeSenior = seniors.find((s) => s.seniorId === activeSeniorId) ?? seniors[0];

  const value = useMemo(
    () => ({ seniors, activeSenior, setActiveSeniorId, isLoading }),
    [seniors, activeSenior, setActiveSeniorId, isLoading]
  );

  return <ActiveSeniorContext.Provider value={value}>{children}</ActiveSeniorContext.Provider>;
}

export function useActiveSenior() {
  return useContext(ActiveSeniorContext);
}
