/**
 * Test cases for Scoring.js - Same Rank Burraco
 */

import { calculateMeldScore, calculateTeamScore } from './Scoring.js';

// Card point values (matching Deck.js)
const CARD_VALUES = {
    'JOKER': 10, 'WILD': 10, 'A': 10, 'K': 10, 'Q': 10, 'J': 10, '10': 10,
    '9': 5, '8': 5, '7': 5, '6': 5, '5': 5, '4': 5, '3': 5, '2': 5
};

// Helper to create card objects with value
const card = (rank, suit = 'HEARTS') => ({ rank, suit, value: CARD_VALUES[rank] || 5 });
const wild = () => ({ rank: 'WILD', suit: 'JOKER', value: 10 });

// Test Cases
const testCases = [
    {
        name: 'Same Rank Burraco - All 3s (3333333)',
        meld: {
            cards: [card('3'), card('3'), card('3'), card('3'), card('3'), card('3'), card('3')],
            isBurraco: true,
            isClean: true
        },
        expectedBonus: 100,  // SAME_RANK_BURRACO
        expectedType: 'sameRankBurracos'
    },
    {
        name: 'Same Rank Burraco with Joker - 3333JOKER33',
        meld: {
            cards: [card('3'), card('3'), card('3'), card('3'), wild(), card('3'), card('3')],
            isBurraco: true,
            isClean: false
        },
        expectedBonus: 100,  // SAME_RANK_BURRACO (wild cards ignored)
        expectedType: 'sameRankBurracos'
    },
    {
        name: 'Clean Burraco - Sequential (3456789)',
        meld: {
            cards: [card('3'), card('4'), card('5'), card('6'), card('7'), card('8'), card('9')],
            isBurraco: true,
            isClean: true
        },
        expectedBonus: 200,  // CLEAN_BURRACO
        expectedType: 'cleanBurracos'
    },
    {
        name: 'Dirty Burraco - Sequential with Wild',
        meld: {
            cards: [card('3'), card('4'), wild(), card('6'), card('7'), card('8'), card('9')],
            isBurraco: true,
            isClean: false
        },
        expectedBonus: 200,  // DIRTY_BURRACO
        expectedType: 'dirtyBurracos'
    },
    {
        name: 'Same Rank Burraco - All 7s (7777777)',
        meld: {
            cards: [card('7'), card('7'), card('7'), card('7'), card('7'), card('7'), card('7')],
            isBurraco: true,
            isClean: true
        },
        expectedBonus: 100,  // SAME_RANK_BURRACO
        expectedType: 'sameRankBurracos'
    },
    {
        name: 'Same Rank Burraco - All 2s (2222222)',
        meld: {
            cards: [card('2'), card('2'), card('2'), card('2'), card('2'), card('2'), card('2')],
            isBurraco: true,
            isClean: true
        },
        expectedBonus: 100,  // SAME_RANK_BURRACO (2s allowed per user change)
        expectedType: 'sameRankBurracos'
    }
];

// Multiple Burraco Test Cases (2, 3, 4 burracos)
const multipleBurracoTests = [
    {
        name: '2 Burracos - Same Rank + Clean',
        melds: [
            { cards: [card('3'), card('3'), card('3'), card('3'), card('3'), card('3'), card('3')], isBurraco: true, isClean: true },
            { cards: [card('4'), card('5'), card('6'), card('7'), card('8'), card('9'), card('10')], isBurraco: true, isClean: true }
        ],
        expected: { sameRankBurracos: 1, cleanBurracos: 1, dirtyBurracos: 0 }
    },
    {
        name: '3 Burracos - Same Rank + Clean + Dirty',
        melds: [
            { cards: [card('7'), card('7'), card('7'), card('7'), card('7'), card('7'), card('7')], isBurraco: true, isClean: true },
            { cards: [card('3'), card('4'), card('5'), card('6'), card('7'), card('8'), card('9')], isBurraco: true, isClean: true },
            { cards: [card('A'), card('2'), wild(), card('4'), card('5'), card('6'), card('7')], isBurraco: true, isClean: false }
        ],
        expected: { sameRankBurracos: 1, cleanBurracos: 1, dirtyBurracos: 1 }
    },
    {
        name: '4 Burracos - 2 Same Rank + 1 Clean + 1 Dirty',
        melds: [
            { cards: [card('3'), card('3'), card('3'), card('3'), card('3'), card('3'), card('3')], isBurraco: true, isClean: true },
            { cards: [card('K'), card('K'), card('K'), card('K'), card('K'), card('K'), card('K')], isBurraco: true, isClean: true },
            { cards: [card('4'), card('5'), card('6'), card('7'), card('8'), card('9'), card('10')], isBurraco: true, isClean: true },
            { cards: [card('A'), wild(), card('3'), card('4'), card('5'), card('6'), card('7')], isBurraco: true, isClean: false }
        ],
        expected: { sameRankBurracos: 2, cleanBurracos: 1, dirtyBurracos: 1 }
    },
    {
        name: '3 Burracos - Same Rank with Joker + Clean + Dirty',
        melds: [
            { cards: [card('5'), card('5'), card('5'), wild(), card('5'), card('5'), card('5')], isBurraco: true, isClean: false },
            { cards: [card('8'), card('9'), card('10'), card('J'), card('Q'), card('K'), card('A')], isBurraco: true, isClean: true },
            { cards: [card('3'), wild(), card('5'), card('6'), card('7'), card('8'), card('9')], isBurraco: true, isClean: false }
        ],
        expected: { sameRankBurracos: 1, cleanBurracos: 1, dirtyBurracos: 1 }
    }
];

