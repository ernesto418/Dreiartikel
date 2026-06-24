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
    { id: 'articles', label: 'Articles', icon: '🎯', mode: 'article', x: 28, y: 16 },
    { id: 'plural', label: 'Plural', icon: '🔢', mode: 'plural', x: 70, y: 42 },
    { id: 'cases-produce', label: 'Cases · Produce', icon: '✍️', mode: 'case-single', x: 32, y: 72 },
    { id: 'cases-detect', label: 'Cases · Detect', icon: '🔍', mode: 'case-detect', x: 74, y: 96 },
];

export const MAP_EDGES: MapEdge[] = [
    { from: 'articles', to: 'plural', kind: 'main' },
    { from: 'plural', to: 'cases-produce', kind: 'main' },
    { from: 'cases-produce', to: 'cases-detect', kind: 'fork' },
];

/** Look up a node by id (renderer + App use this to resolve edge endpoints). */
export function nodeById(id: string): MapNode | undefined {
    return MAP_NODES.find(n => n.id === id);
}
