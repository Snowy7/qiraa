import { useSyncExternalStore } from "react";
import { createAudioPlayer, setAudioModeAsync, type AudioStatus } from "expo-audio";
import { Asset } from "expo-asset";
import { create } from "zustand";
import {
  CHAPTERS,
  getChapter,
  getReciter,
  parseVerseKey,
  timingIndexAt,
  toVerseKey,
  wordAt,
  wordAudioUrl,
  type ChapterRecitation,
} from "@qiraa/core";
import { currentLocale } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";
import { queryClient } from "@/lib/query-client";
import { localRecitation, recitationQuery } from "./recitations";

export type RepeatMode = "off" | "verse" | "surah";
export type PlaybackStatus = "idle" | "loading" | "playing" | "paused" | "error";
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
  /** The word being recited (`chapter:verse:position`), while playing. */
  word: string | null;
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
 * One player plays a whole surah from a single file, so playback is gapless.
 * Only coarse state (status, ayah, word) lives in the store; progress is read
 * from the player by `useAudioTime`, so time updates never re-render readers.
 */
const player = createAudioPlayer(null, { updateInterval: 100, keepAudioSessionActive: true });
// Word pronunciations get their own player so a tap never disturbs the recitation.
const wordPlayer = createAudioPlayer(null);

setAudioModeAsync({
  playsInSilentMode: true,
  shouldPlayInBackground: true,
  // Lock-screen and headset controls need exclusive audio.
  interruptionMode: "doNotMix",
}).catch(() => {});

/** The surah loaded in the player, with its timings. */
let loaded: { reciterId: number; chapter: number; recitation: ChapterRecitation } | null = null;
/** Index of the ayah being recited within `loaded`. */
let currentIndex = 0;
/** Bumped by every play() and stop(), so a slow load can't override a newer request. */
let request = 0;

/** Last reported position and length (seconds), for `useAudioTime`. */
let position = 0;
let duration = 0;
const timeListeners = new Set<() => void>();

const seconds = (ms: number) => ms / 1000;

/** Resolves once the player has the new source ready to seek and play. */
function whenLoaded(): Promise<void> {
  if (player.isLoaded) return Promise.resolve();
  return new Promise((resolve) => {
    const subscription = player.addListener("playbackStatusUpdate", (status) => {
      if (status.isLoaded) {
        subscription.remove();
        resolve();
      }
    });
  });
}

/** Loads a surah into the player; null if a newer request took over meanwhile. */
async function load(chapter: number, id: number) {
  const { reciterId } = usePreferences.getState();
  if (loaded?.reciterId === reciterId && loaded.chapter === chapter) return loaded.recitation;
  // Silence the previous surah so it can't move the selection meanwhile.
  loaded = null;
  player.pause();
  const recitation = await queryClient.ensureQueryData(recitationQuery(reciterId, chapter));
  if (id !== request) return null;
  player.replace({ uri: localRecitation(reciterId, chapter) ?? recitation.url });
  await whenLoaded();
  if (id !== request) return null;
  loaded = { reciterId, chapter, recitation };
  return recitation;
}

export const useAudio = create<AudioState>((set, get) => ({
  status: "idle",
  verseKey: null,
  word: null,
  repeat: "off",
  scope: "continuous",
  finishedAyah: false,

  play: async (verseKey, options) => {
    const ref = parseVerseKey(verseKey);
    if (!ref) return;
    const id = ++request;
    wordPlayer.pause();
    set({ verseKey, status: "loading", scope: options?.scope ?? "continuous", finishedAyah: false });
    try {
      const recitation = await load(ref.chapter, id);
      if (!recitation) return;
      currentIndex = Math.max(
        0,
        recitation.verses.findIndex((v) => v.verseKey === verseKey),
      );
      await player.seekTo(options?.fromStart ? 0 : seconds(recitation.verses[currentIndex].from));
      player.setPlaybackRate(usePreferences.getState().playbackRate);
      player.play();
      showOnLockScreen(verseKey);
    } catch {
      if (id === request) set({ status: "error" });
    }
  },

  continueReciting: () => {
    const { verseKey, play } = get();
    const following = loaded?.recitation.verses[currentIndex + 1];
    if (following) void play(following.verseKey);
    else if (verseKey) get().next();
  },

  toggle: () => {
    const { verseKey, finishedAyah, scope, play } = get();
    if (!verseKey) return;
    // A finished single ayah starts again; so does an ayah whose reciter changed.
    if (finishedAyah || !loaded) return void play(verseKey, { scope });
    if (player.playing) player.pause();
    else player.play();
  },

  next: () => {
    const { verseKey, play } = get();
    const ref = verseKey ? parseVerseKey(verseKey) : null;
    if (!ref || !loaded) return;
    const following = loaded.recitation.verses[currentIndex + 1];
    if (following) return void play(following.verseKey);
    if (ref.chapter < CHAPTERS.length) void play(toVerseKey(ref.chapter + 1, 1), { fromStart: true });
  },

  previous: () => {
    if (!loaded) return;
    const start = loaded.recitation.verses[currentIndex].from;
    // Restart the ayah unless we're right at its beginning.
    if (player.currentTime - seconds(start) > 2 || currentIndex === 0) {
      void player.seekTo(seconds(start));
      return;
    }
    void get().play(loaded.recitation.verses[currentIndex - 1].verseKey);
  },

  stop: () => {
    request++;
    player.pause();
    player.clearLockScreenControls();
    loaded = null;
    set({ verseKey: null, word: null, status: "idle", finishedAyah: false });
  },

  setRepeat: (repeat) => set({ repeat }),
}));

