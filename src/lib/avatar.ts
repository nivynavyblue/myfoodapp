import { supabase } from "./supabaseClient";

const BUCKET = "restaurant-avatars";
const USER_BUCKET = "user-avatars";

export async function uploadAvatar(
  userId: string,
  restaurantId: string,
  file: File
): Promise<string> {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `${userId}/${restaurantId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
  });
  if (error) throw error;

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function uploadUserAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(USER_BUCKET).upload(path, file, {
    upsert: true,
  });
  if (error) throw error;

  return supabase.storage.from(USER_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Best-effort cleanup — failing to delete an orphaned object isn't worth surfacing to the user. */
export async function deleteAvatar(url: string): Promise<void> {
  return removeFromBucket(BUCKET, url);
}

export async function deleteUserAvatar(url: string): Promise<void> {
  return removeFromBucket(USER_BUCKET, url);
}

async function removeFromBucket(bucket: string, url: string): Promise<void> {
  try {
    const marker = `/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    const path = url.slice(idx + marker.length);
    await supabase.storage.from(bucket).remove([path]);
  } catch {
    // ignore — non-critical cleanup
  }
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
