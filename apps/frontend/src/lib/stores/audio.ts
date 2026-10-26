import { useSyncExternalStore } from "react";
import { create } from "zustand";
import {
  getChapter,
  getReciter,
  parseVerseKey,
  toVerseKey,
  verseAudioUrl,
} from "@noor/core";
import { usePreferences } from "@/lib/stores/preferences";

export type RepeatMode = "off" | "verse" | "surah";
export type PlaybackStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "error";

interface AudioState {
  status: PlaybackStatus;
  /** The ayah being recited; null when the player is closed. */
  verseKey: string | null;
  repeat: RepeatMode;
  play: (verseKey: string) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  stop: () => void;
  setRepeat: (repeat: RepeatMode) => void;
}

/*
 * One <audio> element for the whole app. Only coarse state (status, ayah)
 * lives in the store; playback progress is read straight from the element
 * by useAudioProgress, so time updates never re-render the reader.
 */
const audio = typeof Audio === "undefined" ? null : new Audio();
// CORS mode lets the service worker cache recitations for offline playback.
if (audio) audio.crossOrigin = "anonymous";
let preloader: HTMLAudioElement | null = null;

function urlFor(verseKey: string) {
  return verseAudioUrl(
    getReciter(usePreferences.getState().reciterId),
    verseKey,
  );
}

/** The next ayah in the same surah, or null at the end. */
function followingVerse(verseKey: string): string | null {
  const ref = parseVerseKey(verseKey);
  if (!ref) return null;
  const total = getChapter(ref.chapter)?.versesCount ?? 0;
  return ref.verse < total ? toVerseKey(ref.chapter, ref.verse + 1) : null;
}

export const useAudio = create<AudioState>((set, get) => ({
  status: "idle",
  verseKey: null,
  repeat: "off",

  play: (verseKey) => {
    if (!audio) return;
    set({ verseKey, status: "loading" });
    audio.src = urlFor(verseKey);
    audio.playbackRate = usePreferences.getState().playbackRate;
    audio.play().catch(() => set({ status: "error" }));
    updateMediaSession(verseKey);

    // Warm the next ayah so playback flows without a gap.
    const upcoming = followingVerse(verseKey);
    if (upcoming) {
      preloader ??= Object.assign(new Audio(), { crossOrigin: "anonymous" });
      preloader.preload = "auto";
      preloader.src = urlFor(upcoming);
    }
  },

  toggle: () => {
    if (!audio || !get().verseKey) return;
    if (audio.paused) audio.play().catch(() => set({ status: "error" }));
    else audio.pause();
  },

  next: () => {
    const { verseKey, repeat } = get();
    if (!verseKey) return;
    const upcoming = followingVerse(verseKey);
    if (upcoming) return get().play(upcoming);
    const ref = parseVerseKey(verseKey);
    if (repeat === "surah" && ref)
      return get().play(toVerseKey(ref.chapter, 1));
    audio?.pause();
  },

  previous: () => {
    const { verseKey } = get();
    if (!audio || !verseKey) return;
    const ref = parseVerseKey(verseKey);
    if (audio.currentTime > 3 || !ref || ref.verse === 1) {
      audio.currentTime = 0;
      return;
    }
    get().play(toVerseKey(ref.chapter, ref.verse - 1));
  },

  stop: () => {
    audio?.pause();
    audio?.removeAttribute("src");
    set({ verseKey: null, status: "idle" });
  },

  setRepeat: (repeat) => set({ repeat }),
}));

if (audio) {
  audio.addEventListener("playing", () =>
    useAudio.setState({ status: "playing" }),
  );
  audio.addEventListener("pause", () => {
    if (useAudio.getState().verseKey) useAudio.setState({ status: "paused" });
  });
  audio.addEventListener("waiting", () =>
    useAudio.setState({ status: "loading" }),
  );
  audio.addEventListener("error", () => {
    if (audio.getAttribute("src")) useAudio.setState({ status: "error" });
  });
  audio.addEventListener("ended", () => {
    const { repeat, verseKey, play, next } = useAudio.getState();
    if (!verseKey) return;
    if (repeat === "verse") return play(verseKey);
    if (repeat === "surah" || usePreferences.getState().autoPlayNext)
      return next();
    useAudio.setState({ status: "paused" });
  });

  usePreferences.subscribe((prefs, previous) => {
    if (prefs.playbackRate !== previous.playbackRate)
      audio.playbackRate = prefs.playbackRate;
    const { verseKey, status, play } = useAudio.getState();
    if (
      prefs.reciterId !== previous.reciterId &&
      verseKey &&
      status === "playing"
    )
      play(verseKey);
  });
}

/** Lock-screen / headset controls on phones and desktops. */
function updateMediaSession(verseKey: string) {
  if (!("mediaSession" in navigator)) return;
  const ref = parseVerseKey(verseKey);
  const chapter = ref ? getChapter(ref.chapter) : undefined;
  const { language, reciterId } = usePreferences.getState();
  const reciter = getReciter(reciterId);
  navigator.mediaSession.metadata = new MediaMetadata({
    title: chapter ? `${chapter.nameSimple} · ${verseKey}` : verseKey,
    artist: reciter.name[language],
    album: "Noor",
    artwork: [
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  });
  const { toggle, next, previous } = useAudio.getState();
  navigator.mediaSession.setActionHandler("play", toggle);
  navigator.mediaSession.setActionHandler("pause", toggle);
  navigator.mediaSession.setActionHandler("nexttrack", next);
  navigator.mediaSession.setActionHandler("previoustrack", previous);
}

function subscribeToTime(notify: () => void) {
  if (!audio) return () => {};
  audio.addEventListener("timeupdate", notify);
  audio.addEventListener("durationchange", notify);
  return () => {
    audio.removeEventListener("timeupdate", notify);
    audio.removeEventListener("durationchange", notify);
  };
}

/** Playback position as a 0–1 fraction; only components that show progress use it. */
export function useAudioProgress(): number {
  return useSyncExternalStore(subscribeToTime, () =>
    audio && audio.duration > 0 ? audio.currentTime / audio.duration : 0,
  );
}

export function seekTo(fraction: number) {
  if (audio && audio.duration > 0)
    audio.currentTime = fraction * audio.duration;
}

/** True only for the ayah currently being recited (cheap per-verse selector). */
export function useIsReciting(verseKey: string): boolean {
  return useAudio((s) => s.verseKey === verseKey && s.status !== "idle");
}
