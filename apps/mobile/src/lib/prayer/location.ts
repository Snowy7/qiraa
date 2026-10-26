import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as Location from "expo-location";
import type { Coords } from "@qiraa/core";
import { persistStorage } from "@/lib/storage";

export interface SavedLocation extends Coords {
  /** City label from reverse geocoding; null when it couldn't be resolved. */
  label: string | null;
}

type LocationStatus = "idle" | "locating" | "denied" | "unavailable";

interface LocationState {
  location: SavedLocation | null;
  status: LocationStatus;
  /** Asks for the position (prompts the first time) and saves it. */
  locate: () => Promise<void>;
}

async function cityLabel(coords: Coords): Promise<string | null> {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lng });
    if (!place) return null;
    return [place.city ?? place.subregion ?? place.region, place.country].filter(Boolean).join(", ") || null;
  } catch {
    return null;
  }
}

/**
 * The user's location for prayer times and the Qibla. Persisted, so both work
 * offline and never re-prompt; refreshed when the user asks or on launch if
 * permission was already granted.
 */
export const usePrayerLocation = create<LocationState>()(
  persist(
    (set, get) => ({
      location: null,
      status: "idle",
      locate: async () => {
        set({ status: "locating" });
        try {
          const permission = await Location.requestForegroundPermissionsAsync();
          if (!permission.granted) {
            set({ status: "denied" });
            return;
          }
          const position =
            (await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 })) ??
            (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
          const next = { lat: position.coords.latitude, lng: position.coords.longitude };
          const previous = get().location;
          const moved =
            !previous || Math.abs(previous.lat - next.lat) > 0.05 || Math.abs(previous.lng - next.lng) > 0.05;
          set({ location: { ...next, label: moved ? null : previous.label }, status: "idle" });
          if (moved || !previous?.label) {
            const label = await cityLabel(next);
            if (label) set((s) => ({ location: s.location && { ...s.location, label } }));
          }
        } catch {
          set({ status: "unavailable" });
        }
      },
    }),
    {
      name: "qiraa-location",
      storage: persistStorage,
      partialize: ({ location }) => ({ location }),
    },
  ),
);

/** Refreshes the location quietly if permission was already granted. */
export async function refreshLocationIfGranted() {
  const permission = await Location.getForegroundPermissionsAsync().catch(() => null);
  if (permission?.granted) await usePrayerLocation.getState().locate();
}
