import { useEffect, useState, type FormEvent } from "react";
import type { Restaurant } from "@/types/restaurant";
import { createRestaurant, parseTags, updateRestaurant } from "@/lib/restaurants";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface RestaurantFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass a restaurant to edit it, or omit/null to create a new one. */
  restaurant?: Restaurant | null;
  onSaved: (restaurant: Restaurant) => void;
}

interface FormState {
  name: string;
  phone: string;
  whatsapp: string;
  address: string;
  tags: string;
  notes: string;
}

const blankForm: FormState = {
  name: "",
  phone: "",
  whatsapp: "",
  address: "",
  tags: "",
  notes: "",
};

function toFormState(restaurant: Restaurant): FormState {
  return {
    name: restaurant.name,
    phone: restaurant.phone,
    whatsapp: restaurant.whatsapp ?? "",
    address: restaurant.address ?? "",
    tags: restaurant.tags.join(", "),
    notes: restaurant.notes ?? "",
  };
}

export function RestaurantForm({
  open,
  onOpenChange,
  restaurant,
  onSaved,
}: RestaurantFormProps) {
  const [form, setForm] = useState<FormState>(blankForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = Boolean(restaurant);

  useEffect(() => {
    if (open) {
      setForm(restaurant ? toFormState(restaurant) : blankForm);
      setError(null);
    }
  }, [open, restaurant]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.phone.trim()) {
      setError("Name and phone are required.");
      return;
    }

    setSubmitting(true);
    try {
      const input = {
        name: form.name,
        phone: form.phone,
        whatsapp: form.whatsapp,
        address: form.address,
        tags: parseTags(form.tags),
        notes: form.notes,
      };
      const saved =
        isEditing && restaurant
          ? await updateRestaurant(restaurant.id, input)
          : await createRestaurant(input);
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit restaurant" : "Add restaurant"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-4 overflow-y-auto"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              required
              placeholder="+1 555 123 4567"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              type="tel"
              inputMode="tel"
              placeholder="Leave blank if same as phone"
              value={form.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tags">Cuisine / tags</Label>
            <Input
              id="tags"
              placeholder="italian, pizza, delivery"
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
