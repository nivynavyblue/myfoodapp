import { useEffect, useMemo, useState } from "react";
import type { Restaurant } from "@/types/restaurant";
import { deleteRestaurant, fetchRestaurants } from "@/lib/restaurants";
import { RestaurantCard } from "@/components/RestaurantCard";
import { RestaurantForm } from "@/components/RestaurantForm";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";

export function RestaurantList() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Restaurant | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Restaurant | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRestaurants();
      setRestaurants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return restaurants;
    return restaurants.filter((r) => {
      if (r.name.toLowerCase().includes(q)) return true;
      return r.tags.some((tag) => tag.toLowerCase().includes(q));
    });
  }, [restaurants, query]);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(restaurant: Restaurant) {
    setEditing(restaurant);
    setFormOpen(true);
  }

  function handleSaved(saved: Restaurant) {
    setRestaurants((prev) => {
      const exists = prev.some((r) => r.id === saved.id);
      const next = exists
        ? prev.map((r) => (r.id === saved.id ? saved : r))
        : [...prev, saved];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRestaurant(deleteTarget.id);
      setRestaurants((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-14 z-20 -mx-4 bg-background/95 px-4 py-2 backdrop-blur">
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou tag…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
            aria-label="Buscar restaurantes"
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Carregando…
        </p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {restaurants.length === 0
            ? "Nenhum restaurante ainda. Toque em + para adicionar."
            : "Nenhum resultado."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <Button
        size="icon"
        className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-6 z-30 h-14 w-14 rounded-full shadow-lg"
        aria-label="Adicionar restaurante"
        onClick={openAdd}
      >
        <PlusIcon className="h-7 w-7" />
      </Button>

      <RestaurantForm
        open={formOpen}
        onOpenChange={setFormOpen}
        restaurant={editing}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir restaurante?"
        description={`Isso vai remover "${deleteTarget?.name ?? ""}" permanentemente. Essa ação não pode ser desfeita.`}
        confirmLabel={deleting ? "Excluindo…" : "Excluir"}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
