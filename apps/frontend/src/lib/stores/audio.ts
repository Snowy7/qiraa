import { useSyncExternalStore } from "react";
import { create } from "zustand";
import {
  CHAPTERS,
  fetchChapterRecitation,
  getChapter,
  getReciter,
  parseVerseKey,
  timingIndexAt,
  toVerseKey,
  wordAt,
  wordAudioUrl,
  type ChapterRecitation,
} from "@qiraa/core";
import { queryClient } from "@/lib/query-client";
import { usePreferences } from "@/lib/stores/preferences";

export type RepeatMode = "off" | "verse" | "surah";
export type PlaybackStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "error";

export const recitationQuery = (reciterId: number, chapter: number) => ({
  queryKey: ["recitation", reciterId, chapter] as const,
  queryFn: ({ signal }: { signal: AbortSignal }) =>
    fetchChapterRecitation(reciterId, chapter, signal),
  staleTime: Infinity,
});

/** "ayah" stops after the ayah; "continuous" keeps reciting (into the next surah). */
export type PlaybackScope = "ayah" | "continuous";

interface PlayOptions {
  scope?: PlaybackScope;
  /** Also play the surah's opening (Bismillah) before its first ayah. */
  fromStart?: boolean;
}

interface AudioState {
  status: PlaybackStatus;
  /** The ayah being recited; null when the player is closed. */
  verseKey: string | null;
  repeat: RepeatMode;
  scope: PlaybackScope;
  /** A single-ayah play reached its end; the player offers to continue. */
  finishedAyah: boolean;
  play: (verseKey: string, options?: PlayOptions) => Promise<void>;
  /** After a single ayah: keep reciting from the next one. */
  continueReciting: () => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  stop: () => void;
  setRepeat: (repeat: RepeatMode) => void;
}

/*
 * One <audio> element plays a whole surah. Only coarse state (status and the
 * current ayah) lives in the store; progress and the current word are read
 * from the element by hooks, so time updates never re-render the reader.
 */
const audio = typeof Audio === "undefined" ? null : new Audio();
// CORS mode lets the service worker cache recitations for offline playback.
if (audio) audio.crossOrigin = "anonymous";

/** The surah loaded in the element, with its timings. */
let loaded: {
  reciterId: number;
  chapter: number;
  recitation: ChapterRecitation;
} | null = null;
/** Index of the ayah being recited within `loaded`. */
let currentIndex = 0;

const seconds = (ms: number) => ms / 1000;

async function load(chapter: number) {
  const { reciterId } = usePreferences.getState();
  if (loaded?.reciterId === reciterId && loaded.chapter === chapter) {
    return loaded.recitation;
  }
  const recitation = await queryClient.ensureQueryData(
    recitationQuery(reciterId, chapter),
  );
  loaded = { reciterId, chapter, recitation };
  audio!.src = recitation.url;
  return recitation;
}

export const useAudio = create<AudioState>((set, get) => ({
  status: "idle",
  verseKey: null,
  repeat: "off",
  scope: "continuous",
  finishedAyah: false,

  play: async (verseKey, options) => {
    const ref = parseVerseKey(verseKey);
    if (!audio || !ref) return;
    set({
      verseKey,
      status: "loading",
      scope: options?.scope ?? "continuous",
      finishedAyah: false,
    });
    try {
      const recitation = await load(ref.chapter);
      currentIndex = Math.max(
        0,
        recitation.verses.findIndex((v) => v.verseKey === verseKey),
      );
      audio.currentTime = options?.fromStart
        ? 0
        : seconds(recitation.verses[currentIndex].from);
      audio.playbackRate = usePreferences.getState().playbackRate;
      await audio.play();
      updateMediaSession(verseKey);
    } catch (error) {
      if ((error as Error).name !== "AbortError") set({ status: "error" });
    }
  },

  continueReciting: () => {
    const { verseKey, play } = get();
    const following = loaded?.recitation.verses[currentIndex + 1];
    if (following) void play(following.verseKey);
    else if (verseKey) get().next();
  },

  toggle: () => {
    const { verseKey, finishedAyah, play } = get();
    if (!audio || !verseKey) return;
    // Replaying a finished single ayah starts it again.
    if (finishedAyah) return void play(verseKey, { scope: "ayah" });
    if (audio.paused) audio.play().catch(() => set({ status: "error" }));
    else audio.pause();
  },

  next: () => {
    const { verseKey, play } = get();
    const ref = verseKey ? parseVerseKey(verseKey) : null;
    if (!ref || !loaded) return;
    const following = loaded.recitation.verses[currentIndex + 1];
    if (following) return void play(following.verseKey);
    if (ref.chapter < CHAPTERS.length) {
      void play(toVerseKey(ref.chapter + 1, 1), { fromStart: true });
    }
  },

  previous: () => {
    const { play } = get();
    if (!audio || !loaded) return;
    const start = loaded.recitation.verses[currentIndex].from;
    // Restart the ayah unless we're right at its beginning.
    if (audio.currentTime - seconds(start) > 2 || currentIndex === 0) {
      audio.currentTime = seconds(start);
      return;
    }
    void play(loaded.recitation.verses[currentIndex - 1].verseKey);
  },

  stop: () => {
    audio?.pause();
    audio?.removeAttribute("src");
    loaded = null;
    set({ verseKey: null, status: "idle" });
  },

  setRepeat: (repeat) => set({ repeat }),
}));

