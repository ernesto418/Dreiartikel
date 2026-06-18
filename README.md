# Dreiartikel

A fast, mobile-friendly web app for drilling German articles — **der, die, das**.
Swipe (or use arrow keys) to pick the article, race a chess-clock time bank, and
build streaks that trigger confetti. Words you miss come back until you get them
right. Installable as a PWA.

## How to play

- A German word appears — pick its article (der / die / das).
- You have **3 seconds** per word; answer fast to bank extra time.
- Wrong answers are re-queued and reappear later.
- **Mobile:** swipe ← der, ↓ die, → das.
- **Desktop:** ← / ↓ / → arrows, **Space** for next word.

Filters let you practice **by rule** (words with a strong suffix/prefix pattern),
**without rule** (pure memorization), or by topic (Food, Family, Body, …).

## Project structure

| Path | Responsibility |
|------|----------------|
| `src/data.ts` | The word dataset and `PracticeItem` shape. Each noun's canonical fact is its **gender** (`m`/`f`/`n`); the article is derived from it. |
| `src/rules.ts` | **Single source of truth** for German gender rules — drives both the "By Rule" filter (`hasRule`) and the Tipp explanations (`getTipp`). Also holds `articleForGender`, the seam where grammatical cases will plug in. |
| `src/hooks/useGameState.ts` | Game loop: queue, scoring, streaks, the time-bank "chess clock", and spaced re-queueing of wrong answers. |
| `src/utils/speech.ts` | Web Speech API wrapper that reads each word aloud in German. |
| `src/utils/confetti.ts` | Escalating confetti and streak-color logic. |
| `src/App.tsx` | UI: start screen, game screen, swipe/keyboard handling. |

## Scripts

```bash
npm run dev      # start the dev server
npm run build    # type-check + production build
npm run check    # type-check + lint
npm test         # run the test suite (vitest)
npm run preview  # preview the production build
```

## Tests

- `src/rules.test.ts` — gender-rule logic and Tipp explanations.
- `src/data.test.ts` — dataset integrity: valid genders, capitalised nouns,
  no duplicates. This is the safety net for the hand-entered word list.

## Roadmap

The data model stores **gender** rather than a fixed article, so the current
der/die/das game is really the *Nominativ singular* mode of a more general
engine. The planned next step is practicing the other grammatical **cases**
(Nominativ / Akkusativ / Dativ), deriving each case's article from
gender × case × number via `articleForGender`'s successor.
