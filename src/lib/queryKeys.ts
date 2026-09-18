export const queryKeys = {
  restaurants: ["restaurants"] as const,
  groups: ["groups"] as const,
  myRoles: ["myRoles"] as const,
  profile: ["profile"] as const,
  groupMembers: (groupId: string) => ["groupMembers", groupId] as const,
  groupActivity: (groupId: string) => ["groupActivity", groupId] as const,
};
