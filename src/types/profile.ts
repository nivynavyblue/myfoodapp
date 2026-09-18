export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

/** Best label for a user: chosen name, else the email prefix, else "?". */
export function profileLabel(p: Pick<Profile, "email" | "display_name"> | undefined): string {
  if (!p) return "?";
  return p.display_name?.trim() || p.email.split("@")[0] || "?";
}
