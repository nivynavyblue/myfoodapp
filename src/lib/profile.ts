import { supabase } from "./supabaseClient";
import type { Profile } from "@/types/profile";

export async function fetchMyProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, avatar_url, bio")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data as Profile;
}

export interface ProfileUpdate {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export async function updateMyProfile(
  userId: string,
  patch: ProfileUpdate
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("id, email, display_name, avatar_url, bio")
    .single();
  if (error) throw error;
  return data as Profile;
}
