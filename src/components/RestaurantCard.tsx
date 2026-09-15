import { useState } from "react";
import type { Restaurant } from "@/types/restaurant";
import { telHref, whatsappHref } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  ClipboardIcon,
  ClipboardDocumentCheckIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
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
  const [copied, setCopied] = useState(false);
  // WhatsApp number falls back to the phone number when left blank
  // (per the form's "leave blank if same as phone" hint).
  const whatsappNumber = restaurant.whatsapp || restaurant.phone;

  async function copyPhone() {
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
          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Edit ${restaurant.name}`}
              onClick={() => onEdit(restaurant)}
            >
              <PencilIcon className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Delete ${restaurant.name}`}
              onClick={() => onDelete(restaurant)}
            >
              <TrashIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {restaurant.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {restaurant.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        )}

        {restaurant.notes && (
          <p className="text-sm text-muted-foreground">{restaurant.notes}</p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild size="default" className="flex-1 min-w-[8rem]">
            <a href={telHref(restaurant.phone)} aria-label={`Call ${restaurant.name}`}>
              <PhoneIcon className="h-5 w-5" />
              Call
            </a>
          </Button>

          <Button asChild variant="secondary" className="flex-1 min-w-[8rem]">
            <a
              href={whatsappHref(whatsappNumber)}
              target="_blank"
              rel="noreferrer"
              aria-label={`WhatsApp ${restaurant.name}`}
            >
              <ChatBubbleLeftRightIcon className="h-5 w-5" />
              WhatsApp
            </a>
          </Button>

          <Button
            variant="outline"
            size="icon"
            aria-label={`Copy phone number for ${restaurant.name}`}
            onClick={copyPhone}
          >
            {copied ? (
              <ClipboardDocumentCheckIcon className="h-5 w-5" />
            ) : (
              <ClipboardIcon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
