export interface GeocodeResult {
  lat: number;
  lng: number;
}

/**
 * Free, no-key geocoding via OpenStreetMap's Nominatim. Browsers can't set a
 * custom User-Agent via fetch — the automatic Referer header is what
 * identifies the app, per Nominatim's usage policy for browser clients.
 * Returns null (never throws for "not found") when the address doesn't
 * resolve; network/HTTP errors propagate so the caller decides the UX.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as { lat: string; lon: string }[];
  if (data.length === 0) return null;

  const lat = parseFloat(data[0].lat);
  const lng = parseFloat(data[0].lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return { lat, lng };
}