/** Follows the playback position: ayah, word, repeat and single-ayah stops. */
function onStatus(status: AudioStatus) {
  const state = useAudio.getState();
  if (!loaded || !state.verseKey) return;

  if (status.didJustFinish) return onFinished();

  const { verses } = loaded.recitation;
  const ms = status.currentTime * 1000;
  const current = verses[currentIndex];
  if (current && status.playing && ms >= current.to) {
    if (state.repeat === "verse") {
      void player.seekTo(seconds(current.from));
      return;
    }
    if (state.scope === "ayah") {
      player.pause();
      void player.seekTo(seconds(current.from));
      useAudio.setState({ finishedAyah: true, status: "paused", word: null });
      return;
    }
  }

  const index = timingIndexAt(verses, ms);
  const verse = verses[index];
  const position = status.playing ? wordAt(verse, ms) : null;
  const word = position ? `${verse.verseKey}:${position}` : null;
  const next: Partial<AudioState> = {};
  if (index !== currentIndex || verse.verseKey !== state.verseKey) {
    currentIndex = index;
    next.verseKey = verse.verseKey;
    updateLockScreenTitle(verse.verseKey);
  }
  if (word !== state.word) next.word = word;
  const playback: PlaybackStatus = status.playing
    ? "playing"
    : status.isBuffering
      ? "loading"
      : "paused";
  if (playback !== state.status && !(state.status === "loading" && !status.isLoaded)) next.status = playback;
  if (Object.keys(next).length > 0) useAudio.setState(next);
}

function onFinished() {
  const { repeat, verseKey, scope, play } = useAudio.getState();
  const ref = verseKey ? parseVerseKey(verseKey) : null;
  if (!ref) return;
  if (repeat === "surah") return void play(toVerseKey(ref.chapter, 1), { fromStart: true });
  if (scope === "continuous" && ref.chapter < CHAPTERS.length) {
    return void play(toVerseKey(ref.chapter + 1, 1), { fromStart: true });
  }
  useAudio.setState({ status: "paused", word: null });
}

player.addListener("playbackStatusUpdate", (status) => {
  onStatus(status);
  // Snapshot the position here: the player's own getters change between reads.
  position = status.currentTime;
  duration = Number.isFinite(status.duration) ? status.duration : 0;
  timeListeners.forEach((notify) => notify());
});

usePreferences.subscribe((prefs, previous) => {
  if (prefs.playbackRate !== previous.playbackRate) player.setPlaybackRate(prefs.playbackRate);
  const { verseKey, status, scope, play } = useAudio.getState();
  if (prefs.reciterId !== previous.reciterId && verseKey) {
    loaded = null;
    // Restarting also supersedes a load still fetching the old reciter.
    if (status === "playing" || status === "loading") void play(verseKey, { scope });
  }
});

/* ---- Lock screen, Control Center and headset controls ---- */

let artworkUrl: string | undefined;
Asset.fromModule(require("../../../assets/images/icon.png"))
  .downloadAsync()
  .then((asset) => {
    artworkUrl = asset.localUri ?? undefined;
  })
  .catch(() => {});

function lockScreenMetadata(verseKey: string) {
  const ref = parseVerseKey(verseKey);
  const chapter = ref ? getChapter(ref.chapter) : undefined;
  const locale = currentLocale();
  const name = chapter ? (locale === "ar" ? chapter.nameArabic : chapter.nameSimple) : verseKey;
  return {
    title: ref ? `${name} · ${ref.verse}` : name,
    artist: getReciter(usePreferences.getState().reciterId).name[locale],
    albumTitle: locale === "ar" ? "قراءة" : "Qiraa",
    artworkUrl,
  };
}

function showOnLockScreen(verseKey: string) {
  player.setActiveForLockScreen(true, lockScreenMetadata(verseKey), {
    showSeekBackward: true,
    showSeekForward: true,
  });
}

function updateLockScreenTitle(verseKey: string) {
  player.updateLockScreenMetadata(lockScreenMetadata(verseKey));
}

/* ---- Progress for the player UI ---- */

function subscribeToTime(notify: () => void) {
  timeListeners.add(notify);
  return () => {
    timeListeners.delete(notify);
  };
}

/** Surah playback position in seconds; only progress UI should use it. */
export function useAudioTime(): { current: number; duration: number } {
  const current = useSyncExternalStore(subscribeToTime, () => position);
  const total = useSyncExternalStore(subscribeToTime, () => duration);
  return { current, duration: total };
}

export function seekTo(fraction: number) {
  if (duration > 0) void player.seekTo(fraction * duration);
}

/** True only for the ayah currently being recited (cheap per-verse selector). */
export function useIsReciting(verseKey: string): boolean {
  return useAudio((s) => s.verseKey === verseKey && s.status !== "idle");
}

/** True only for the word currently being recited. */
export function useIsRecitingWord(wordKey: string): boolean {
  return useAudio((s) => s.word === wordKey);
}

/** Plays one word's pronunciation, pausing any recitation first. */
export function playWord(verseKey: string, position: number) {
  if (player.playing) player.pause();
  wordPlayer.replace({ uri: wordAudioUrl(verseKey, position) });
  wordPlayer.play();
}
