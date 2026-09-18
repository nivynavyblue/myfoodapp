import { useState } from "react";
import type { Restaurant } from "@/types/restaurant";
import { telHref, whatsappHref } from "@/lib/phone";
import { isSafeHttpUrl } from "@/lib/url";
import { initials } from "@/lib/avatar";
import {
  hasAnyHours,
  isOpenNow,
  summarizeHours,
  todayHours,
} from "@/lib/hours";
import { useGroups } from "@/context/GroupsContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  ClipboardIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  GlobeAltIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

interface RestaurantCardProps {
  restaurant: Restaurant;
  onEdit: (restaurant: Restaurant) => void;
  onDelete: (restaurant: Restaurant) => void;
}

export function RestaurantCard({
  restaurant,
  onEdit,
  onDelete,
}: RestaurantCardProps) {
  const { nameById, canEdit } = useGroups();
  const editable = canEdit(restaurant.group_id);
  const [copied, setCopied] = useState(false);
  // WhatsApp number falls back to the phone number when left blank
  // (per the form's "leave blank if same as phone" hint).
  const whatsappNumber = restaurant.whatsapp || restaurant.phone;
  const groupName = restaurant.group_id
    ? nameById.get(restaurant.group_id)
    : null;
  // Belt-and-suspenders: normalizeUrl() already rejects non-http(s) schemes
  // on write, but re-check on render too — a row could have been written
  // directly via the API/SQL, bypassing the app's own validation.
  const safeWebsite = isSafeHttpUrl(restaurant.website)
    ? restaurant.website
    : null;

  const hasHours = hasAnyHours(restaurant.opening_hours);
  const openNow = hasHours && isOpenNow(restaurant.opening_hours);
  const today = todayHours(restaurant.opening_hours);

  async function copyPhone() {
    if (!restaurant.phone) return;
    try {
      await navigator.clipboard.writeText(restaurant.phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can fail without permission/HTTPS — silently ignore,
      // the number is still visible and copyable by hand.
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-3">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border bg-muted">
              {restaurant.avatar_url ? (
                <img
                  src={restaurant.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                  {initials(restaurant.name)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold">
                {restaurant.name}
              </h2>
              {restaurant.address && (
                <p className="mt-0.5 flex items-start gap-1 text-sm text-muted-foreground">
                  <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{restaurant.address}</span>
                </p>
              )}
            </div>
          </div>
          {editable && (
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Editar ${restaurant.name}`}
                onClick={() => onEdit(restaurant)}
              >
                <PencilIcon className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Excluir ${restaurant.name}`}
                onClick={() => onDelete(restaurant)}
              >
                <TrashIcon className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        {(groupName || restaurant.tags.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {groupName && (
              <Badge variant="outline" className="gap-1">
                <UserGroupIcon className="h-3 w-3" />
                {groupName}
              </Badge>
            )}
            {restaurant.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        )}

        {restaurant.notes && (
          <p className="text-sm text-muted-foreground">{restaurant.notes}</p>
        )}

        {hasHours && (
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={openNow ? "default" : "outline"}
                className="gap-1"
              >
                <ClockIcon className="h-3 w-3" />
                {openNow ? "Aberto agora" : "Fechado"}
              </Badge>
              <span className="text-muted-foreground">
                {today ? `Hoje ${today.open}–${today.close}` : "Hoje fechado"}
              </span>
            </div>
            <details className="text-muted-foreground">
              <summary className="cursor-pointer select-none">
                Ver horários
              </summary>
              <ul className="mt-1">
                {summarizeHours(restaurant.opening_hours).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </details>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {safeWebsite && (
            <Button asChild size="lg" className="flex-[2] min-w-[10rem]">
              <a
                href={safeWebsite}
                target="_blank"
                rel="noreferrer"
                aria-label={`Site de ${restaurant.name}`}
              >
                <GlobeAltIcon className="h-5 w-5" />
                Site
              </a>
            </Button>
          )}

          {restaurant.phone && (
            <Button asChild variant="secondary" className="flex-1 min-w-[8rem]">
              <a
                href={telHref(restaurant.phone)}
                aria-label={`Ligar para ${restaurant.name}`}
              >
                <PhoneIcon className="h-5 w-5" />
                Ligar
              </a>
            </Button>
          )}

          {whatsappNumber && (
            <Button asChild variant="secondary" className="flex-1 min-w-[8rem]">
              <a
                href={whatsappHref(whatsappNumber)}
                target="_blank"
                rel="noreferrer"
                aria-label={`WhatsApp de ${restaurant.name}`}
              >
                <ChatBubbleLeftRightIcon className="h-5 w-5" />
                WhatsApp
              </a>
            </Button>
          )}

          {restaurant.phone && (
            <Button
              variant="outline"
              size="icon"
              aria-label={`Copiar telefone de ${restaurant.name}`}
              onClick={copyPhone}
            >
              {copied ? (
                <ClipboardDocumentCheckIcon className="h-5 w-5" />
              ) : (
                <ClipboardIcon className="h-5 w-5" />
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
