import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useGroups } from "@/context/GroupsContext";
import { queryKeys } from "@/lib/queryKeys";
import type { ActivityEntry, Group, GroupMember } from "@/types/group";
import {
  createGroup,
  deleteGroup,
  fetchGroupActivity,
  fetchGroupMembers,
  joinGroupByCode,
  regenerateJoinCode,
  removeMember,
} from "@/lib/groups";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  ArrowLeftIcon,
  ClipboardIcon,
  ClipboardDocumentCheckIcon,
  TrashIcon,
  ArrowPathIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

interface GroupsScreenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTION_LABEL: Record<ActivityEntry["action"], string> = {
  created: "adicionou",
  updated: "editou",
  deleted: "removeu",
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GroupsScreen({ open, onOpenChange }: GroupsScreenProps) {
  const { user } = useAuth();
  const { groups, loading, refresh } = useGroups();
  const [selected, setSelected] = useState<Group | null>(null);

  useEffect(() => {
    if (!open) setSelected(null);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selected && (
              <Button
                variant="ghost"
                size="icon"
                className="-ml-2 h-9 w-9"
                aria-label="Voltar"
                onClick={() => setSelected(null)}
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
            )}
            {selected ? selected.name : "Grupos"}
          </DialogTitle>
        </DialogHeader>

        {selected ? (
          <GroupDetail
            group={selected}
            isOwner={selected.owner_id === user?.id}
            onGroupChanged={async (updated) => {
              setSelected(updated);
              await refresh();
            }}
            onGroupDeleted={async () => {
              setSelected(null);
              await refresh();
            }}
          />
        ) : (
          <GroupsList
            groups={groups}
            loading={loading}
            currentUserId={user?.id ?? ""}
            onSelect={setSelected}
            onChanged={refresh}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

function GroupsList({
  groups,
  loading,
  currentUserId,
  onSelect,
  onChanged,
}: {
  groups: Group[];
  loading: boolean;
  currentUserId: string;
  onSelect: (g: Group) => void;
  onChanged: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (n: string) => createGroup(n),
    onSuccess: async () => {
      setName("");
      await onChanged();
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Falha ao criar grupo."),
  });

  const joinMutation = useMutation({
    mutationFn: (c: string) => joinGroupByCode(c),
    onSuccess: async () => {
      setCode("");
      await onChanged();
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Código inválido."),
  });

  function handleCreate() {
    if (!name.trim()) return;
    setError(null);
    createMutation.mutate(name.trim());
  }

  function handleJoin() {
    if (!code.trim()) return;
    setError(null);
    joinMutation.mutate(code.trim());
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto">
      <div className="flex flex-col gap-2">
        <Label>Meus grupos</Label>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Você ainda não faz parte de nenhum grupo.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => onSelect(g)}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-3 text-left transition-colors hover:bg-accent"
              >
                <span className="flex items-center gap-2">
                  <UserGroupIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{g.name}</span>
                </span>
                {g.owner_id === currentUserId && <Badge>Dono</Badge>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-group-name">Criar grupo</Label>
        <div className="flex gap-2">
          <Input
            id="new-group-name"
            placeholder="Nome do grupo"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending || !name.trim()}
          >
            {createMutation.isPending ? "Criando…" : "Criar"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="join-code">Entrar em um grupo</Label>
        <div className="flex gap-2">
          <Input
            id="join-code"
            placeholder="Código do convite"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoCapitalize="characters"
          />
          <Button
            variant="secondary"
            onClick={handleJoin}
            disabled={joinMutation.isPending || !code.trim()}
          >
            {joinMutation.isPending ? "Entrando…" : "Entrar"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------

function GroupDetail({
  group,
  isOwner,
  onGroupChanged,
  onGroupDeleted,
}: {
  group: Group;
  isOwner: boolean;
  onGroupChanged: (g: Group) => Promise<void>;
  onGroupDeleted: () => Promise<void>;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [confirm, setConfirm] = useState<
    | { kind: "deleteGroup" }
    | { kind: "leaveGroup" }
    | { kind: "removeMember"; userId: string; email: string }
    | null
  >(null);

  const membersQuery = useQuery({
    queryKey: queryKeys.groupMembers(group.id),
    queryFn: () => fetchGroupMembers(group.id),
  });

  const activityQuery = useQuery({
    queryKey: queryKeys.groupActivity(group.id),
    queryFn: () => fetchGroupActivity(group.id),
  });

  const loadingDetail = membersQuery.isLoading || activityQuery.isLoading;
  const members: GroupMember[] = membersQuery.data ?? [];
  const activity: ActivityEntry[] = activityQuery.data ?? [];

  const regenerateMutation = useMutation({
    mutationFn: () => regenerateJoinCode(group.id),
    onSuccess: (newCode) => onGroupChanged({ ...group, join_code: newCode }),
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Falha ao gerar código."),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: () => deleteGroup(group.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.restaurants });
      await onGroupDeleted();
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Falha ao executar ação."),
  });

  const leaveGroupMutation = useMutation({
    mutationFn: () => removeMember(group.id, user!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.restaurants });
      await onGroupDeleted();
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Falha ao executar ação."),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => removeMember(group.id, userId),
    onSuccess: async () => {
      setConfirm(null);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.groupMembers(group.id),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.restaurants });
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Falha ao executar ação."),
  });

  const busy =
    deleteGroupMutation.isPending ||
    leaveGroupMutation.isPending ||
    removeMemberMutation.isPending;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(group.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — code is still visible on screen to copy by hand.
    }
  }

  function handleConfirm() {
    if (!confirm) return;
    setError(null);
    if (confirm.kind === "deleteGroup") {
      deleteGroupMutation.mutate();
    } else if (confirm.kind === "leaveGroup") {
      leaveGroupMutation.mutate();
    } else if (confirm.kind === "removeMember") {
      removeMemberMutation.mutate(confirm.userId);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto">
      <div className="flex flex-col gap-1.5">
        <Label>Código de convite</Label>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-center text-lg font-semibold tracking-widest">
            {group.join_code}
          </code>
          <Button
            variant="outline"
            size="icon"
            aria-label="Copiar código"
            onClick={copyCode}
          >
            {copied ? (
              <ClipboardDocumentCheckIcon className="h-5 w-5" />
            ) : (
              <ClipboardIcon className="h-5 w-5" />
            )}
          </Button>
          {isOwner && (
            <Button
              variant="outline"
              size="icon"
              aria-label="Gerar novo código"
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending}
            >
              <ArrowPathIcon className="h-5 w-5" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Compartilhe este código para outras pessoas entrarem no grupo.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Membros</Label>
        {loadingDetail ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {members.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{m.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={m.role === "owner" ? "default" : "outline"}>
                    {m.role === "owner" ? "Dono" : "Membro"}
                  </Badge>
                  {isOwner && m.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      aria-label={`Remover ${m.email}`}
                      onClick={() =>
                        setConfirm({
                          kind: "removeMember",
                          userId: m.user_id,
                          email: m.email,
                        })
                      }
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Atividade recente</Label>
        {loadingDetail ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma atividade ainda.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {activity.map((a) => (
              <p key={a.id} className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {a.actor_email}
                </span>{" "}
                {ACTION_LABEL[a.action]}{" "}
                <span className="font-medium text-foreground">
                  {a.restaurant_name}
                </span>{" "}
                · {formatWhen(a.created_at)}
              </p>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="mt-auto flex flex-col gap-2 pt-4">
        {isOwner ? (
          <Button
            variant="destructive"
            onClick={() => setConfirm({ kind: "deleteGroup" })}
          >
            Excluir grupo
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => setConfirm({ kind: "leaveGroup" })}
          >
            Sair do grupo
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={
          confirm?.kind === "deleteGroup"
            ? "Excluir grupo?"
            : confirm?.kind === "leaveGroup"
              ? "Sair do grupo?"
              : "Remover membro?"
        }
        description={
          confirm?.kind === "deleteGroup"
            ? `Isso vai excluir "${group.name}" e desvincular os restaurantes compartilhados (eles voltam a ser pessoais para quem os criou). Essa ação não pode ser desfeita.`
            : confirm?.kind === "leaveGroup"
              ? `Você vai perder acesso aos restaurantes compartilhados de "${group.name}".`
              : `${confirm?.kind === "removeMember" ? confirm.email : ""} vai perder acesso aos restaurantes compartilhados deste grupo.`
        }
        confirmLabel={busy ? "Aguarde…" : "Confirmar"}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
