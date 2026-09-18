import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { queryKeys } from "@/lib/queryKeys";
import { fetchMyProfile, updateMyProfile } from "@/lib/profile";
import { deleteUserAvatar, uploadUserAvatar } from "@/lib/avatar";
import { profileLabel } from "@/types/profile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/UserAvatar";
import { CameraIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => fetchMyProfile(user!.id),
    enabled: !!user,
  });

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && profile) {
      setName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setAvatarFile(null);
      setAvatarRemoved(false);
      setError(null);
    }
  }, [open, profile]);

  useEffect(() => {
    if (!avatarFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !profile) return;
      let avatarUrl = profile.avatar_url;
      if (avatarFile) {
        avatarUrl = await uploadUserAvatar(user.id, avatarFile);
      } else if (avatarRemoved) {
        avatarUrl = null;
      }
      await updateMyProfile(user.id, {
        display_name: name.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
      });
      if (profile.avatar_url && profile.avatar_url !== avatarUrl) {
        await deleteUserAvatar(profile.avatar_url);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      await queryClient.invalidateQueries({ queryKey: ["groupMembers"] });
      await queryClient.invalidateQueries({ queryKey: ["groupActivity"] });
      onOpenChange(false);
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Falha ao salvar perfil."),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    saveMutation.mutate();
  }

  const shownName = name.trim() || (profile ? profileLabel(profile) : "?");
  const avatarSrc = previewUrl ?? (avatarRemoved ? null : profile?.avatar_url ?? null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Meu perfil</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative shrink-0"
              aria-label="Escolher foto"
              onClick={() => fileInputRef.current?.click()}
            >
              <UserAvatar name={shownName} url={avatarSrc} className="h-16 w-16" />
              <span className="absolute -bottom-1 -right-1 rounded-full border bg-background p-1">
                <CameraIcon className="h-4 w-4" />
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setAvatarFile(file);
                if (file) setAvatarRemoved(false);
              }}
            />
            {avatarSrc && (
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
            <Label htmlFor="profile-email">Email</Label>
            <Input id="profile-email" value={profile?.email ?? ""} disabled readOnly />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-name">Nome</Label>
            <Input
              id="profile-name"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-bio">Sobre você</Label>
            <Textarea
              id="profile-bio"
              rows={3}
              maxLength={280}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" size="lg" disabled={saveMutation.isPending || !profile}>
            {saveMutation.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
