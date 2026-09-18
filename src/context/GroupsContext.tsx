import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import type { Group, GroupRole } from "@/types/group";
import { useAuth } from "@/context/AuthContext";
import { fetchMyGroups, fetchMyRoles } from "@/lib/groups";
import { queryKeys } from "@/lib/queryKeys";

interface GroupsContextValue {
  groups: Group[];
  loading: boolean;
  /** id → name, for quick lookups when rendering a restaurant's group badge. */
  nameById: Map<string, string>;
  /** group id → my role in that group. */
  roleById: Map<string, GroupRole>;
  /** Whether I may add/edit/delete restaurants of this group. Personal (null) is always editable. */
  canEdit: (groupId: string | null) => boolean;
  refresh: () => Promise<void>;
}

const GroupsContext = createContext<GroupsContextValue | undefined>(undefined);

export function GroupsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const {
    data: groups = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: queryKeys.groups,
    queryFn: fetchMyGroups,
  });

  const { data: rolesData, refetch: refetchRoles } = useQuery({
    queryKey: [...queryKeys.myRoles, user?.id],
    queryFn: () => fetchMyRoles(user!.id),
    enabled: !!user,
  });
  const roleById = useMemo(
    () => rolesData ?? new Map<string, GroupRole>(),
    [rolesData]
  );

  const nameById = useMemo(
    () => new Map(groups.map((g) => [g.id, g.name])),
    [groups]
  );

  const value = useMemo(
    () => ({
      groups,
      loading: isLoading,
      nameById,
      roleById,
      canEdit: (groupId: string | null) => {
        if (groupId === null) return true;
        const role = roleById.get(groupId);
        return role === "owner" || role === "editor";
      },
      refresh: async () => {
        await Promise.all([refetch(), refetchRoles()]);
      },
    }),
    [groups, isLoading, nameById, roleById, refetch, refetchRoles]
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
