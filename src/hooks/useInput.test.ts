import { describe, it, expect } from 'vitest';
import { glyphForOptionSlot } from './useInput';

describe('glyphForOptionSlot', () => {
    it('maps 3 options to ← ↓ → by index', () => {
        expect(glyphForOptionSlot(0, 3)).toBe('←');
        expect(glyphForOptionSlot(1, 3)).toBe('↓');
        expect(glyphForOptionSlot(2, 3)).toBe('→');
    });

    it('maps 2 options (Dativ) to ← and →, skipping the middle', () => {
        expect(glyphForOptionSlot(0, 2)).toBe('←');
        expect(glyphForOptionSlot(1, 2)).toBe('→');
    });

    it('returns empty for an out-of-range slot', () => {
        expect(glyphForOptionSlot(3, 3)).toBe('');
    });
});
