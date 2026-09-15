import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Restaurant } from "@/types/restaurant";
import type { Coords } from "@/lib/restaurants";
import { createRestaurant, parseTags, updateRestaurant } from "@/lib/restaurants";
import { geocodeAddress } from "@/lib/geocode";
import { deleteAvatar, initials, uploadAvatar } from "@/lib/avatar";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/context/AuthContext";
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
import { CameraIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface RestaurantFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass a restaurant to edit it, or omit/null to create a new one. */
  restaurant?: Restaurant | null;
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
}: RestaurantFormProps) {
  const { user } = useAuth();
  const { groups } = useGroups();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(blankForm);
  const [error, setError] = useState<string | null>(null);
  const [geocodeWarning, setGeocodeWarning] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(restaurant);

  useEffect(() => {
    if (open) {
      setForm(restaurant ? toFormState(restaurant) : blankForm);
      setError(null);
      setGeocodeWarning(false);
      setAvatarFile(null);
      setAvatarRemoved(false);
    }
  }, [open, restaurant]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const saveMutation = useMutation({
    mutationFn: async (): Promise<Restaurant> => {
      const trimmedAddress = form.address.trim();
      const addressChanged =
        !isEditing || (restaurant?.address ?? "") !== trimmedAddress;

      let coords: Coords | null | undefined;
      if (!addressChanged) {
        coords = undefined;
      } else if (!trimmedAddress) {
        coords = null;
      } else {
        try {
          coords = await geocodeAddress(trimmedAddress);
        } catch {
          coords = null;
        }
        if (!coords) setGeocodeWarning(true);
      }

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

      const previousAvatarUrl = restaurant?.avatar_url ?? null;

      if (isEditing && restaurant) {
        let avatarUrl: string | null | undefined;
        if (avatarFile) {
          avatarUrl = await uploadAvatar(user!.id, restaurant.id, avatarFile);
        } else if (avatarRemoved) {
          avatarUrl = null;
        } else {
          avatarUrl = undefined;
        }

        const saved = await updateRestaurant(restaurant.id, input, coords, avatarUrl);

        if ((avatarFile || avatarRemoved) && previousAvatarUrl) {
          await deleteAvatar(previousAvatarUrl);
        }

        return saved;
      }

      const created = await createRestaurant(input, coords, null);
      if (avatarFile) {
        const avatarUrl = await uploadAvatar(user!.id, created.id, avatarFile);
        return updateRestaurant(created.id, input, undefined, avatarUrl);
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.restaurants });
      onOpenChange(false);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Falha ao salvar.");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setGeocodeWarning(false);

    if (!form.name.trim() || !form.phone.trim()) {
      setError("Nome e telefone são obrigatórios.");
      return;
    }

    saveMutation.mutate();
  }

  const currentAvatarSrc = avatarPreviewUrl
    ?? (!avatarRemoved ? restaurant?.avatar_url ?? null : null);
  const hasAvatar = Boolean(avatarFile || (!avatarRemoved && restaurant?.avatar_url));

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
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border bg-muted"
              aria-label="Escolher foto"
              onClick={() => fileInputRef.current?.click()}
            >
              {currentAvatarSrc ? (
                <img
                  src={currentAvatarSrc}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">
                  {initials(form.name || "?")}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/20">
                <CameraIcon className="h-5 w-5 text-white opacity-0 hover:opacity-100" />
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setAvatarFile(file);
                if (file) setAvatarRemoved(false);
              }}
            />
            {hasAvatar && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAvatarFile(null);
                  setAvatarRemoved(true);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                <XMarkIcon className="h-4 w-4" />
                Remover foto
              </Button>
            )}
          </div>

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
            {geocodeWarning && (
              <p className="text-xs text-muted-foreground">
                Endereço não localizado no mapa — o restaurante foi salvo normalmente.
              </p>
            )}
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
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
