import { useState, useRef, useEffect } from 'react';
import { MAP_NODES, nodeById, type MapNode } from '../map';
import { createMapScene, MAP_ASPECT, type MapScene, type LabelPos } from './mapScene';
import { CaseFilterToggle } from '../components/CaseFilterToggle';
import type { GameMode, CaseFilter } from '../hooks/useGameState';

interface MapScreenProps {
    onStart: (mode: GameMode, caseFilter: CaseFilter) => void;
}

const isCaseNode = (node: MapNode) =>
    node.mode === 'case-single' || node.mode === 'case-detect';

// Per-node "how to play" line, keyed by mode. Kept here (not in map.ts) so the
// data layer stays pure launch-points; this is presentation copy.
const BLURB: Record<GameMode, string> = {
    'article': 'A German word appears — pick its article (der/die/das).',
    'plural': 'A singular noun appears — pick its correct plural form.',
    'case-single': 'A sentence has a blank — pick the article the case needs.',
    'case-detect': 'A full sentence shows a highlighted phrase — name its case.',
};

export function MapScreen({ onStart }: MapScreenProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<MapScene | null>(null);
    // Start on the first lesson so the panel is never empty.
    const [selectedId, setSelectedId] = useState<string>(MAP_NODES[0].id);
    const [caseFilter, setCaseFilter] = useState<CaseFilter>('all');
    // Label anchors (canvas-%) come from the scene after mount; rendered as crisp
    // HTML overlays instead of mangled WebGL text.
    const [labels, setLabels] = useState<LabelPos[]>([]);

    // Mount the pixel-art Kaplay scene. A *fresh* canvas is created per mount and
    // removed on cleanup: Kaplay/WebGL owns a canvas for its whole lifetime, so
    // reusing one element across StrictMode's mount→unmount→remount would leave a
    // dead GL context on it. New element each time = always a clean context.
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const canvas = document.createElement('canvas');
        canvas.className = 'map-canvas';
        canvas.setAttribute('aria-label', 'Lesson world map');
        container.appendChild(canvas);

        const scene = createMapScene(canvas, (id) => setSelectedId(id));
        sceneRef.current = scene;
        setLabels(scene.labelPositions);

        return () => {
            scene.destroy();
            sceneRef.current = null;
            canvas.remove();
            setLabels([]);
        };
    }, []);

    // Drive the hero/selection ring from React state (covers both canvas taps and
    // any future HTML-driven selection).
    useEffect(() => {
        sceneRef.current?.select(selectedId);
    }, [selectedId]);

    const selected = nodeById(selectedId);

    const handleStart = () => {
        if (!selected) return;
        const filter = selected.caseFilter ?? caseFilter;
        onStart(selected.mode, filter);
    };

    return (
        <main>
            <div className="map-screen">
                <h1 className="map-title">Dreiartikel</h1>
                <p className="map-subtitle">Follow the path — or jump anywhere.</p>

                <div className="map-stage">
                    <div
                        ref={containerRef}
                        className="map-canvas-wrap"
                        style={{ aspectRatio: MAP_ASPECT }}
                    >
                        {labels.map(l => (
                            <button
                                key={l.id}
                                type="button"
                                className={`map-label ${l.id === selectedId ? 'active' : ''}`}
                                style={{ left: `${l.xPct}%`, top: `${l.yPct}%` }}
                                onClick={() => setSelectedId(l.id)}
                            >
                                {l.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Selected-node panel: docked HTML below the canvas, fully tappable. */}
                <div className="map-panel">
                    {selected ? (
                        <>
                            <h3 className="map-panel-title">
                                <span className="map-panel-icon">{selected.icon}</span> {selected.label}
                            </h3>
                            <p className="map-panel-blurb">{BLURB[selected.mode]}</p>

                            {/* Case nodes without a preset reveal the case filter. */}
                            {isCaseNode(selected) && selected.caseFilter === undefined && (
                                <CaseFilterToggle value={caseFilter} onChange={setCaseFilter} />
                            )}

                            <button className="start-btn" onClick={handleStart}>
                                Los geht's!
                            </button>
                        </>
                    ) : (
                        <p className="map-panel-hint">Tap a lesson to begin.</p>
                    )}
                </div>
            </div>
        </main>
    );
}
