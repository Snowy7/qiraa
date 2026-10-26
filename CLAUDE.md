# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Qiraa** (قراءة) — a Quran reading, listening and memorisation app. Offline-first PWA, monorepo:

- **Frontend** (`apps/frontend`): React 19 + Vite + Tailwind + Radix primitives, PWA via `vite-plugin-pwa` (injectManifest).
- **Core** (`packages/core`, `@qiraa/core`): platform-agnostic domain logic and the generated offline Quran dataset, shared with the mobile app.
- **UI** (`packages/ui`, `@template/ui`): Button, Dialog (bottom sheet on phones / side panel), Input, Slider, Switch. Consumed from source.
- **Mobile** (`apps/mobile`, `@qiraa/mobile`): Expo SDK 58 + expo-router + Uniwind, built on `@qiraa/core` (see "Mobile app" below).
- **Backend** (`packages/backend`): Convex, optional cloud sync.

## Commands

```bash
pnpm install
pnpm --filter @template/frontend dev        # assume it's already running
pnpm --filter @template/frontend typecheck
pnpm --filter @qiraa/core test               # dataset integrity + domain tests
pnpm --filter @qiraa/core typecheck
pnpm --filter @qiraa/mobile typecheck
node packages/core/scripts/generate-data.ts  # regenerate packages/core/data
```

## Architecture

### Quran text never comes from an API

`packages/core/data` holds, per script (`qpc-hafs`, `tajweed`, `qcf-v2`, `qcf-v1`, `indopak`), every mushaf page as lines of segments `[verseKey, firstWordPosition, words, endMarker?]` in 20-page chunk files, plus chapter page ranges, chapters, juz and English word-by-word. Each layout has its own line breaks (V1 and V2 differ). The web app lazy-imports chunks with `import.meta.glob` (`src/lib/quran/data.ts`); reader routes prefetch them in their loaders.

### Rendering

- `QURAN_SCRIPTS` (`core/src/mushaf/scripts.ts`) is the single source for fonts, line widths (`lineWidthEm`), size and line-height per script.
- Mushaf lines are justified to `lineWidthEm` em; font-size is fitted with container units (`.mushaf-page` in `globals.css`). QCF scripts use one font per page, loaded by `src/lib/quran/fonts.ts`.
- Words carry `data-word="chapter:verse:position"` and ayah ends `data-verse-end`; the reader handles taps with one delegated listener.

### Audio

`src/lib/stores/audio.ts` plays one file per surah (quran.com audio API) with ayah/word timestamps: gapless, follows the reciter, single-ayah or continuous scope. Playback progress is read from the element (`useAudioTime`) and the recited word is highlighted in the DOM, so time updates don't re-render React.

### State and storage

- Preferences: Zustand persisted to `localStorage` (`qiraa-preferences`), read synchronously at startup.
- User data: Dexie (`NoorDB`, name kept so old installs keep their data) for collections, bookmarks, memorisation, reading history.
- Online content (translations, tafsir, search, recitation timings): React Query with `networkMode: "offlineFirst"`, cached by the service worker.

### Offline (`src/sw.ts`, `src/lib/offline.ts`)

Precache: app shell, UI fonts, Hafs/IndoPak/surah-name fonts and the default script's data. Runtime cache: other data chunks and page fonts (cache-first), quran.com API (stale-while-revalidate), recitations (cache-first with range support). Settings → Offline downloads warm those caches.

## Layout

Phone: floating tab bar. Tablet (`md`): icon rail. Desktop (`xl`): labelled sidebar. Reader routes (`/quran/:chapter`, `/mushaf/:page`) keep the rail and add a surah panel from `lg`; wide landscape screens show a two-page mushaf spread.

## Routes

```
/                  Home
/quran             Surah / juz / page index
/quran/:chapter    Verse-by-verse reader (?verse=N)
/mushaf/:page      Mushaf reader
/saved, /saved/:id Collections
/memorize          Memorisation dashboard
/memorize/review   Review session
/prayer            Prayer times
/search            Search
/settings          Settings (incl. offline downloads)
```

## Mobile app (`apps/mobile/src`)

- Routes mirror the web's (`/quran/[chapter]`, `/mushaf/[page]`, …), so `qiraa://` links open the same screens. Five native tabs (Android allows at most five); Search is a root route.
- Quran data is read synchronously from `packages/core/data` with Metro's `require.context` (`lib/quran/data.ts`). Static script fonts are bundled; QCF page fonts download as TTF from quran.com's CDN and stay on disk (`lib/quran/fonts.ts`).
- Mushaf pages fill 15 line slots from core's `pageSlots`; lines are justified to `lineWidthEm` (`lib/quran/mushaf-layout.ts`).
- Audio: one expo-audio player per surah with core's timings, background playback and lock-screen controls (`lib/audio/player.ts`). Downloads keep the MP3 and its timings under `documents/recitations`.
- State: Zustand persisted to the expo-sqlite kv-store; online content through React Query with a per-query disk persister.
- iOS uses system chrome: native tabs (Liquid Glass) with the mini player as their bottom accessory, native header items, form sheets.
- The UI language follows the app's language in system settings, and RTL follows it. React Native mirrors `left`/`right` alignment in RTL, so set Quran and translation text with `alignedTo()` (`lib/text.ts`).

## Code Patterns

- Import UI primitives from `@template/ui`, domain logic and types from `@qiraa/core`.
- Use `@/` for frontend `src` imports.
- UI strings live in `core/src/i18n/messages.ts` (English + Arabic); use `useI18n()`.
- Use logical properties (`ms-`, `pe-`, `start-`) so layouts mirror in Arabic; media controls stay LTR.
