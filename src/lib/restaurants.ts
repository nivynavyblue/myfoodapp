import { supabase } from "./supabaseClient";
import type { Restaurant, RestaurantInput } from "@/types/restaurant";
import { normalizeUrl } from "./url";

/** Turns a comma-separated tags string into a clean string[]. */
export function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function toRow(input: RestaurantInput) {
  return {
    name: input.name.trim(),
    phone: input.phone.trim(),
    whatsapp: input.whatsapp.trim() || null,
    address: input.address.trim() || null,
    tags: input.tags,
    notes: input.notes.trim() || null,
    website: input.website.trim() ? normalizeUrl(input.website) : null,
    group_id: input.group_id,
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
  input: RestaurantInput
): Promise<Restaurant> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data, error } = await supabase
    .from("restaurants")
    .insert({ ...toRow(input), user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Restaurant;
}

export async function updateRestaurant(
  id: string,
  input: RestaurantInput
): Promise<Restaurant> {
  const { data, error } = await supabase
    .from("restaurants")
    .update(toRow(input))
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
