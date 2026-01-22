import { validateMeld } from '../MeldValidator.js';
import { getRankIndex } from '../Deck.js';

const card = (rank, suit, id) => ({ id: id || `${rank}-${suit}`, rank, suit });

console.log('Debugging Q-JOKER-A:\n');

const cards = [card('Q', 'hearts'), card('JOKER', 'joker'), card('A', 'hearts')];

// Check what getRankIndex returns
console.log('Q index:', getRankIndex('Q'));
console.log('K index:', getRankIndex('K'));
console.log('A index:', getRankIndex('A'));

const wilds = cards.filter(c => c.rank === 'JOKER');
const naturals = cards.filter(c => c.rank !== 'JOKER');

console.log('\nNaturals:', naturals.map(c => c.rank));
console.log('Wilds count:', wilds.length);

const positions = naturals.map(c => ({ idx: getRankIndex(c.rank), rank: c.rank }));
positions.sort((a, b) => a.idx - b.idx);
console.log('\nPositions (sorted):', positions);

// Check ace high logic
const hasAce = positions.some(p => p.rank === 'A');
const hasQueen = positions.some(p => p.rank === 'Q');
const hasJack = positions.some(p => p.rank === 'J');
const hasKing = positions.some(p => p.rank === 'K');
const hasTwo = positions.some(p => p.rank === '2');
const hasThree = positions.some(p => p.rank === '3');

console.log('\nhas Ace:', hasAce, 'has Queen:', hasQueen, 'has King:', hasKing, 'has Jack:', hasJack);
console.log('has Two:', hasTwo, 'has Three:', hasThree);
console.log('wilds.length:', wilds.length);

// From MeldValidator logic (lines 211-212)
const hasLowAce = positions.some(p => p.idx === 0 && positions.some(p2 => p2.idx === 1 || p2.idx === 2));
const hasHighAce = positions.some(p => p.idx === 0) && positions.some(p => p.idx === 12); // K

console.log('\nhasLowAce:', hasLowAce);
console.log('hasHighAce:', hasHighAce);

let aceIsHigh = hasHighAce && !hasLowAce;

console.log('\nAce should be high:', aceIsHigh);

if (aceIsHigh) {
    const acePos = positions.find(p => p.rank === 'A');
    if (acePos) acePos.idx = 13;
    positions.sort((a, b) => a.idx - b.idx);
    console.log('Adjusted positions:', positions);
}

// Count gaps
let gaps = 0;
for (let i = 1; i < positions.length; i++) {
    const gap = positions[i].idx - positions[i - 1].idx - 1;
    console.log(`Gap between ${positions[i - 1].rank} (idx ${positions[i - 1].idx}) and ${positions[i].rank} (idx ${positions[i].idx}): ${gap}`);
    if (gap > 0) gaps += gap;
}

console.log('\nTotal gaps:', gaps);
console.log('Wilds available:', wilds.length);
console.log('Can fill gaps:', gaps <= wilds.length);

const result = validateMeld(cards);
console.log('\nFinal result:', JSON.stringify(result, null, 2));
