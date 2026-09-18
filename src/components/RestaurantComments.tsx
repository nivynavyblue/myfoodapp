import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { queryKeys } from "@/lib/queryKeys";
import {
  addComment,
  deleteComment,
  fetchComments,
  setVote,
  sortComments,
} from "@/lib/comments";
import { profileLabel } from "@/types/profile";
import {
  COMMENT_MAX,
  type CommentSort,
  type RestaurantComment,
} from "@/types/comment";
import { UserAvatar } from "@/components/UserAvatar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HandThumbDownIcon, HandThumbUpIcon, TrashIcon } from "@heroicons/react/24/outline";
import {
  HandThumbDownIcon as HandThumbDownSolid,
  HandThumbUpIcon as HandThumbUpSolid,
} from "@heroicons/react/24/solid";

interface RestaurantCommentsProps {
  restaurantId: string;
}

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function RestaurantComments({ restaurantId }: RestaurantCommentsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<CommentSort>("likes");
  const [text, setText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<RestaurantComment | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: comments = [],
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.comments(restaurantId),
    queryFn: () => fetchComments(restaurantId),
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: queryKeys.comments(restaurantId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.commentCounts });
  }

  const onError = (e: unknown) =>
    setActionError(e instanceof Error ? e.message : "Erro inesperado.");

  const addMutation = useMutation({
    mutationFn: (body: string) => addComment(restaurantId, body),
    onSuccess: () => {
      setText("");
      setActionError(null);
      refresh();
    },
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      setDeleteTarget(null);
      setActionError(null);
      refresh();
    },
    onError,
  });

  const voteMutation = useMutation({
    mutationFn: (v: { commentId: string; value: 1 | -1 | null }) =>
      setVote(v.commentId, user!.id, v.value),
    onSuccess: () => {
      setActionError(null);
      refresh();
    },
    onError,
  });

  const trimmedLength = text.trim().length;
  const canSubmit =
    trimmedLength > 0 && text.length <= COMMENT_MAX && !addMutation.isPending;
  const sorted = sortComments(comments, sort);
  const error = queryError instanceof Error ? queryError.message : actionError;

  return (
    <div className="flex flex-col gap-3 border-t pt-3">
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) addMutation.mutate(text);
        }}
      >
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={COMMENT_MAX}
          rows={2}
          className="min-h-[60px]"
          placeholder="Escreva um comentário…"
          aria-label="Novo comentário"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {text.length}/{COMMENT_MAX}
          </span>
          <Button type="submit" size="sm" disabled={!canSubmit}>
            {addMutation.isPending ? "Enviando…" : "Comentar"}
          </Button>
        </div>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
      ) : (
        <>
          <Select value={sort} onValueChange={(v) => setSort(v as CommentSort)}>
            <SelectTrigger className="h-9 w-auto min-w-[10rem] self-start text-sm" aria-label="Ordenar comentários">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="likes">Mais curtidos</SelectItem>
              <SelectItem value="newest">Mais recentes</SelectItem>
              <SelectItem value="oldest">Mais antigos</SelectItem>
            </SelectContent>
          </Select>

          <ul className="flex flex-col gap-2">
            {sorted.map((c) => {
              const mine = c.user_id === user?.id;
              const ups = c.votes.filter((v) => v.value === 1).length;
              const downs = c.votes.filter((v) => v.value === -1).length;
              const myVote = c.votes.find((v) => v.user_id === user?.id)?.value ?? null;
              const name = c.author ? profileLabel(c.author) : "Ex-membro";
              return (
                <li key={c.id} className="flex flex-col gap-1.5 rounded-md border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <UserAvatar name={name} url={c.author?.avatar_url} className="h-6 w-6" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {dateFormat.format(new Date(c.created_at))}
                    </span>
                    {mine && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Excluir comentário"
                        onClick={() => setDeleteTarget(c)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 px-2"
                      disabled={mine || voteMutation.isPending}
                      aria-label="Curtir"
                      aria-pressed={myVote === 1}
                      onClick={() =>
                        voteMutation.mutate({
                          commentId: c.id,
                          value: myVote === 1 ? null : 1,
                        })
                      }
                    >
                      {myVote === 1 ? (
                        <HandThumbUpSolid className="h-4 w-4" />
                      ) : (
                        <HandThumbUpIcon className="h-4 w-4" />
                      )}
                      {ups}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 px-2"
                      disabled={mine || voteMutation.isPending}
                      aria-label="Não curtir"
                      aria-pressed={myVote === -1}
                      onClick={() =>
                        voteMutation.mutate({
                          commentId: c.id,
                          value: myVote === -1 ? null : -1,
                        })
                      }
                    >
                      {myVote === -1 ? (
                        <HandThumbDownSolid className="h-4 w-4" />
                      ) : (
                        <HandThumbDownIcon className="h-4 w-4" />
                      )}
                      {downs}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir comentário?"
        description="Esse comentário e seus votos serão removidos permanentemente."
        confirmLabel={deleteMutation.isPending ? "Excluindo…" : "Excluir"}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}
