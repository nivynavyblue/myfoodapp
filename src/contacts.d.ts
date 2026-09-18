// Contact Picker API (Chrome on Android). Not yet in lib.dom.
interface ContactAddress {
  addressLine?: string[];
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}

interface ContactInfo {
  name?: string[];
  tel?: string[];
  email?: string[];
  address?: ContactAddress[];
}

interface ContactsManager {
  select(
    properties: ("name" | "tel" | "email" | "address")[],
    options?: { multiple?: boolean },
  ): Promise<ContactInfo[]>;
}

interface Navigator {
  contacts?: ContactsManager;
}
