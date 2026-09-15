import { useEffect, useState, type FormEvent } from "react";
import type { Restaurant } from "@/types/restaurant";
import { createRestaurant, parseTags, updateRestaurant } from "@/lib/restaurants";
import { useGroups } from "@/context/GroupsContext";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  website: string;
  groupId: string | null;
}

const blankForm: FormState = {
  name: "",
  phone: "",
  whatsapp: "",
  address: "",
  tags: "",
  notes: "",
  website: "",
  groupId: null,
};

function toFormState(restaurant: Restaurant): FormState {
  return {
    name: restaurant.name,
    phone: restaurant.phone,
    whatsapp: restaurant.whatsapp ?? "",
    address: restaurant.address ?? "",
    tags: restaurant.tags.join(", "),
    notes: restaurant.notes ?? "",
    website: restaurant.website ?? "",
    groupId: restaurant.group_id,
  };
}

const PERSONAL_VALUE = "__personal__";

export function RestaurantForm({
  open,
  onOpenChange,
  restaurant,
  onSaved,
}: RestaurantFormProps) {
  const { groups } = useGroups();
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
      setError("Nome e telefone são obrigatórios.");
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
        website: form.website,
        group_id: form.groupId,
      };
      const saved =
        isEditing && restaurant
          ? await updateRestaurant(restaurant.id, input)
          : await createRestaurant(input);
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar restaurante" : "Adicionar restaurante"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-4 overflow-y-auto"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Telefone *</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              required
              placeholder="+55 11 91234 5678"
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
              placeholder="Deixe em branco se for igual ao telefone"
              value={form.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="website">Site / pedir online</Label>
            <Input
              id="website"
              type="url"
              inputMode="url"
              placeholder="cardapio.exemplo.com"
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tags">Cozinha / tags</Label>
            <Input
              id="tags"
              placeholder="italiana, pizza, delivery"
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Separadas por vírgula.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          {groups.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="group">Compartilhar com</Label>
              <Select
                value={form.groupId ?? PERSONAL_VALUE}
                onValueChange={(value) =>
                  set("groupId", value === PERSONAL_VALUE ? null : value)
                }
              >
                <SelectTrigger id="group">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PERSONAL_VALUE}>Pessoal</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
