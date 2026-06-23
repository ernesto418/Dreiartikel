# CLAUDE.md

Guidance for Claude Code working in this repo. Read before making changes.

## What this is

**Dreiartikel** — a client-side React + TypeScript + Vite PWA for drilling German
articles and grammatical cases. No backend, no router, no state library. State
lives in React hooks; data is a hand-entered array in `src/data.ts`.

Two practice modes:
- **Articles** — pick der/die/das for a bare noun (the original game).
- **Cases** — pick the article a noun takes inside a sentence frame ("Ich sehe
  ___ Hund." → `den`). This is the general engine; articles mode is its
  Nominativ-singular special case.

## Architecture — the important part

The codebase is intentionally split into a **pure logic layer** and a **React UI
layer**. Keep them separate.

### Pure logic layer (no React) — well-tested, treat as the foundation
- `src/declension.ts` — the German definite-article declension table and
  `articleFor(gender, case, number)`. **This `DEFINITE` table is the source of
  truth for all article morphology.** `optionsForCase` derives answer choices.
- `src/rules.ts` — gender suffix/prefix rules (`hasRule`, `getTipp`) and
  `articleForGender` (delegates to `articleFor`). Single source of truth for
  gender rules — both the "By Rule" filter and the Tipp engine consume it, so
  they can't drift.
- `src/sentences.ts` — sentence templates + pure round generation
  (`buildRound`, `pickRound`, `generateRounds`). Templates carry a person/thing
  constraint so verbs get a sensible object.
- `src/data.ts` — the noun dataset, `PracticeItem`, parsing, and the curated
  `PERSON_WORDS` / `PLURAL_ONLY` sets.
- `src/utils/` — `speech.ts` (Web Speech TTS), `confetti.ts` (streak FX).

### React UI layer
- `src/hooks/useGameState.ts` — the game loop: queue, scoring, streaks, the
  chess-clock time bank, wrong-answer re-queue, audio. Produces a unified
  `Round` shape both modes feed into, so the loop is mode-agnostic.
- `src/App.tsx` — screens (start / game / over) and input handling.

> **Note:** `App.tsx` is large and answer-flow state is split between it and
> `useGameState`. A structure-only refactor (split into screen/components,
> consolidate answer state) is planned. Prefer *extraction over abstraction* —
> do not introduce a state library, DI, or class hierarchies for an app this size.

## Conventions

- **Tests**: Vitest, colocated as `*.test.ts` next to the module. No mocks, no
  jsdom — the pure logic layer is what's tested. Dataset-integrity guards (no
  duplicates, valid gender/animacy, curated-set words exist) are high-value;
  extend them when adding data fields. Use the `test-runner` subagent.
- **Randomness**: `shuffle`/`pickRound` use `Math.random`. Test them by
  invariants over many iterations, never exact output.
- Gender is the canonical per-noun fact (`m`/`f`/`n`); the article is *derived*.
  Don't store articles as the source of truth.
- Article mode keeps **fixed** der/die/das swipe positions (muscle memory);
  case mode **shuffles** options. Dativ has only 2 distinct forms (dem/der).
- Case-mode audio must **not** reveal the article before answering: silence on
  show, full correct sentence after (`speakOnShow` / `speakOnAnswer` /
  `speakReplay` on `Round`).

## Commands

```bash
npm run dev      # dev server
npm test         # vitest run
npm run check    # tsc -b --noEmit && eslint .
npm run build    # tsc -b && vite build
```

Run `npm run check` and `npm test` after logic changes; `npm run build` before
declaring done.

## Known scope limits (deliberate — don't "fix" silently)

- **n-Deklination (weak masculine) IS handled.** Nouns in the `WEAK_MASCULINE`
  set (Junge, Name, Franzose, …) decline correctly: *der Junge → den Jungen*.
  `declineNoun` in `declension.ts` adds -n/-en outside the nominative singular.
  When adding a weak-masculine noun, add it to that set.
- **Singular + definite article only.** No plurals, no indefinite (ein-)
  articles. Genitiv is in the table but not used in templates yet.
- **Plural-only nouns** (Eltern, Pommes, …) are excluded from case mode.
- **Animacy is heuristic.** Default "thing" + a curated person list; a miss only
  narrows templates, never produces a wrong answer.
- Some sentence templates accept odd noun/verb pairs (e.g. "Ich gehe zu
  [body part]"). Grammar-content cleanup is tracked, separate from feature work.

## Roadmap

Phase 1 (single-case sentences) shipped. **Phase 2** = two-case ditransitive
("Ich gebe dem Mann den Ball") via a multi-slot `Round`. Plan:
`.claude/plans/clever-crunching-kazoo.md`. Don't start Phase 2 unless asked.

## Git

Work happens on feature branches (current: `refactor/gender-data-model`), not
`main`. Commit incrementally with clear messages.
