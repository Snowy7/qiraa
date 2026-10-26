# Qiraa

A Quran app for reading, listening and memorising, built to work offline. Web (PWA) first; an Expo app lives in `apps/mobile`.

- Five Quran scripts rendered from a bundled dataset: Uthmani Hafs, Madani mushaf (QCF V2 and V1), colour-coded Tajweed and IndoPak. Mushaf pages match the printed line breaks.
- Gapless recitation per surah with the ayah and word followed as it's recited; tap any word to hear it and see its meaning.
- Translations and tafsir from quran.com, prayer times calculated on device, spaced-repetition memorisation, saved ayahs.
- Layouts for phone, tablet and desktop, light and dark themes, English and Arabic (RTL).

## Structure

| Path               | What it is                                                                       |
| ------------------ | -------------------------------------------------------------------------------- |
| `apps/frontend`    | React 19 + Vite PWA (Tailwind, React Query, Zustand, Dexie)                      |
| `packages/core`    | Platform-agnostic domain logic and the offline Quran dataset, shared with mobile |
| `packages/ui`      | Small set of Radix-based UI primitives                                           |
| `apps/mobile`      | Expo app (not yet on `packages/core`)                                            |
| `packages/backend` | Convex backend (optional cloud sync)                                             |

## Development

```bash
pnpm install
pnpm --filter @template/frontend dev       # http://localhost:3000
pnpm --filter @template/frontend typecheck
pnpm --filter @qiraa/core test
```

The service worker only runs in production builds (`pnpm --filter @template/frontend build && pnpm --filter @template/frontend preview`).

### Regenerating the Quran dataset

`packages/core/data` is generated from the quran.com content API and committed:

```bash
node packages/core/scripts/generate-data.ts
```

Responses are cached in your temp directory, so reruns are quick and work offline.

## Credits

Quran text, mushaf layouts, word-by-word data, translations, tafsir and recitations come from [Quran.com](https://quran.com) / Quran Foundation; Quran fonts are from the King Fahd Glorious Quran Printing Complex.
