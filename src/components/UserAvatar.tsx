import { initials } from "@/lib/avatar";
import { isSafeHttpUrl } from "@/lib/url";

interface UserAvatarProps {
  name: string;
  url?: string | null;
  className?: string;
}

export function UserAvatar({ name, url, className = "h-8 w-8" }: UserAvatarProps) {
  return (
    <div
      className={`${className} shrink-0 overflow-hidden rounded-full border bg-muted`}
    >
      {isSafeHttpUrl(url) ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
          {initials(name)}
        </span>
      )}
    </div>
  );
}
