import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Coords } from "@qiraa/core";

export interface SavedLocation extends Coords {
  /** City label from reverse geocoding; null when it couldn't be resolved. */
  label: string | null;
}

type LocationStatus = "idle" | "locating" | "denied" | "unavailable";

interface LocationState {
  location: SavedLocation | null;
  status: LocationStatus;
  /** Asks the browser for the position (prompts the user the first time). */
  locate: () => Promise<void>;
}

async function reverseGeocode({ lat, lng }: Coords): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
      { headers: { "Accept-Language": document.documentElement.lang || "en" } },
    );
    if (!res.ok) return null;
    const { address = {} } = (await res.json()) as {
      address?: Record<string, string>;
    };
    const city =
      address.city ??
      address.town ??
      address.village ??
      address.county ??
      address.state;
    return [city, address.country].filter(Boolean).join(", ") || null;
  } catch {
    return null;
  }
}

/**
 * The user's location for prayer times. Persisted, so prayer times work
 * offline and never re-prompt; refreshed only when the user asks or when
 * permission was already granted.
 */
export const useLocation = create<LocationState>()(
  persist(
    (set, get) => ({
      location: null,
      status: "idle",
      locate: () =>
        new Promise<void>((resolve) => {
          if (!("geolocation" in navigator)) {
            set({ status: "unavailable" });
            return resolve();
          }
          set({ status: "locating" });
          navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
              const next = { lat: coords.latitude, lng: coords.longitude };
              const previous = get().location;
              const moved =
                !previous ||
                Math.abs(previous.lat - next.lat) > 0.05 ||
                Math.abs(previous.lng - next.lng) > 0.05;
              set({
                location: { ...next, label: moved ? null : previous.label },
                status: "idle",
              });
              if (moved || !previous?.label) {
                const label = await reverseGeocode(next);
                if (label)
                  set((s) => ({
                    location: s.location && { ...s.location, label },
                  }));
              }
              resolve();
            },
            (error) => {
              set({
                status:
                  error.code === error.PERMISSION_DENIED
                    ? "denied"
                    : "unavailable",
              });
              resolve();
            },
            {
              enableHighAccuracy: false,
              timeout: 15000,
              maximumAge: 10 * 60 * 1000,
            },
          );
        }),
    }),
    { name: "qiraa-location", partialize: ({ location }) => ({ location }) },
  ),
);

/** Refreshes the location silently if the user already granted permission. */
export async function refreshLocationIfGranted() {
  try {
    const permission = await navigator.permissions?.query({
      name: "geolocation",
    });
    if (permission?.state === "granted") await useLocation.getState().locate();
  } catch {
    // Permissions API unavailable (older Safari): keep the saved location.
  }
}
