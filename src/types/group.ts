export interface Group {
  id: string;
  name: string;
  owner_id: string;
  join_code: string;
  created_at: string;
}

export type GroupRole = "owner" | "editor" | "member";

export interface GroupMember {
  group_id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: GroupRole;
  joined_at: string;
}

export type ActivityAction = "created" | "updated" | "deleted";

export interface ActivityEntry {
  id: string;
  restaurant_id: string;
  group_id: string;
  restaurant_name: string;
  action: ActivityAction;
  actor_id: string;
  actor_name: string;
  created_at: string;
}
