/** Strip everything except digits (drops +, spaces, dashes, parens, etc). */
export function digitsOnly(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

/** `tel:` links accept `+`; strip whitespace/formatting but keep a leading +. */
export function telHref(phone: string): string {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = digitsOnly(trimmed);
  return `tel:${hasPlus ? "+" : ""}${digits}`;
}

/**
 * wa.me links require the full number with country code, digits only —
 * no leading +, no spaces/dashes.
 */
export function whatsappHref(number: string): string {
  return `https://wa.me/${digitsOnly(number)}`;
}
