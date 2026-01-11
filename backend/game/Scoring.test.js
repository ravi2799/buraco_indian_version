/**
 * Test cases for Scoring.js - Same Rank Burraco
 */

import { calculateMeldScore } from './Scoring.js';

// Helper to create card objects
const card = (rank, suit = 'HEARTS') => ({ rank, suit });
const wild = () => ({ rank: 'WILD', suit: 'JOKER' });

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
