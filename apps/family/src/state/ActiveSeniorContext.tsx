import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useLinkedSeniors } from '@sukyoo/core';
import { useCurrentUserId } from '../hooks/useCurrentUserId';

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
  const [activeSeniorId, setActiveSeniorId] = useState<string | null>(null);

  const seniors = useMemo<LinkedSenior[]>(
    () => (links ?? []).map((l) => ({ linkId: l.id, seniorId: l.senior_id, name: l.senior?.full_name ?? 'Family member' })),
    [links]
  );

  const activeSenior = seniors.find((s) => s.seniorId === activeSeniorId) ?? seniors[0];

  const value = useMemo(
    () => ({ seniors, activeSenior, setActiveSeniorId, isLoading }),
    [seniors, activeSenior, isLoading]
  );

  return <ActiveSeniorContext.Provider value={value}>{children}</ActiveSeniorContext.Provider>;
}

export function useActiveSenior() {
  return useContext(ActiveSeniorContext);
}
