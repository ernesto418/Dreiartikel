import type { FilterType } from '../hooks/useGameState';

interface FilterDropdownProps {
    filter: FilterType;
    categories: string[];
    open: boolean;
    onToggle: () => void;
    onSelect: (filter: FilterType) => void;
}

function labelFor(filter: FilterType): string {
    if (filter === 'all') return 'All Words';
    if (filter === 'by-rule') return 'By Rule';
    if (filter === 'without-rule') return 'Without Rule';
    return filter;
}

export function FilterDropdown({ filter, categories, open, onToggle, onSelect }: FilterDropdownProps) {
    const items = [
        { key: 'all', label: 'All Words' },
        { key: 'by-rule', label: '📏 By Rule' },
        { key: 'without-rule', label: '🎲 Without Rule' },
        ...categories.map(cat => ({ key: cat, label: cat })),
    ];

    return (
        <div className="filter-dropdown">
            <button className="filter-toggle" onClick={onToggle}>
                🏷️ {labelFor(filter)}
                <span className={`filter-arrow ${open ? 'open' : ''}`}>▾</span>
            </button>

            {open && (
                <div className="filter-menu">
                    {items.map(item => (
                        <button
                            key={item.key}
                            className={`filter-menu-item ${filter === item.key ? 'active' : ''}`}
                            onClick={() => onSelect(item.key as FilterType)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
