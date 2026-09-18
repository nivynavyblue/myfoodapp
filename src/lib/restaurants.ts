import { supabase } from "./supabaseClient";
import type { Restaurant, RestaurantInput } from "@/types/restaurant";
import { normalizeUrl } from "./url";
import { hasAnyHours } from "./hours";

export interface Coords {
  lat: number;
  lng: number;
}

/** Turns a comma-separated tags string into a clean string[]. */
export function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function toRow(input: RestaurantInput) {
  let website: string | null = null;
  if (input.website.trim()) {
    website = normalizeUrl(input.website);
    if (!website) {
      throw new Error("Site inválido — use um endereço http(s) válido.");
    }
  }

  return {
    name: input.name.trim(),
    phone: input.phone.trim() || null,
    whatsapp: input.whatsapp.trim() || null,
    address: input.address.trim() || null,
    tags: input.tags,
    notes: input.notes.trim() || null,
    website,
    group_id: input.group_id,
    opening_hours: hasAnyHours(input.opening_hours) ? input.opening_hours : null,
  };
}

export async function fetchRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data as Restaurant[];
}

export async function createRestaurant(
  input: RestaurantInput,
  coords?: Coords | null,
  avatarUrl?: string | null
): Promise<Restaurant> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data, error } = await supabase
    .from("restaurants")
    .insert({
      ...toRow(input),
      user_id: user.id,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      avatar_url: avatarUrl ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Restaurant;
}

/**
 * `coords`/`avatarUrl`: omit (undefined) to leave the existing value
 * untouched (e.g. address/avatar didn't change); pass null to clear it,
 * or a value to overwrite it.
 */
export async function updateRestaurant(
  id: string,
  input: RestaurantInput,
  coords?: Coords | null,
  avatarUrl?: string | null
): Promise<Restaurant> {
  const row: Record<string, unknown> = toRow(input);
  if (coords !== undefined) {
    row.lat = coords?.lat ?? null;
    row.lng = coords?.lng ?? null;
  }
  if (avatarUrl !== undefined) {
    row.avatar_url = avatarUrl;
  }

  const { data, error } = await supabase
    .from("restaurants")
    .update(row)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Restaurant;
}

export async function deleteRestaurant(id: string): Promise<void> {
  const { error } = await supabase.from("restaurants").delete().eq("id", id);
  if (error) throw error;
}
