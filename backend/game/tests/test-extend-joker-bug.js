import { canExtendMeld } from '../MeldValidator.js';

const card = (rank, suit, id) => ({ id: id || `${rank}-${suit}`, rank, suit });

console.log('Testing: Extending meld with 2nd Joker\n');
console.log('='.repeat(50));

// Scenario 1: Existing meld has 1 joker, trying to add another
const existingMeld1 = [
    card('5', 'hearts', '5h'),
    card('JOKER', 'joker', 'j1'),
    card('7', 'hearts', '7h')
];

const newCards1 = [
    card('JOKER', 'joker', 'j2')
];

const meldInfo1 = { type: 'sequence', suit: 'hearts', isClean: false };

console.log('\nScenario 1: Add JOKER to existing 5-JOKER-7');
console.log('Existing meld: 5-JOKER-7');
console.log('Adding: JOKER');
console.log('Combined would be: 5-JOKER-JOKER-7 (2 jokers)');

const result1 = canExtendMeld(existingMeld1, newCards1, meldInfo1);
console.log('Result:', result1.valid ? '✅ VALID (BUG!)' : '❌ INVALID (Correct)');
if (!result1.valid) {
    console.log('Reason:', result1.reason);
}

// Scenario 2: Existing set has 1 joker, trying to add another
const existingMeld2 = [
    card('Q', 'hearts', 'Qh'),
    card('Q', 'diamonds', 'Qd'),
    card('JOKER', 'joker', 'j1')
];

const newCards2 = [
    card('JOKER', 'joker', 'j2')
];

const meldInfo2 = { type: 'set', rank: 'Q', isClean: false };

console.log('\n\nScenario 2: Add JOKER to existing Q-Q-JOKER');
console.log('Existing meld: Q-Q-JOKER');
console.log('Adding: JOKER');
console.log('Combined would be: Q-Q-JOKER-JOKER (2 jokers)');

const result2 = canExtendMeld(existingMeld2, newCards2, meldInfo2);
console.log('Result:', result2.valid ? '✅ VALID (BUG!)' : '❌ INVALID (Correct)');
if (!result2.valid) {
    console.log('Reason:', result2.reason);
}

console.log('\n' + '='.repeat(50));
