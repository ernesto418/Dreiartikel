import type { CaseFilter } from '../hooks/useGameState';

interface CaseFilterToggleProps {
    value: CaseFilter;
    onChange: (value: CaseFilter) => void;
}

// Study one case at a time (or all). Shown only in Cases mode. 'all' mixes
// every case; the rest restrict rounds to templates governing that case.
const OPTIONS: { value: CaseFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'nom', label: 'Nominativ' },
    { value: 'akk', label: 'Akkusativ' },
    { value: 'dat', label: 'Dativ' },
];

export function CaseFilterToggle({ value, onChange }: CaseFilterToggleProps) {
    return (
        <div className="case-filter-toggle" role="group" aria-label="Case to practice">
            {OPTIONS.map(opt => (
                <button
                    key={opt.value}
                    className={`case-filter-btn ${value === opt.value ? 'active' : ''}`}
                    onClick={() => onChange(opt.value)}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}
