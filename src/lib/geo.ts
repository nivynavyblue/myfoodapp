import type { Restaurant } from "@/types/restaurant";

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export interface RestaurantCluster {
  restaurants: Restaurant[];
  center: LatLng;
  /** First restaurant's address in the cluster, used as a display label. */
  label: string;
}

interface MutableCluster {
  restaurants: Restaurant[];
  center: LatLng;
}

/**
 * Greedily groups restaurants with coordinates into clusters where every
 * member is within `radiusKm` of the cluster's (recomputed) centroid.
 * Order-dependent but adequate at personal-list scale (tens of restaurants).
 * Restaurants without lat/lng go into `unlocated` untouched.
 */
export function clusterByProximity(
  restaurants: Restaurant[],
  radiusKm: number
): { clusters: RestaurantCluster[]; unlocated: Restaurant[] } {
  const located = restaurants.filter(
    (r): r is Restaurant & { lat: number; lng: number } =>
      r.lat != null && r.lng != null
  );
  const unlocated = restaurants.filter((r) => r.lat == null || r.lng == null);

  const clusters: MutableCluster[] = [];

  for (const restaurant of located) {
    const point: LatLng = { lat: restaurant.lat, lng: restaurant.lng };
    const cluster = clusters.find((c) => haversineKm(c.center, point) <= radiusKm);

    if (cluster) {
      cluster.restaurants.push(restaurant);
      const n = cluster.restaurants.length;
      cluster.center = {
        lat: cluster.center.lat + (point.lat - cluster.center.lat) / n,
        lng: cluster.center.lng + (point.lng - cluster.center.lng) / n,
      };
    } else {
      clusters.push({ restaurants: [restaurant], center: point });
    }
  }

  return {
    clusters: clusters.map((c) => ({
      restaurants: c.restaurants,
      center: c.center,
      label: c.restaurants[0].address ?? "",
    })),
    unlocated,
  };
}
