import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import type { Group } from "@/types/group";
import { fetchMyGroups } from "@/lib/groups";
import { queryKeys } from "@/lib/queryKeys";

interface GroupsContextValue {
  groups: Group[];
  loading: boolean;
  /** id → name, for quick lookups when rendering a restaurant's group badge. */
  nameById: Map<string, string>;
  refresh: () => Promise<void>;
}

const GroupsContext = createContext<GroupsContextValue | undefined>(undefined);

export function GroupsProvider({ children }: { children: ReactNode }) {
  const {
    data: groups = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: queryKeys.groups,
    queryFn: fetchMyGroups,
  });

  const nameById = useMemo(
    () => new Map(groups.map((g) => [g.id, g.name])),
    [groups]
  );

  const value = useMemo(
    () => ({
      groups,
      loading: isLoading,
      nameById,
      refresh: async () => {
        await refetch();
      },
    }),
    [groups, isLoading, nameById, refetch]
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
