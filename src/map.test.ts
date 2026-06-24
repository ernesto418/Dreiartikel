import { describe, it, expect } from 'vitest';
import { MAP_NODES, MAP_EDGES, nodeById } from './map';
import type { GameMode } from './hooks/useGameState';

// These guards protect future iterations: when you append a node or fork to the
// arrays in map.ts, a typo'd id or an invalid mode fails here instead of
// rendering a dead node at runtime.

const VALID_MODES: GameMode[] = ['article', 'case-single', 'case-detect', 'plural', 'story'];
const VALID_CASE_FILTERS = ['all', 'nom', 'akk', 'dat', 'gen'];

describe('map nodes', () => {
    it('every node launches a valid GameMode', () => {
        for (const node of MAP_NODES) {
            expect(VALID_MODES).toContain(node.mode);
        }
    });

    it('node ids are unique', () => {
        const ids = MAP_NODES.map(n => n.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('positions are within the [0,100] canvas', () => {
        for (const node of MAP_NODES) {
            expect(node.x).toBeGreaterThanOrEqual(0);
            expect(node.x).toBeLessThanOrEqual(100);
            expect(node.y).toBeGreaterThanOrEqual(0);
            expect(node.y).toBeLessThanOrEqual(100);
        }
    });

    it('any preset caseFilter is a valid value', () => {
        for (const node of MAP_NODES) {
            if (node.caseFilter !== undefined) {
                expect(VALID_CASE_FILTERS).toContain(node.caseFilter);
            }
        }
    });

    it('every node carries a non-empty label and icon', () => {
        for (const node of MAP_NODES) {
            expect(node.label.length).toBeGreaterThan(0);
            expect(node.icon.length).toBeGreaterThan(0);
        }
    });
});

describe('map edges', () => {
    it('every edge endpoint references an existing node id', () => {
        for (const edge of MAP_EDGES) {
            expect(nodeById(edge.from), `edge.from "${edge.from}"`).toBeDefined();
            expect(nodeById(edge.to), `edge.to "${edge.to}"`).toBeDefined();
        }
    });

    it('every edge kind is main or fork', () => {
        for (const edge of MAP_EDGES) {
            expect(['main', 'fork']).toContain(edge.kind);
        }
    });

    it('no edge is a self-loop', () => {
        for (const edge of MAP_EDGES) {
            expect(edge.from).not.toBe(edge.to);
        }
    });
});

describe('iteration 1 graph', () => {
    it('ships the planned lessons', () => {
        const ids = MAP_NODES.map(n => n.id);
        expect(ids).toEqual(
            expect.arrayContaining(['articles', 'plural', 'plural-story', 'cases-produce', 'cases-detect']),
        );
    });

    it('every node is reachable from "articles" via edges', () => {
        const reachable = new Set<string>(['articles']);
        // Fixed-point over the (small) edge set.
        let grew = true;
        while (grew) {
            grew = false;
            for (const edge of MAP_EDGES) {
                if (reachable.has(edge.from) && !reachable.has(edge.to)) {
                    reachable.add(edge.to);
                    grew = true;
                }
            }
        }
        for (const node of MAP_NODES) {
            expect(reachable.has(node.id), `node "${node.id}" unreachable`).toBe(true);
        }
    });

    it('Detect forks off Produce (not a main-road continuation)', () => {
        const detectEdge = MAP_EDGES.find(e => e.to === 'cases-detect');
        expect(detectEdge).toBeDefined();
        expect(detectEdge!.kind).toBe('fork');
    });

    it('the Plural Story is a fork off Plural (a sidequest)', () => {
        const storyEdge = MAP_EDGES.find(e => e.to === 'plural-story');
        expect(storyEdge).toBeDefined();
        expect(storyEdge!.from).toBe('plural');
        expect(storyEdge!.kind).toBe('fork');
    });
});
