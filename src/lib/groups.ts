import { supabase } from "./supabaseClient";
import type { ActivityEntry, Group, GroupMember } from "@/types/group";

export async function fetchMyGroups(): Promise<Group[]> {
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Group[];
}

export async function createGroup(name: string): Promise<Group> {
  const { data, error } = await supabase.rpc("create_group", {
    p_name: name,
  });
  if (error) throw error;
  return data as Group;
}

export async function renameGroup(id: string, name: string): Promise<Group> {
  const { data, error } = await supabase
    .from("groups")
    .update({ name: name.trim() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Group;
}

export async function deleteGroup(id: string): Promise<void> {
  const { error } = await supabase.from("groups").delete().eq("id", id);
  if (error) throw error;
}

export async function joinGroupByCode(code: string): Promise<Group> {
  const { data, error } = await supabase.rpc("join_group_by_code", {
    p_code: code,
  });
  if (error) throw error;
  return data as Group;
}

export async function regenerateJoinCode(groupId: string): Promise<string> {
  const { data, error } = await supabase.rpc("regenerate_join_code", {
    p_group_id: groupId,
  });
  if (error) throw error;
  return data as string;
}

/** Maps a set of user ids to their emails via the `profiles` table. */
async function fetchEmails(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", userIds);
  if (error) throw error;
  return new Map((data as { id: string; email: string }[]).map((p) => [p.id, p.email]));
}

export async function fetchGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from("group_members")
    .select("group_id, user_id, role, joined_at")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });
  if (error) throw error;

  const rows = data as Omit<GroupMember, "email">[];
  const emails = await fetchEmails(rows.map((r) => r.user_id));

  return rows.map((r) => ({ ...r, email: emails.get(r.user_id) ?? "?" }));
}

export async function removeMember(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  return removeMember(groupId, userId);
}

export async function fetchGroupActivity(
  groupId: string,
  limit = 50
): Promise<ActivityEntry[]> {
  const { data, error } = await supabase
    .from("restaurant_activity")
    .select("id, restaurant_id, group_id, restaurant_name, action, actor_id, created_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = data as Omit<ActivityEntry, "actor_email">[];
  const emails = await fetchEmails(rows.map((r) => r.actor_id));

  return rows.map((r) => ({ ...r, actor_email: emails.get(r.actor_id) ?? "?" }));
}
