/**
 * Integration test to find the 2-joker bug
 */

import GameState from '../GameState.js';
import { createDeck } from '../Deck.js';

console.log('='.repeat(60));
console.log('Testing: 2 Jokers in Same Meld Bug (6 players)');
console.log('='.repeat(60));

// Create a 6-player game
const players = [
    { socketId: 's1', nickname: 'P1', team: 'A', seat: 0 },
    { socketId: 's2', nickname: 'P2', team: 'B', seat: 1 },
    { socketId: 's3', nickname: 'P3', team: 'A', seat: 2 },
    { socketId: 's4', nickname: 'P4', team: 'B', seat: 3 },
    { socketId: 's5', nickname: 'P5', team: 'A', seat: 4 },
    { socketId: 's6', nickname: 'P6', team: 'B', seat: 5 }
];

// Create a test scenario with specific cards
const card = (rank, suit, id) => ({ id: id || `${rank}-${suit}`, rank, suit });

const hands = [
    // P1 (Team A) - has 5, 6, 7, and 2 jokers
    [
        card('5', 'hearts', '5h'),
        card('6', 'hearts', '6h'),
        card('7', 'hearts', '7h'),
        card('JOKER', 'joker', 'j1'),
        card('JOKER', 'joker', 'j2'),
        card('9', 'hearts', '9h')
    ],
    // Other players - dummy hands
    [card('2', 'clubs', '2c')],
    [card('3', 'clubs', '3c')],
    [card('4', 'clubs', '4c')],
    [card('8', 'clubs', '8c')],
    [card('10', 'clubs', '10c')]
];

const drawPile = [card('K', 'spades', 'Ks')];
const discardPile = [];
const pozzetti = [[card('Q', 'diamonds', 'Qd')], [card('J', 'diamonds', 'Jd')]];

const game = new GameState({
    playerCount: 6,
    players,
    hands,
    pozzetti,
    drawPile,
    discardPile,
    config: { deckCount: 3 }
});

console.log('\nScenario: Player creates 5-JOKER-7, then tries to add another JOKER\n');

// P1's turn - draw phase
console.log('Step 1: P1 draws a card');
const drawResult = game.drawFromPile('s1');
console.log('  Result:', drawResult.success ? 'SUCCESS' : 'FAILED');

// Now in meld phase
console.log('\nStep 2: P1 creates initial meld: 5-JOKER-7');
const meldResult = game.playMeld('s1', ['5h', 'j1', '7h']);
console.log('  Result:', meldResult.success ? 'SUCCESS' : 'FAILED');

if (meldResult.success) {
    const teamMelds = game.teams.A.melds;
    console.log('  Team A melds:', teamMelds.length);
    const meld = teamMelds[0];
    console.log('  Meld cards:', meld.cards.map(c => c.rank).join('-'));

    // Try to extend with second joker
    console.log('\nStep 3: P1 tries to extend meld with second JOKER');
    const extendResult = game.extendMeld('s1', meld.id, ['j2']);
    console.log('  Result:', extendResult.success ? '🐛 BUG! ALLOWED 2 JOKERS' : '✅ CORRECTLY REJECTED');

    if (!extendResult.success) {
        console.log('  Reason:', extendResult.reason);
    } else {
        console.log('  Final meld:', meld.cards.map(c => c.rank).join('-'));
        const jokerCount = meld.cards.filter(c => c.rank === 'JOKER').length;
        console.log('  Joker count:', jokerCount);
    }
}

console.log('\n' + '='.repeat(60));
