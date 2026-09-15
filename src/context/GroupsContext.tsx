import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Group } from "@/types/group";
import { fetchMyGroups } from "@/lib/groups";

interface GroupsContextValue {
  groups: Group[];
  loading: boolean;
  /** id → name, for quick lookups when rendering a restaurant's group badge. */
  nameById: Map<string, string>;
  refresh: () => Promise<void>;
}

const GroupsContext = createContext<GroupsContextValue | undefined>(undefined);

export function GroupsProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setGroups(await fetchMyGroups());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const nameById = useMemo(
    () => new Map(groups.map((g) => [g.id, g.name])),
    [groups]
  );

  const value = useMemo(
    () => ({ groups, loading, nameById, refresh }),
    [groups, loading, nameById, refresh]
  );

  return (
    <GroupsContext.Provider value={value}>{children}</GroupsContext.Provider>
  );
}

export function useGroups(): GroupsContextValue {
  const ctx = useContext(GroupsContext);
  if (!ctx) throw new Error("useGroups must be used within GroupsProvider");
  return ctx;
}
