export interface Restaurant {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  whatsapp: string | null;
  address: string | null;
  tags: string[];
  notes: string | null;
  /** Ordering site / menu link, e.g. the restaurant's own order-online page. */
  website: string | null;
  /** null = personal restaurant; otherwise shared with this group. */
  group_id: string | null;
  /** Geocoded from `address`; null when ungeocoded/unavailable — always optional. */
  lat: number | null;
  lng: number | null;
  /** Custom-uploaded avatar image URL; null falls back to an initials avatar. */
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/** Shape used when creating/editing — server fills id/user_id/timestamps. */
export interface RestaurantInput {
  name: string;
  phone: string;
  whatsapp: string;
  address: string;
  tags: string[];
  notes: string;
  website: string;
  group_id: string | null;
}

export const emptyRestaurantInput: RestaurantInput = {
  name: "",
  phone: "",
  whatsapp: "",
  address: "",
  tags: [],
  notes: "",
  website: "",
  group_id: null,
};
