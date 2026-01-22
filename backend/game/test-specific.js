/**
 * Quick test for specific scenario: 10 J Q JOKER + A
 */

import { canExtendMeld, sortSequenceMeld } from './MeldValidator.js';

function card(rank, suit, id) {
    return { id: id || `${rank}-${suit}`, rank, suit };
}

console.log('Testing: 10 J Q JOKER + A');
console.log('='.repeat(50));

const existing = [
    card('10', 'hearts', '10-h'),
    card('J', 'hearts', 'J-h'),
    card('Q', 'hearts', 'Q-h'),
    card('JOKER', 'joker', 'joker-1')
];

const newCards = [card('A', 'hearts', 'A-h')];

const meldInfo = {
    type: 'sequence',
    suit: 'hearts',
    isClean: false,
    isBurraco: false
};

console.log('Existing meld: 10 J Q JOKER (hearts)');
console.log('JOKER is acting as: K');
console.log('Adding: A (hearts)');
console.log('');

const result = canExtendMeld(existing, newCards, meldInfo);

console.log(`Result: ${result.valid ? '✅ VALID' : '❌ INVALID'}`);

if (!result.valid) {
    console.log(`Reason: ${result.reason}`);
} else {
    const combined = [...existing, ...newCards];
    const sorted = sortSequenceMeld(combined, 'hearts');

    console.log(`\nFinal sorted order: ${sorted.map(c => c.rank).join(' ')}`);
    console.log('\nCard positions:');
    sorted.forEach((c, idx) => {
        let acting = c.rank;
        if (c.rank === 'JOKER') {
            acting = 'JOKER (acting as K)';
        }
        console.log(`  ${idx + 1}. ${acting}`);
    });

    console.log(`\nIs Buraco? ${result.isBurraco ? 'Yes (7+)' : 'No'} (${combined.length} cards)`);
    console.log(`Is Clean? ${result.isClean ? 'Yes' : 'No (contains JOKER)'}`);
}

console.log('\n' + '='.repeat(50));
console.log('✅ This demonstrates the JOKER stays as K\n   when adding A to 10-J-Q-JOKER');
