/**
 * Test cases for canExtendMeld - especially wild card repositioning
 */

import { canExtendMeld, validateMeld, sortSequenceMeld } from './MeldValidator.js';

// Helper to create card objects
function card(rank, suit, id) {
    return { id: id || `${rank}-${suit}`, rank, suit };
}

console.log('='.repeat(60));
console.log('Testing canExtendMeld - Wild Card Repositioning');
console.log('='.repeat(60));

// Test 1: Adding Ace to J-Q-K-JOKER
console.log('\n📌 Test 1: Add Ace to J-Q-K-JOKER sequence');
console.log('   Existing: J Q K JOKER (hearts)');
console.log('   Adding: A (hearts)');

const test1Existing = [
    card('J', 'hearts', 'J-h'),
    card('Q', 'hearts', 'Q-h'),
    card('K', 'hearts', 'K-h'),
    card('JOKER', 'joker', 'joker-1')
];

const test1New = [card('A', 'hearts', 'A-h')];

const test1MeldInfo = {
    type: 'sequence',
    suit: 'hearts',
    isClean: false,
    isBurraco: false
};

const test1Result = canExtendMeld(test1Existing, test1New, test1MeldInfo);
console.log(`   Result: ${test1Result.valid ? '✅ VALID' : '❌ INVALID'}`);
if (!test1Result.valid) {
    console.log(`   Reason: ${test1Result.reason}`);
} else {
    // Show how cards would be arranged
    const combined = [...test1Existing, ...test1New];
    const sorted = sortSequenceMeld(combined, 'hearts');
    console.log(`   Sorted order: ${sorted.map(c => c.rank).join(' ')}`);
    console.log(`   Is Buraco: ${test1Result.isBurraco ? 'Yes' : 'No'}`);
}

// Test 2: Adding 10 to J-Q-K-JOKER (should work, JOKER acts as A)
console.log('\n📌 Test 2: Add 10 to J-Q-K-JOKER sequence');
console.log('   Existing: J Q K JOKER (diamonds)');
console.log('   Adding: 10 (diamonds)');

const test2Existing = [
    card('J', 'diamonds', 'J-d'),
    card('Q', 'diamonds', 'Q-d'),
    card('K', 'diamonds', 'K-d'),
    card('JOKER', 'joker', 'joker-2')
];

const test2New = [card('10', 'diamonds', '10-d')];

const test2MeldInfo = {
    type: 'sequence',
    suit: 'diamonds',
    isClean: false,
    isBurraco: false
};

const test2Result = canExtendMeld(test2Existing, test2New, test2MeldInfo);
console.log(`   Result: ${test2Result.valid ? '✅ VALID' : '❌ INVALID'}`);
if (!test2Result.valid) {
    console.log(`   Reason: ${test2Result.reason}`);
} else {
    const combined = [...test2Existing, ...test2New];
    const sorted = sortSequenceMeld(combined, 'diamonds');
    console.log(`   Sorted order: ${sorted.map(c => c.rank).join(' ')}`);
    console.log(`   Is Buraco: ${test2Result.isBurraco ? 'Yes' : 'No'}`);
}

// Test 3: Adding 9 to JOKER-J-Q-K (JOKER acting as 10)
console.log('\n📌 Test 3: Add 9 to JOKER-J-Q-K sequence');
console.log('   Existing: JOKER J Q K (clubs)');
console.log('   Adding: 9 (clubs)');

const test3Existing = [
    card('JOKER', 'joker', 'joker-3'),
    card('J', 'clubs', 'J-c'),
    card('Q', 'clubs', 'Q-c'),
    card('K', 'clubs', 'K-c')
];

const test3New = [card('9', 'clubs', '9-c')];

const test3MeldInfo = {
    type: 'sequence',
    suit: 'clubs',
    isClean: false,
    isBurraco: false
};

const test3Result = canExtendMeld(test3Existing, test3New, test3MeldInfo);
console.log(`   Result: ${test3Result.valid ? '✅ VALID' : '❌ INVALID'}`);
if (!test3Result.valid) {
    console.log(`   Reason: ${test3Result.reason}`);
} else {
    const combined = [...test3Existing, ...test3New];
    const sorted = sortSequenceMeld(combined, 'clubs');
    console.log(`   Sorted order: ${sorted.map(c => c.rank).join(' ')}`);
    console.log(`   Is Buraco: ${test3Result.isBurraco ? 'Yes' : 'No'}`);
}

// Test 4: Adding A and 10 to J-Q-K-JOKER (should create buraco)
console.log('\n📌 Test 4: Add A and 10 to J-Q-K-JOKER sequence');
console.log('   Existing: J Q K JOKER (spades)');
console.log('   Adding: 10 A (spades)');

const test4Existing = [
    card('J', 'spades', 'J-s'),
    card('Q', 'spades', 'Q-s'),
    card('K', 'spades', 'K-s'),
    card('JOKER', 'joker', 'joker-4')
];

const test4New = [
    card('10', 'spades', '10-s'),
    card('A', 'spades', 'A-s')
];

const test4MeldInfo = {
    type: 'sequence',
    suit: 'spades',
    isClean: false,
    isBurraco: false
};

const test4Result = canExtendMeld(test4Existing, test4New, test4MeldInfo);
console.log(`   Result: ${test4Result.valid ? '✅ VALID' : '❌ INVALID'}`);
if (!test4Result.valid) {
    console.log(`   Reason: ${test4Result.reason}`);
} else {
    const combined = [...test4Existing, ...test4New];
    const sorted = sortSequenceMeld(combined, 'spades');
    console.log(`   Sorted order: ${sorted.map(c => c.rank).join(' ')}`);
    console.log(`   Is Buraco: ${test4Result.isBurraco ? 'Yes (7+ cards)' : 'No'} (${combined.length} cards)`);
}

