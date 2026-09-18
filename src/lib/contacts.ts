export interface PickedContact {
  name: string;
  phone: string;
  address: string;
}

/** Contact Picker API: Chrome on Android, secure context only. */
export function isContactPickerSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "contacts" in navigator &&
    "ContactsManager" in window
  );
}

function formatAddress(address?: ContactAddress): string {
  if (!address) return "";
  return [
    ...(address.addressLine ?? []),
    address.city,
    address.region,
    address.postalCode,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

/**
 * Opens the native contact picker (the browser asks for permission).
 * Returns null when the user cancels or picks nothing.
 */
export async function pickContact(): Promise<PickedContact | null> {
  if (!navigator.contacts) return null;
  const [contact] = await navigator.contacts.select(["name", "tel", "address"], {
    multiple: false,
  });
  if (!contact) return null;
  return {
    name: contact.name?.[0]?.trim() ?? "",
    phone: contact.tel?.[0]?.trim() ?? "",
    address: formatAddress(contact.address?.[0]),
  };
}
