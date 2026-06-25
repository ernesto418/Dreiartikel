import type { GameMode, CaseFilter } from './hooks/useGameState';

// ─── The map is DATA ────────────────────────────────────────────────────────
//
// The renderer (MapScreen) knows nothing about Articles/Plural/Cases. It draws
// whatever these two arrays describe. Adding a lesson, a fork, or a whole new
// path in a later iteration is *appending entries to these arrays* — never a
// renderer change. The map.test.ts guards exist to catch the typos you'll make
// when you do (e.g. an edge pointing at a node id that doesn't exist).

/** A lesson on the map: a launch point for one game mode (+ optional preset). */
export interface MapNode {
    /** Stable key referenced by edges, e.g. 'cases-produce'. */
    id: string;
    /** Short title shown under the node, e.g. 'Cases · Produce'. */
    label: string;
    /** Emoji marker drawn on the node. */
    icon: string;
    /** Which game this node launches. */
    mode: GameMode;
    /** Optional case preset. If set, the node skips the in-panel case filter and
     *  drills only that case (a future "Dativ only" node). If unset, the panel
     *  shows the All/Nom/Akk/Dat filter. */
    caseFilter?: CaseFilter;
    /** Story-mode nodes only: which story to play (a Story.id). Lets several
     *  story nodes share mode:'story' but each launch a different letter. */
    storyId?: string;
    /** Main-quest chapter nodes only: which chapter to play (a RawChapter.id).
     *  A chapter rides mode:'story' (its rounds come from authored prose) but
     *  launches a quest chapter instead of a letter. */
    chapterId?: string;
    /** Position on the SVG canvas, both in [0,100] (viewBox-relative). */
    x: number;
    y: number;
}

/** A drawn connector between two nodes. 'main' = solid road (suggested order),
 *  'fork' = dashed sidequest. Not special-cased anywhere — a fork is simply an
 *  edge with kind:'fork', and a node may have any number of in/out edges. */
export interface MapEdge {
    from: string;
    to: string;
    kind: 'main' | 'fork';
}

// ─── Iteration 1 graph ──────────────────────────────────────────────────────
// Road: Articles → Plural → Cases·Produce, with Cases·Detect forking off Produce
// as a sidequest. Cases nodes carry no preset caseFilter, so selecting them
// reveals the All/Nom/Akk/Dat filter in the panel.

export const MAP_NODES: MapNode[] = [
    // ── Main quest: Chapter 1 "Der Aufbruch", in book-TOC order. The solid road
    // is the story; each stop teaches one grammar point through the adventure.
    { id: 'ch1-genus', label: 'Ch.1 · Der Aufbruch', icon: '📖', mode: 'story', chapterId: 'ch1-genus', x: 14, y: 22 },
    { id: 'ch1-plural', label: 'Ch.1 · Der Markt', icon: '📖', mode: 'story', chapterId: 'ch1-plural', x: 40, y: 38 },
    { id: 'ch1-akkusativ', label: 'Ch.1 · Der Einkauf', icon: '📖', mode: 'story', chapterId: 'ch1-akkusativ', x: 62, y: 54 },
    { id: 'ch1-dativ', label: 'Ch.1 · Die Reise', icon: '📖', mode: 'story', chapterId: 'ch1-dativ', x: 86, y: 70 },

    // ── Side quests: standalone drills + the hand-authored letters (optional). ──
    { id: 'articles', label: 'Articles', icon: '🎯', mode: 'article', x: 16, y: 56 },
    { id: 'plural', label: 'Plural', icon: '🔢', mode: 'plural', x: 38, y: 72 },
    { id: 'plural-story', label: 'Plural · Story', icon: '✉️', mode: 'story', storyId: 'liebe-lisa', x: 14, y: 86 },
    { id: 'cases-produce', label: 'Cases · Produce', icon: '✍️', mode: 'case-single', x: 64, y: 86 },
    { id: 'cases-detect', label: 'Cases · Detect', icon: '🔍', mode: 'case-detect', x: 88, y: 94 },
    { id: 'dativ-story', label: 'Dativ · Story', icon: '✉️', mode: 'story', storyId: 'familientag', x: 40, y: 96 },
];

export const MAP_EDGES: MapEdge[] = [
    // Main-quest road: the four chapters in sequence.
    { from: 'ch1-genus', to: 'ch1-plural', kind: 'main' },
    { from: 'ch1-plural', to: 'ch1-akkusativ', kind: 'main' },
    { from: 'ch1-akkusativ', to: 'ch1-dativ', kind: 'main' },

    // Side-quest forks hanging off the matching chapter.
    { from: 'ch1-genus', to: 'articles', kind: 'fork' },
    { from: 'ch1-plural', to: 'plural', kind: 'fork' },
    { from: 'plural', to: 'plural-story', kind: 'fork' },
    { from: 'ch1-akkusativ', to: 'cases-produce', kind: 'fork' },
    { from: 'cases-produce', to: 'cases-detect', kind: 'fork' },
    { from: 'ch1-dativ', to: 'dativ-story', kind: 'fork' },
];

/** Look up a node by id (renderer + App use this to resolve edge endpoints). */
export function nodeById(id: string): MapNode | undefined {
    return MAP_NODES.find(n => n.id === id);
}
