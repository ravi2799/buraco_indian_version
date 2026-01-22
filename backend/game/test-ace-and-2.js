/**
 * Test: 10 J Q JOKER + A + 2
 * This should be INVALID because:
 * - Adding 2 means A must be LOW (not HIGH after K)
 * - Gap between 2 and 10 is too large for one JOKER
 */

import { canExtendMeld, sortSequenceMeld } from './MeldValidator.js';

function card(rank, suit, id) {
    return { id: id || `${rank}-${suit}`, rank, suit };
}

console.log('\nTesting: 10 J Q JOKER + A + 2');
console.log('='.repeat(50));

const existing = [
    card('10', 'hearts', '10-h'),
    card('J', 'hearts', 'J-h'),
    card('Q', 'hearts', 'Q-h'),
    card('JOKER', 'joker', 'joker-1')
];

const newCards = [
    card('A', 'hearts', 'A-h'),
    card('2', 'hearts', '2-h')
];

const meldInfo = {
    type: 'sequence',
    suit: 'hearts',
    isClean: false,
    isBurraco: false
};

console.log('Existing meld: 10 J Q JOKER (hearts)');
console.log('Adding: A 2 (hearts)');
console.log('');
console.log('Expected: INVALID');
console.log('Reason: Gap between 2 and 10 is 7 cards, but only 1 JOKER available');
console.log('');

const result = canExtendMeld(existing, newCards, meldInfo);

console.log(`Result: ${result.valid ? '✅ VALID' : '❌ INVALID'}`);

if (!result.valid) {
    console.log(`Reason: ${result.reason}`);
    console.log('\n✅ Correctly rejected! Cannot have A-2...10 with only one JOKER.');
} else {
    const combined = [...existing, ...newCards];
    const sorted = sortSequenceMeld(combined, 'hearts');

    console.log(`\nFinal sorted order: ${sorted.map(c => c.rank).join(' ')}`);
    console.log('⚠️  This should have been invalid!');
}

console.log('='.repeat(50));
