import { useEffect, useEffectEvent, useRef } from "react";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useAudio } from "@/lib/audio/player";
import { usePreferences, type ReadingMode } from "@/lib/preferences";
import { useReadingPosition } from "@/lib/reading-position";

const READER_TAG = "qiraa-reader";

/** Keeps the screen on while a reader is open, if the user wants it. */
export function useReaderKeepAwake() {
  const keepAwake = usePreferences((s) => s.keepAwake);
  useEffect(() => {
    if (!keepAwake) return;
    activateKeepAwakeAsync(READER_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(READER_TAG).catch(() => {});
    };
  }, [keepAwake]);
}

/**
 * Saves the reading position a moment after the reader settles, so scrolling
 * through a surah doesn't write on every frame. Returns the function to call
 * with the verse in view.
 */
export function useSaveReadingPosition(mode: ReadingMode) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (chapter: number, verse: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => useReadingPosition.getState().save(chapter, verse, mode),
      1200,
    );
  };
}

/**
 * While "follow the recitation" is on, calls `onVerse` with each ayah the
 * recitation reaches, so the reader can keep it in view.
 */
export function useFollowRecitation(onVerse: (verseKey: string) => void) {
  const verseKey = useAudio((s) => (s.status === "playing" ? s.verseKey : null));
  const follow = usePreferences((s) => s.followRecitation);
  const reached = useEffectEvent(onVerse);
  useEffect(() => {
    if (follow && verseKey) reached(verseKey);
  }, [follow, verseKey]);
}
