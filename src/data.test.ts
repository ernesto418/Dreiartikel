import { describe, it, expect } from 'vitest';
import { generateItems, getCategories } from './data';

// The dataset is hand-entered, so these guard against the most likely human
// errors: typos in the article, malformed entries, accidental duplicates.
describe('dataset integrity', () => {
    const items = generateItems();

    it('parses without throwing and is non-empty', () => {
        expect(items.length).toBeGreaterThan(0);
    });

    it('every entry has a word, a hint, a category and a valid gender', () => {
        for (const item of items) {
            expect(item.word, `entry ${item.id}`).toBeTruthy();
            expect(item.hint, `entry ${item.id} (${item.word})`).toBeTruthy();
            expect(item.category, `entry ${item.id} (${item.word})`).toBeTruthy();
            expect(['m', 'f', 'n'], `entry ${item.id} (${item.word})`).toContain(item.gender);
        }
    });

    it('words start with a capital letter (German nouns)', () => {
        for (const item of items) {
            const first = item.word[0];
            expect(first, `"${item.word}" should be capitalised`).toBe(first.toUpperCase());
        }
    });

    it('has no duplicate words', () => {
        const seen = new Map<string, string>();
        const duplicates: string[] = [];
        for (const item of items) {
            const prev = seen.get(item.word);
            if (prev && prev !== item.answer) {
                duplicates.push(`${item.word} (${prev} vs ${item.answer})`);
            } else if (prev) {
                duplicates.push(item.word);
            }
            seen.set(item.word, item.answer);
        }
        expect(duplicates, `duplicate words: ${duplicates.join(', ')}`).toEqual([]);
    });

    it('exposes every category used by an item', () => {
        const cats = new Set(getCategories());
        for (const item of items) {
            expect(cats, `category "${item.category}"`).toContain(item.category);
        }
    });
});
