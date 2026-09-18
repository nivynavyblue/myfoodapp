import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Restaurant } from "@/types/restaurant";
import { deleteRestaurant, fetchRestaurants } from "@/lib/restaurants";
import { clusterByProximity } from "@/lib/geo";
import { hasAnyHours, isOpenNow } from "@/lib/hours";
import { queryKeys } from "@/lib/queryKeys";
import { useGroups } from "@/context/GroupsContext";
import { RestaurantCard } from "@/components/RestaurantCard";
import { RestaurantForm } from "@/components/RestaurantForm";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MagnifyingGlassIcon, MapIcon, PlusIcon } from "@heroicons/react/24/outline";

const ALL_VALUE = "__all__";
const PRIVATE_VALUE = "__private__";
const OPEN_VALUE = "open";
const CLOSED_VALUE = "closed";

const RADIUS_OPTIONS = [
  { value: "0.5", label: "500 m" },
  { value: "1", label: "1 km" },
  { value: "2", label: "2 km" },
  { value: "5", label: "5 km" },
];

export function RestaurantList() {
  const queryClient = useQueryClient();
  const { groups } = useGroups();

  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState(ALL_VALUE);
  const [openFilter, setOpenFilter] = useState(ALL_VALUE);
  const [view, setView] = useState<"list" | "region">("list");
  const [radiusKm, setRadiusKm] = useState("1");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Restaurant | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Restaurant | null>(null);

  const {
    data: restaurants = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.restaurants,
    queryFn: fetchRestaurants,
  });
  const error = queryError instanceof Error ? queryError.message : null;

  const deleteMutation = useMutation({
    mutationFn: deleteRestaurant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.restaurants });
      setDeleteTarget(null);
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return restaurants.filter((r) => {
      const matchesQuery =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.tags.some((tag) => tag.toLowerCase().includes(q));
      const matchesGroup =
        groupFilter === ALL_VALUE
          ? true
          : groupFilter === PRIVATE_VALUE
            ? r.group_id === null
            : r.group_id === groupFilter;
      // Restaurants without hours are neither open nor closed: hidden by both filters.
      const matchesOpen =
        openFilter === ALL_VALUE
          ? true
          : hasAnyHours(r.opening_hours) &&
            isOpenNow(r.opening_hours) === (openFilter === OPEN_VALUE);
      return matchesQuery && matchesGroup && matchesOpen;
    });
  }, [restaurants, query, groupFilter, openFilter]);

  const { clusters, unlocated } = useMemo(
    () => clusterByProximity(filtered, parseFloat(radiusKm)),
    [filtered, radiusKm]
  );

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(restaurant: Restaurant) {
    setEditing(restaurant);
    setFormOpen(true);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-14 z-20 -mx-4 flex flex-col gap-2 bg-background/95 px-4 py-2 backdrop-blur">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou tag…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
              aria-label="Buscar restaurantes"
            />
          </div>

          {groups.length > 0 && (
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-auto min-w-[8rem]" aria-label="Filtrar por grupo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Todos</SelectItem>
                <SelectItem value={PRIVATE_VALUE}>Pessoal</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={openFilter} onValueChange={setOpenFilter}>
            <SelectTrigger className="w-auto min-w-[8rem]" aria-label="Filtrar por horário">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Qualquer horário</SelectItem>
              <SelectItem value={OPEN_VALUE}>Abertos agora</SelectItem>
              <SelectItem value={CLOSED_VALUE}>Fechados</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={view === "region" ? "default" : "outline"}
            size="icon"
            aria-label={view === "region" ? "Ver como lista" : "Ver por região"}
            aria-pressed={view === "region"}
            onClick={() => setView((v) => (v === "list" ? "region" : "list"))}
          >
            <MapIcon className="h-5 w-5" />
          </Button>
        </div>

        {view === "region" && (
          <Select value={radiusKm} onValueChange={setRadiusKm}>
            <SelectTrigger className="w-auto min-w-[7rem]" aria-label="Raio de agrupamento">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RADIUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
      ) : view === "list" ? (
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
      ) : (
        <div className="flex flex-col gap-6">
          {clusters.map((cluster, i) => (
            <div key={i} className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                {cluster.restaurants.length}{" "}
                {cluster.restaurants.length === 1 ? "restaurante" : "restaurantes"}
                {cluster.label ? ` perto de ${cluster.label}` : ""}
              </h3>
              {cluster.restaurants.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          ))}

          {unlocated.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Sem localização
              </h3>
              {unlocated.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          )}
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
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir restaurante?"
        description={`Isso vai remover "${deleteTarget?.name ?? ""}" permanentemente. Essa ação não pode ser desfeita.`}
        confirmLabel={deleteMutation.isPending ? "Excluindo…" : "Excluir"}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
