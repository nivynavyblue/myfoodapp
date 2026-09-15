export interface Restaurant {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  whatsapp: string | null;
  address: string | null;
  tags: string[];
  notes: string | null;
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
}

export const emptyRestaurantInput: RestaurantInput = {
  name: "",
  phone: "",
  whatsapp: "",
  address: "",
  tags: [],
  notes: "",
};
