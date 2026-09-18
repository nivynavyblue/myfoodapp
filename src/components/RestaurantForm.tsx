import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DayHours, OpeningHours, Restaurant } from "@/types/restaurant";
import { DAY_NAMES } from "@/lib/hours";
import { createRestaurant, parseTags, updateRestaurant } from "@/lib/restaurants";
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
import { isContactPickerSupported, pickContact } from "@/lib/contacts";
import { CameraIcon, UserPlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

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
  hours: OpeningHours;
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
  hours: {},
};

function toFormState(restaurant: Restaurant): FormState {
  return {
    name: restaurant.name,
    phone: restaurant.phone ?? "",
    whatsapp: restaurant.whatsapp ?? "",
    address: restaurant.address ?? "",
    tags: restaurant.tags.join(", "),
    notes: restaurant.notes ?? "",
    website: restaurant.website ?? "",
    groupId: restaurant.group_id,
    hours: restaurant.opening_hours ?? {},
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

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(restaurant);

  useEffect(() => {
    if (open) {
      setForm(restaurant ? toFormState(restaurant) : blankForm);
      setError(null);
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

  async function importFromContacts() {
    try {
      const contact = await pickContact();
      if (!contact) return;
      setError(null);
      setForm((prev) => ({
        ...prev,
        name: contact.name || prev.name,
        phone: contact.phone || prev.phone,
        address: contact.address || prev.address,
      }));
    } catch (err) {
      // Picker dismissed by the user is not an error.
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Não foi possível acessar os contatos.");
    }
  }

  function setDay(key: keyof OpeningHours, value: DayHours) {
    setForm((prev) => ({ ...prev, hours: { ...prev.hours, [key]: value } }));
  }

  function copyFirstDayToAll() {
    const first = Object.values(form.hours).find(Boolean);
    if (!first) return;
    const all: OpeningHours = {};
    for (let i = 0; i < 7; i++) all[String(i) as keyof OpeningHours] = { ...first };
    setForm((prev) => ({ ...prev, hours: all }));
  }

  const saveMutation = useMutation({
    mutationFn: async (): Promise<Restaurant> => {
      const input = {
        name: form.name,
        phone: form.phone,
        whatsapp: form.whatsapp,
        address: form.address,
        tags: parseTags(form.tags),
        notes: form.notes,
        website: form.website,
        group_id: form.groupId,
        opening_hours: form.hours,
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

        const saved = await updateRestaurant(restaurant.id, input, avatarUrl);

        if ((avatarFile || avatarRemoved) && previousAvatarUrl) {
          await deleteAvatar(previousAvatarUrl);
        }

        return saved;
      }

      const created = await createRestaurant(input, null);
      if (avatarFile) {
        const avatarUrl = await uploadAvatar(user!.id, created.id, avatarFile);
        return updateRestaurant(created.id, input, avatarUrl);
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

    if (!form.name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }

    if (Object.values(form.hours).some((h) => h && (!h.open || !h.close))) {
      setError("Preencha abertura e fechamento de cada dia aberto.");
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

          {!isEditing && isContactPickerSupported() && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={importFromContacts}
            >
              <UserPlusIcon className="h-4 w-4" />
              Importar dos contatos
            </Button>
          )}

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
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
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

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Horário de funcionamento</legend>
            {DAY_NAMES.map((dayName, i) => {
              const key = String(i) as keyof OpeningHours;
              const day = form.hours[key] ?? null;
              return (
                <div key={key} className="flex items-center gap-2">
                  <label className="flex w-28 shrink-0 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(day)}
                      onChange={(e) =>
                        setDay(key, e.target.checked ? { open: "11:00", close: "22:00" } : null)
                      }
                    />
                    {dayName}
                  </label>
                  {day ? (
                    <>
                      <Input
                        type="time"
                        aria-label={`Abre ${dayName}`}
                        value={day.open}
                        onChange={(e) => setDay(key, { ...day, open: e.target.value })}
                      />
                      <span className="text-sm text-muted-foreground">às</span>
                      <Input
                        type="time"
                        aria-label={`Fecha ${dayName}`}
                        value={day.close}
                        onChange={(e) => setDay(key, { ...day, close: e.target.value })}
                      />
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Fechado</span>
                  )}
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={copyFirstDayToAll}
            >
              Copiar primeiro dia aberto para todos
            </Button>
            <p className="text-xs text-muted-foreground">
              Fechamento após a meia-noite é aceito (ex.: 18:00 às 02:00).
            </p>
          </fieldset>

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