/** Tracks the ayah from the playback position and applies repeat / stop. */
function onTimeUpdate() {
  if (!audio || !loaded) return;
  const { verses } = loaded.recitation;
  const ms = audio.currentTime * 1000;
  const { repeat, verseKey } = useAudio.getState();
  const current = verses[currentIndex];

  if (current && ms >= current.to) {
    if (repeat === "verse") {
      audio.currentTime = seconds(current.from);
      return;
    }
    if (useAudio.getState().scope === "ayah") {
      audio.pause();
      audio.currentTime = seconds(current.from);
      useAudio.setState({ finishedAyah: true });
      return;
    }
  }

  const index = timingIndexAt(verses, ms);
  if (index !== currentIndex || verses[index].verseKey !== verseKey) {
    currentIndex = index;
    useAudio.setState({ verseKey: verses[index].verseKey });
  }
}

if (audio) {
  audio.addEventListener("timeupdate", onTimeUpdate);
  audio.addEventListener("playing", () =>
    useAudio.setState({ status: "playing" }),
  );
  audio.addEventListener("waiting", () =>
    useAudio.setState({ status: "loading" }),
  );
  audio.addEventListener("pause", () => {
    if (useAudio.getState().verseKey) useAudio.setState({ status: "paused" });
  });
  audio.addEventListener("error", () => {
    if (audio.getAttribute("src")) useAudio.setState({ status: "error" });
  });
  audio.addEventListener("ended", () => {
    const { repeat, verseKey, play } = useAudio.getState();
    const ref = verseKey ? parseVerseKey(verseKey) : null;
    if (!ref) return;
    if (repeat === "surah") {
      return void play(toVerseKey(ref.chapter, 1), { fromStart: true });
    }
    if (
      useAudio.getState().scope === "continuous" &&
      ref.chapter < CHAPTERS.length
    ) {
      return void play(toVerseKey(ref.chapter + 1, 1), { fromStart: true });
    }
    useAudio.setState({ status: "paused" });
  });

  usePreferences.subscribe((prefs, previous) => {
    if (prefs.playbackRate !== previous.playbackRate) {
      audio.playbackRate = prefs.playbackRate;
    }
    const { verseKey, status, play } = useAudio.getState();
    if (prefs.reciterId !== previous.reciterId && verseKey) {
      loaded = null;
      if (status === "playing") void play(verseKey);
    }
  });
}

/** Lock-screen / headset controls on phones and desktops. */
function updateMediaSession(verseKey: string) {
  if (!("mediaSession" in navigator)) return;
  const ref = parseVerseKey(verseKey);
  const chapter = ref ? getChapter(ref.chapter) : undefined;
  const { language, reciterId } = usePreferences.getState();
  navigator.mediaSession.metadata = new MediaMetadata({
    title: chapter
      ? language === "ar"
        ? chapter.nameArabic
        : chapter.nameSimple
      : verseKey,
    artist: getReciter(reciterId).name[language],
    album: "Qiraa",
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

/** Surah playback position in seconds; only progress UI should use it. */
export function useAudioTime(): { current: number; duration: number } {
  const current = useSyncExternalStore(
    subscribeToTime,
    () => audio?.currentTime ?? 0,
  );
  const duration = useSyncExternalStore(subscribeToTime, () =>
    audio && Number.isFinite(audio.duration) ? audio.duration : 0,
  );
  return { current, duration };
}

export function seekTo(fraction: number) {
  if (audio && audio.duration > 0) {
    audio.currentTime = fraction * audio.duration;
  }
}

/** True only for the ayah currently being recited (cheap per-verse selector). */
export function useIsReciting(verseKey: string): boolean {
  return useAudio((s) => s.verseKey === verseKey && s.status !== "idle");
}

/**
 * Highlights the word being recited by toggling a class on elements tagged
 * `data-word="2:255:3"`. Done in the DOM so word changes (several a second)
 * never re-render React components. Returns a cleanup function.
 */
export function startWordHighlighting(): () => void {
  if (!audio) return () => {};
  let active: string | null = null;
  const update = () => {
    const verse = loaded?.recitation.verses[currentIndex];
    const position =
      verse && !audio.paused ? wordAt(verse, audio.currentTime * 1000) : null;
    const key = verse && position ? `${verse.verseKey}:${position}` : null;
    if (key === active) return;
    document
      .querySelectorAll(".is-reciting-word")
      .forEach((el) => el.classList.remove("is-reciting-word"));
    if (key) {
      document
        .querySelectorAll(`[data-word="${key}"]`)
        .forEach((el) => el.classList.add("is-reciting-word"));
    }
    active = key;
  };
  audio.addEventListener("timeupdate", update);
  audio.addEventListener("pause", update);
  return () => {
    audio.removeEventListener("timeupdate", update);
    audio.removeEventListener("pause", update);
  };
}

/*
 * Word pronunciation uses its own element so tapping a word never disturbs a
 * recitation that's loaded (it pauses it, and the user can resume).
 */
const wordAudio = typeof Audio === "undefined" ? null : new Audio();
if (wordAudio) wordAudio.crossOrigin = "anonymous";

/** Plays one word's pronunciation (pausing any recitation first). */
export function playWord(verseKey: string, position: number) {
  if (!wordAudio) return;
  if (audio && !audio.paused) audio.pause();
  wordAudio.src = wordAudioUrl(verseKey, position);
  wordAudio.play().catch(() => {});
}