// Test 5: Invalid - adding wrong suit
console.log('\n📌 Test 5: Add wrong suit to sequence (should fail)');
console.log('   Existing: J Q K JOKER (hearts)');
console.log('   Adding: A (diamonds) - WRONG SUIT');

const test5Existing = [
    card('J', 'hearts', 'J-h2'),
    card('Q', 'hearts', 'Q-h2'),
    card('K', 'hearts', 'K-h2'),
    card('JOKER', 'joker', 'joker-5')
];

const test5New = [card('A', 'diamonds', 'A-d2')];

const test5MeldInfo = {
    type: 'sequence',
    suit: 'hearts',
    isClean: false,
    isBurraco: false
};

const test5Result = canExtendMeld(test5Existing, test5New, test5MeldInfo);
console.log(`   Result: ${test5Result.valid ? '✅ VALID' : '❌ INVALID (Expected)'}`);
if (!test5Result.valid) {
    console.log(`   Reason: ${test5Result.reason}`);
}

// Test 6: Adding to clean sequence (no wilds)
console.log('\n📌 Test 6: Add to clean sequence 3-4-5');
console.log('   Existing: 3 4 5 (hearts)');
console.log('   Adding: 6 (hearts)');

const test6Existing = [
    card('3', 'hearts', '3-h'),
    card('4', 'hearts', '4-h'),
    card('5', 'hearts', '5-h')
];

const test6New = [card('6', 'hearts', '6-h')];

const test6MeldInfo = {
    type: 'sequence',
    suit: 'hearts',
    isClean: true,
    isBurraco: false
};

const test6Result = canExtendMeld(test6Existing, test6New, test6MeldInfo);
console.log(`   Result: ${test6Result.valid ? '✅ VALID' : '❌ INVALID'}`);
if (!test6Result.valid) {
    console.log(`   Reason: ${test6Result.reason}`);
} else {
    const combined = [...test6Existing, ...test6New];
    const sorted = sortSequenceMeld(combined, 'hearts');
    console.log(`   Sorted order: ${sorted.map(c => c.rank).join(' ')}`);
    console.log(`   Still Clean: ${test6Result.isClean ? 'Yes' : 'No'}`);
}

// Test 7: Set extension
console.log('\n📌 Test 7: Add to set of Queens');
console.log('   Existing: Q Q Q (mixed suits)');
console.log('   Adding: Q (different suit)');

const test7Existing = [
    card('Q', 'hearts', 'Q-h3'),
    card('Q', 'diamonds', 'Q-d3'),
    card('Q', 'clubs', 'Q-c3')
];

const test7New = [card('Q', 'spades', 'Q-s3')];

const test7MeldInfo = {
    type: 'set',
    rank: 'Q',
    isClean: true,
    isBurraco: false
};

const test7Result = canExtendMeld(test7Existing, test7New, test7MeldInfo);
console.log(`   Result: ${test7Result.valid ? '✅ VALID' : '❌ INVALID'}`);
if (!test7Result.valid) {
    console.log(`   Reason: ${test7Result.reason}`);
} else {
    console.log(`   Total cards: ${test7Existing.length + test7New.length}`);
}

// Test 8: Gap that JOKER can't fill (too far)
console.log('\n📌 Test 8: Add card with gap too large for one JOKER');
console.log('   Existing: 3 4 JOKER (hearts) - JOKER acting as 5');
console.log('   Adding: 8 (hearts) - Gap of 2 between JOKER and 8');

const test8Existing = [
    card('3', 'hearts', '3-h2'),
    card('4', 'hearts', '4-h2'),
    card('JOKER', 'joker', 'joker-8')
];

const test8New = [card('8', 'hearts', '8-h')];

const test8MeldInfo = {
    type: 'sequence',
    suit: 'hearts',
    isClean: false,
    isBurraco: false
};

const test8Result = canExtendMeld(test8Existing, test8New, test8MeldInfo);
console.log(`   Result: ${test8Result.valid ? '✅ VALID' : '❌ INVALID (Expected)'}`);
if (!test8Result.valid) {
    console.log(`   Reason: ${test8Result.reason}`);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('Test Summary');
console.log('='.repeat(60));

const tests = [
    { name: 'Add A to J-Q-K-JOKER', result: test1Result.valid, expected: true },
    { name: 'Add 10 to J-Q-K-JOKER', result: test2Result.valid, expected: true },
    { name: 'Add 9 to JOKER-J-Q-K', result: test3Result.valid, expected: true },
    { name: 'Add A+10 to J-Q-K-JOKER (buraco)', result: test4Result.valid, expected: true },
    { name: 'Add wrong suit', result: test5Result.valid, expected: false },
    { name: 'Add to clean sequence', result: test6Result.valid, expected: true },
    { name: 'Add to set', result: test7Result.valid, expected: true },
    { name: 'Gap too large for JOKER', result: test8Result.valid, expected: false }
];

let passed = 0;
let failed = 0;

tests.forEach((test, idx) => {
    const status = test.result === test.expected ? '✅ PASS' : '❌ FAIL';
    console.log(`Test ${idx + 1}: ${status} - ${test.name}`);
    if (test.result === test.expected) {
        passed++;
    } else {
        failed++;
    }
});

console.log('\n' + '='.repeat(60));
console.log(`Total: ${tests.length} tests | Passed: ${passed} | Failed: ${failed}`);
console.log('='.repeat(60));

if (failed === 0) {
    console.log('\n🎉 All tests passed! Wild card repositioning works correctly.');
} else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
    process.exit(1);
}
