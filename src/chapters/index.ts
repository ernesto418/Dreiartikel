// Chapters: the main-quest content layer. A chapter is authored as plain German
// prose + a topic tag; parseChapter turns it into the Story the existing engine
// plays. This module is the seam between authored prose and playable rounds, and
// it holds the ordered main-quest sequence (the book's grammar TOC).
//
// Adding a chapter = appending a RawChapter to MAIN_QUEST. Everything downstream
// (round building, the game loop, StoryCard) is reused unchanged.

import { generateItems, type PracticeItem } from '../data';
import { buildStoryRounds, type Story } from '../stories';
import type { PracticeRound } from '../round';
import { parseChapter, type ChapterTopic } from './parse';

/** A chapter as the author writes it: a title, the grammar it teaches, and the
 *  prose body (one sentence per line). No blanks are marked by hand — the parser
 *  finds them. `mode` mirrors the topic so the resolver knows how to build each
 *  blank. */
export interface RawChapter {
    id: string;
    title: string;
    /** Short narrative framing shown before the drill (the "scene"). */
    intro?: string;
    topic: ChapterTopic;
    /** The story body. Each line is one sentence (the reading/reveal unit). */
    lines: string[];
}

/** Turn an authored chapter into the Story the engine plays. The topic becomes
 *  the Story.mode (genus, kasus-dat, kasus-akk and plural all route through the
 *  chapter resolvers; the hand-authored letters are unaffected). */
export function chapterToStory(raw: RawChapter): Story {
    return {
        id: raw.id,
        title: raw.title,
        mode: raw.topic,
        lines: parseChapter(raw.topic, raw.lines),
    };
}

/** The full pool used to resolve a chapter's blank words — the whole dataset
 *  unioned with any caller pool, so a chapter's nouns always resolve regardless
 *  of the active filter (mirrors stories.ts's storyItemPool). */
function chapterItemPool(pool: PracticeItem[]): PracticeItem[] {
    const byWord = new Map<string, PracticeItem>();
    for (const item of [...generateItems(), ...pool]) byWord.set(item.word, item);
    return [...byWord.values()];
}

/** Build the playable rounds for one chapter: parse → Story → rounds. */
export function buildChapterRounds(raw: RawChapter, pool: PracticeItem[]): PracticeRound[] {
    return buildStoryRounds(chapterToStory(raw), chapterItemPool(pool));
}

/** Look up a chapter by id. */
export function chapterById(id: string): RawChapter | undefined {
    return MAIN_QUEST.find(c => c.id === id);
}

/** Rounds for ONE chapter, selected by id (mirrors generateStoryRoundsFor). */
export function generateChapterRoundsFor(chapterId: string | undefined, pool: PracticeItem[]): PracticeRound[] {
    const chapter = chapterById(chapterId ?? '') ?? MAIN_QUEST[0];
    return buildChapterRounds(chapter, pool);
}

// ── The main quest: Chapter 1, following the book's TOC (1 Nomen) ────────────
// Each chapter teaches ONE grammar topic in the order the book introduces it:
// Genus (1.1) → Plural (1.2) → Kasus Akkusativ (1.3) → Kasus Dativ (1.4).
// The prose is one continuing adventure so the grammar rides a story.

import { CH1_GENUS, CH1_PLURAL, CH1_AKKUSATIV, CH1_DATIV } from './ch1';

export const MAIN_QUEST: RawChapter[] = [
    CH1_GENUS,
    CH1_PLURAL,
    CH1_AKKUSATIV,
    CH1_DATIV,
];
