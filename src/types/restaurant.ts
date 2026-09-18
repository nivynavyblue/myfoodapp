/** "HH:MM" 24h. close < open means the range runs past midnight. */
export type DayHours = { open: string; close: string } | null;

/** Keys are weekdays "0" (Sunday) .. "6" (Saturday); missing/null = closed. */
export type OpeningHours = Partial<Record<"0" | "1" | "2" | "3" | "4" | "5" | "6", DayHours>>;

export interface Restaurant {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  tags: string[];
  notes: string | null;
  /** Ordering site / menu link, e.g. the restaurant's own order-online page. */
  website: string | null;
  /** null = personal restaurant; otherwise shared with this group. */
  group_id: string | null;
  /** Custom-uploaded avatar image URL; null falls back to an initials avatar. */
  avatar_url: string | null;
  opening_hours: OpeningHours | null;
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
  opening_hours: OpeningHours;
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
  opening_hours: {},
};