// Run tests
console.log('='.repeat(60));
console.log('SCORING TEST CASES - Same Rank Burraco');
console.log('='.repeat(60));

testCases.forEach((test, index) => {
    const result = calculateMeldScore([test.meld]);
    
    console.log(`\nTest ${index + 1}: ${test.name}`);
    console.log(`  Cards: ${test.meld.cards.map(c => c.rank).join(', ')}`);
    console.log(`  Expected Type: ${test.expectedType}`);
    console.log(`  Result:`);
    console.log(`    - cleanBurracos: ${result.cleanBurracos}`);
    console.log(`    - dirtyBurracos: ${result.dirtyBurracos}`);
    console.log(`    - sameRankBurracos: ${result.sameRankBurracos}`);
    
    const passed = result[test.expectedType] === 1;
    console.log(`  Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
});

console.log('\n' + '='.repeat(60));

// Run multiple burraco tests
console.log('\n' + '='.repeat(60));
console.log('MULTIPLE BURRACO TEST CASES (2, 3, 4 burracos)');
console.log('='.repeat(60));

multipleBurracoTests.forEach((test, index) => {
    const result = calculateMeldScore(test.melds);
    
    console.log(`\nTest ${index + 1}: ${test.name}`);
    test.melds.forEach((meld, i) => {
        console.log(`  Meld ${i + 1}: ${meld.cards.map(c => c.rank).join(', ')}`);
    });
    console.log(`  Expected: sameRank=${test.expected.sameRankBurracos}, clean=${test.expected.cleanBurracos}, dirty=${test.expected.dirtyBurracos}`);
    console.log(`  Result:   sameRank=${result.sameRankBurracos}, clean=${result.cleanBurracos}, dirty=${result.dirtyBurracos}`);
    
    const passed = 
        result.sameRankBurracos === test.expected.sameRankBurracos &&
        result.cleanBurracos === test.expected.cleanBurracos &&
        result.dirtyBurracos === test.expected.dirtyBurracos;
    console.log(`  Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
});

console.log('\n' + '='.repeat(60));

// ============================================================
// TEAM SCORE TEST CASE - Team A
// ============================================================

console.log('\n' + '='.repeat(60));
console.log('TEAM A FULL SCORE TEST');
console.log('='.repeat(60));

const teamAMelds = [
    { cards: [card('3'), card('3'), card('3'), card('3')], isBurraco: false, isClean: false },
    { cards: [card('4'), card('4'), card('4'), card('4'), card('4'), wild()], isBurraco: false, isClean: false },
    { cards: [card('5'), card('5'), card('5'), card('5'), card('5'), card('5'), card('5')], isBurraco: true, isClean: true },
    { cards: [card('A'), card('2'), card('3'), card('4'), card('5'), card('6'), card('7')], isBurraco: true, isClean: true },
    { cards: [card('3'), card('4'), wild(), card('6'), card('7'), card('8'), card('9')], isBurraco: true, isClean: false }
];

const teamA = { melds: teamAMelds, hands: [[], []], pozzettoCount: 2, wentOut: true };
const teamAResult = calculateTeamScore(teamA);

console.log('\nTeam A Melds:');
console.log('  1. 3333 (regular meld)');
console.log('  2. 44444JOKER (regular meld)');
console.log('  3. 5555555 (Same Rank Burraco)');
console.log('  4. A234567 (Clean Burraco)');
console.log('  5. 34JOKER6789 (Dirty Burraco)');
console.log('\nPozzetti: 2, Went out: Yes');

console.log('\n--- BREAKDOWN ---');
console.log(`Regular Meld Points: ${teamAResult.regularMeldPoints}`);
console.log(`Same Rank Burracos: ${teamAResult.sameRankBurracos} × 100 = ${teamAResult.sameRankBurracos * 100}`);
console.log(`Clean Burracos: ${teamAResult.cleanBurracos} × 200 = ${teamAResult.cleanBurracos * 200}`);
console.log(`Dirty Burracos: ${teamAResult.dirtyBurracos} × 200 = ${teamAResult.dirtyBurracos * 200}`);
console.log(`Going Out Bonus: ${teamAResult.wentOutBonus}`);
console.log(`Pozzetto Bonus: ${teamAResult.pozzettoBonus}`);
console.log(`Hand Penalty: ${teamAResult.handPenalty}`);
console.log(`\n*** TOTAL: ${teamAResult.totalScore} ***`);

// ============================================================
// TEST CASE 2 - Team with only regular melds (no burracos)
// ============================================================
console.log('\n' + '='.repeat(60));
console.log('TEST 2: Only Regular Melds (No Burracos)');
console.log('='.repeat(60));

const test2Melds = [
    { cards: [card('3'), card('3'), card('3')], isBurraco: false, isClean: false },
    { cards: [card('7'), card('7'), card('7'), card('7')], isBurraco: false, isClean: false },
    { cards: [card('K'), card('K'), card('K'), card('K'), card('K')], isBurraco: false, isClean: false }
];

const test2 = { melds: test2Melds, hands: [[], []], pozzettoCount: 1, wentOut: true };
const test2Result = calculateTeamScore(test2);

console.log('\nMelds: 333, 7777, KKKKK');
console.log('Pozzetti: 1, Went out: Yes');
console.log('\n--- BREAKDOWN ---');
console.log(`Regular Meld Points: ${test2Result.regularMeldPoints} (expected: 3×5 + 4×5 + 5×10 = 85)`);
console.log(`Same Rank Burracos: ${test2Result.sameRankBurracos}`);
console.log(`Clean Burracos: ${test2Result.cleanBurracos}`);
console.log(`Dirty Burracos: ${test2Result.dirtyBurracos}`);
console.log(`Going Out Bonus: ${test2Result.wentOutBonus}`);
console.log(`Pozzetto Bonus: ${test2Result.pozzettoBonus}`);
console.log(`*** TOTAL: ${test2Result.totalScore} (expected: 85 + 50 + 50 = 185) ***`);

// ============================================================
// TEST CASE 3 - Team with hand penalty (didn't finish)
// ============================================================
console.log('\n' + '='.repeat(60));
console.log('TEST 3: With Hand Penalty (Cards Left)');
console.log('='.repeat(60));

const test3Melds = [
    { cards: [card('A'), card('A'), card('A'), card('A'), card('A'), card('A'), card('A')], isBurraco: true, isClean: true }
];
const test3Hands = [
    [card('K'), card('Q'), card('J')],  // Player 1: 30 points in hand
    [card('3'), card('4')]               // Player 2: 10 points in hand
];

const test3 = { melds: test3Melds, hands: test3Hands, pozzettoCount: 0, wentOut: false };
const test3Result = calculateTeamScore(test3);

console.log('\nMelds: AAAAAAA (Same Rank Burraco)');
console.log('Hands: K,Q,J (30) + 3,4 (10) = 40 penalty');
console.log('Pozzetti: 0, Went out: No');
console.log('\n--- BREAKDOWN ---');
console.log(`Regular Meld Points: ${test3Result.regularMeldPoints}`);
console.log(`Same Rank Burracos: ${test3Result.sameRankBurracos} × 100 = ${test3Result.sameRankBurracos * 100}`);
console.log(`Hand Penalty: ${test3Result.handPenalty} (expected: -40)`);
console.log(`*** TOTAL: ${test3Result.totalScore} (expected: 100 - 40 = 60) ***`);

// ============================================================
// TEST CASE 4 - All three burraco types
// ============================================================
console.log('\n' + '='.repeat(60));
console.log('TEST 4: All Three Burraco Types');
console.log('='.repeat(60));

const test4Melds = [
    { cards: [card('9'), card('9'), card('9'), card('9'), card('9'), card('9'), card('9')], isBurraco: true, isClean: true },
    { cards: [card('3'), card('4'), card('5'), card('6'), card('7'), card('8'), card('9')], isBurraco: true, isClean: true },
    { cards: [card('A'), card('2'), wild(), card('4'), card('5'), card('6'), card('7')], isBurraco: true, isClean: false }
];

const test4 = { melds: test4Melds, hands: [[], []], pozzettoCount: 2, wentOut: true };
const test4Result = calculateTeamScore(test4);

console.log('\nMelds:');
console.log('  1. 9999999 (Same Rank Burraco)');
console.log('  2. 3456789 (Clean Burraco)');
console.log('  3. A2W4567 (Dirty Burraco)');
console.log('Pozzetti: 2, Went out: Yes');
console.log('\n--- BREAKDOWN ---');
console.log(`Regular Meld Points: ${test4Result.regularMeldPoints} (expected: 0)`);
console.log(`Same Rank Burracos: ${test4Result.sameRankBurracos} × 100 = ${test4Result.sameRankBurracos * 100}`);
console.log(`Clean Burracos: ${test4Result.cleanBurracos} × 200 = ${test4Result.cleanBurracos * 200}`);
console.log(`Dirty Burracos: ${test4Result.dirtyBurracos} × 200 = ${test4Result.dirtyBurracos * 200}`);
console.log(`Going Out: ${test4Result.wentOutBonus}`);
console.log(`Pozzetto: ${test4Result.pozzettoBonus}`);
console.log(`*** TOTAL: ${test4Result.totalScore} (expected: 100+200+200+50+100 = 650) ***`);

// ============================================================
// TEST CASE 5 - Mixed melds + heavy hand penalty
// ============================================================
console.log('\n' + '='.repeat(60));
console.log('TEST 5: Mixed Melds + Heavy Hand Penalty');
console.log('='.repeat(60));

const test5Melds = [
    { cards: [card('5'), card('5'), card('5'), card('5')], isBurraco: false, isClean: false },
    { cards: [card('J'), card('J'), card('J'), card('J'), card('J'), card('J'), card('J')], isBurraco: true, isClean: true }
];
const test5Hands = [
    [card('A'), card('A'), card('K'), card('K'), card('Q'), card('Q')],  // 60 points
    [card('10'), card('10'), card('10')]  // 30 points
];

const test5 = { melds: test5Melds, hands: test5Hands, pozzettoCount: 0, wentOut: false };
const test5Result = calculateTeamScore(test5);

console.log('\nMelds: 5555 (regular), JJJJJJJ (Same Rank Burraco)');
console.log('Hands: A,A,K,K,Q,Q (60) + 10,10,10 (30) = 90 penalty');
console.log('Pozzetti: 0, Went out: No');
console.log('\n--- BREAKDOWN ---');
console.log(`Regular Meld Points: ${test5Result.regularMeldPoints} (expected: 4×5 = 20)`);
console.log(`Same Rank Burracos: ${test5Result.sameRankBurracos} × 100 = ${test5Result.sameRankBurracos * 100}`);
console.log(`Hand Penalty: ${test5Result.handPenalty} (expected: -90)`);
console.log(`*** TOTAL: ${test5Result.totalScore} (expected: 20 + 100 - 90 = 30) ***`);

// ============================================================
// TEST CASE 6 - Same Rank Burraco with Wild
// ============================================================
console.log('\n' + '='.repeat(60));
console.log('TEST 6: Same Rank Burraco with Wild Card');
console.log('='.repeat(60));

const test6Melds = [
    { cards: [card('8'), card('8'), card('8'), wild(), card('8'), card('8'), card('8')], isBurraco: true, isClean: false },
    { cards: [card('6'), card('6'), card('6')], isBurraco: false, isClean: false }
];

const test6 = { melds: test6Melds, hands: [[], []], pozzettoCount: 1, wentOut: true };
const test6Result = calculateTeamScore(test6);

console.log('\nMelds: 888W888 (Same Rank Burraco with Wild), 666 (regular)');
console.log('Pozzetti: 1, Went out: Yes');
console.log('\n--- BREAKDOWN ---');
console.log(`Regular Meld Points: ${test6Result.regularMeldPoints} (expected: 3×5 = 15)`);
console.log(`Same Rank Burracos: ${test6Result.sameRankBurracos} × 100 = ${test6Result.sameRankBurracos * 100}`);
console.log(`Going Out: ${test6Result.wentOutBonus}`);
console.log(`Pozzetto: ${test6Result.pozzettoBonus}`);
console.log(`*** TOTAL: ${test6Result.totalScore} (expected: 15 + 100 + 50 + 50 = 215) ***`);

console.log('\n' + '='.repeat(60));
console.log('ALL TESTS COMPLETE');
console.log('='.repeat(60));
