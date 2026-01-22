/**
 * Comprehensive Test Suite for MeldValidator
 * Tests wild card (JOKER) repositioning and sequence extension
 */

import { canExtendMeld, validateMeld, sortSequenceMeld } from '../MeldValidator.js';

// Helper to create card objects
function card(rank, suit, id) {
    return { id: id || `${rank}-${suit}`, rank, suit };
}

console.log('='.repeat(60));
console.log('MeldValidator - Comprehensive Test Suite');
console.log('='.repeat(60));

const tests = [];
let testNumber = 0;

function runTest(name, testFn) {
    testNumber++;
    console.log(`\n📌 Test ${testNumber}: ${name}`);
    const result = testFn();
    tests.push({ name, ...result });

    if (result.passed) {
        console.log(`   ✅ PASS`);
    } else {
        console.log(`   ❌ FAIL - ${result.reason}`);
    }

    return result.passed;
}

// ============================================================
// Test 1: Add Ace to J-Q-K-JOKER
// ============================================================
runTest('Add Ace to J-Q-K-JOKER sequence', () => {
    const existing = [
        card('J', 'hearts', 'J-h'),
        card('Q', 'hearts', 'Q-h'),
        card('K', 'hearts', 'K-h'),
        card('JOKER', 'joker', 'joker-1')
    ];
    const newCards = [card('A', 'hearts', 'A-h')];
    const meldInfo = { type: 'sequence', suit: 'hearts', isClean: false };

    const result = canExtendMeld(existing, newCards, meldInfo);
    const combined = [...existing, ...newCards];
    const sorted = sortSequenceMeld(combined, 'hearts');

    console.log(`   Result: ${result.valid ? 'VALID' : 'INVALID'}`);
    console.log(`   Sorted: ${sorted.map(c => c.rank).join(' ')}`);

    const expected = 'JOKER J Q K A';
    const actual = sorted.map(c => c.rank).join(' ');

    return {
        passed: result.valid && actual === expected,
        reason: !result.valid ? 'Should be valid' : actual !== expected ? `Expected ${expected}, got ${actual}` : null
    };
});

// ============================================================
// Test 2: Add 10 to J-Q-K-JOKER
// ============================================================
runTest('Add 10 to J-Q-K-JOKER sequence', () => {
    const existing = [
        card('J', 'diamonds', 'J-d'),
        card('Q', 'diamonds', 'Q-d'),
        card('K', 'diamonds', 'K-d'),
        card('JOKER', 'joker', 'joker-2')
    ];
    const newCards = [card('10', 'diamonds', '10-d')];
    const meldInfo = { type: 'sequence', suit: 'diamonds', isClean: false };

    const result = canExtendMeld(existing, newCards, meldInfo);
    const combined = [...existing, ...newCards];
    const sorted = sortSequenceMeld(combined, 'diamonds');

    console.log(`   Result: ${result.valid ? 'VALID' : 'INVALID'}`);
    console.log(`   Sorted: ${sorted.map(c => c.rank).join(' ')}`);

    const expected = '10 J Q K JOKER';
    const actual = sorted.map(c => c.rank).join(' ');

    return {
        passed: result.valid && actual === expected,
        reason: !result.valid ? 'Should be valid' : actual !== expected ? `Expected ${expected}, got ${actual}` : null
    };
});

// ============================================================
// Test 3: Add 9 to JOKER-J-Q-K
// ============================================================
runTest('Add 9 to JOKER-J-Q-K sequence', () => {
    const existing = [
        card('JOKER', 'joker', 'joker-3'),
        card('J', 'clubs', 'J-c'),
        card('Q', 'clubs', 'Q-c'),
        card('K', 'clubs', 'K-c')
    ];
    const newCards = [card('9', 'clubs', '9-c')];
    const meldInfo = { type: 'sequence', suit: 'clubs', isClean: false };

    const result = canExtendMeld(existing, newCards, meldInfo);
    const combined = [...existing, ...newCards];
    const sorted = sortSequenceMeld(combined, 'clubs');

    console.log(`   Result: ${result.valid ? 'VALID' : 'INVALID'}`);
    console.log(`   Sorted: ${sorted.map(c => c.rank).join(' ')}`);

    const expected = '9 JOKER J Q K';
    const actual = sorted.map(c => c.rank).join(' ');

    return {
        passed: result.valid && actual === expected,
        reason: !result.valid ? 'Should be valid' : actual !== expected ? `Expected ${expected}, got ${actual}` : null
    };
});

// ============================================================
// Test 4: Add A and 10 to J-Q-K-JOKER (creates near-buraco)
// ============================================================
runTest('Add A and 10 to J-Q-K-JOKER (6 cards)', () => {
    const existing = [
        card('J', 'spades', 'J-s'),
        card('Q', 'spades', 'Q-s'),
        card('K', 'spades', 'K-s'),
        card('JOKER', 'joker', 'joker-4')
    ];
    const newCards = [
        card('10', 'spades', '10-s'),
        card('A', 'spades', 'A-s')
    ];
    const meldInfo = { type: 'sequence', suit: 'spades', isClean: false };

    const result = canExtendMeld(existing, newCards, meldInfo);
    const combined = [...existing, ...newCards];
    const sorted = sortSequenceMeld(combined, 'spades');

    console.log(`   Result: ${result.valid ? 'VALID' : 'INVALID'}`);
    console.log(`   Sorted: ${sorted.map(c => c.rank).join(' ')}`);
    console.log(`   Total: ${combined.length} cards`);

    const expected = 'JOKER 10 J Q K A';
    const actual = sorted.map(c => c.rank).join(' ');

    return {
        passed: result.valid && actual === expected,
        reason: !result.valid ? 'Should be valid' : actual !== expected ? `Expected ${expected}, got ${actual}` : null
    };
});

// ============================================================
// Test 5: Add wrong suit (should fail)
// ============================================================
runTest('Add wrong suit to sequence', () => {
    const existing = [
        card('J', 'hearts', 'J-h'),
        card('Q', 'hearts', 'Q-h'),
        card('K', 'hearts', 'K-h'),
        card('JOKER', 'joker', 'joker-5')
    ];
    const newCards = [card('A', 'diamonds', 'A-d')];
    const meldInfo = { type: 'sequence', suit: 'hearts', isClean: false };

    const result = canExtendMeld(existing, newCards, meldInfo);

    console.log(`   Result: ${result.valid ? 'VALID' : 'INVALID'}`);
    if (!result.valid) console.log(`   Reason: ${result.reason}`);

    return {
        passed: !result.valid,
        reason: result.valid ? 'Should be invalid (wrong suit)' : null
    };
});

// ============================================================
// Test 6: Add to clean sequence
// ============================================================
runTest('Add to clean sequence 3-4-5', () => {
    const existing = [
        card('3', 'hearts', '3-h'),
        card('4', 'hearts', '4-h'),
        card('5', 'hearts', '5-h')
    ];
    const newCards = [card('6', 'hearts', '6-h')];
    const meldInfo = { type: 'sequence', suit: 'hearts', isClean: true };

    const result = canExtendMeld(existing, newCards, meldInfo);
    const combined = [...existing, ...newCards];
    const sorted = sortSequenceMeld(combined, 'hearts');

    console.log(`   Result: ${result.valid ? 'VALID' : 'INVALID'}`);
    console.log(`   Sorted: ${sorted.map(c => c.rank).join(' ')}`);
    console.log(`   Still Clean: ${result.isClean ? 'Yes' : 'No'}`);

    return {
        passed: result.valid && result.isClean,
        reason: !result.valid ? 'Should be valid' : !result.isClean ? 'Should still be clean' : null
    };
});

// ============================================================
// Test 7: Add to set of Queens
// ============================================================
runTest('Add Queen to set of Queens', () => {
    const existing = [
        card('Q', 'hearts', 'Q-h'),
        card('Q', 'diamonds', 'Q-d'),
        card('Q', 'clubs', 'Q-c')
    ];
    const newCards = [card('Q', 'spades', 'Q-s')];
    const meldInfo = { type: 'set', rank: 'Q', isClean: true };

    const result = canExtendMeld(existing, newCards, meldInfo);

    console.log(`   Result: ${result.valid ? 'VALID' : 'INVALID'}`);
    console.log(`   Total: ${existing.length + newCards.length} Queens`);

    return {
        passed: result.valid,
        reason: !result.valid ? 'Should be valid' : null
    };
});

// ============================================================
// Test 8: Gap too large for one JOKER
// ============================================================
runTest('Add card with gap too large for JOKER', () => {
    const existing = [
        card('3', 'hearts', '3-h'),
        card('4', 'hearts', '4-h'),
        card('JOKER', 'joker', 'joker-8')
    ];
    const newCards = [card('8', 'hearts', '8-h')];
    const meldInfo = { type: 'sequence', suit: 'hearts', isClean: false };

    const result = canExtendMeld(existing, newCards, meldInfo);

    console.log(`   Result: ${result.valid ? 'VALID' : 'INVALID'}`);
    if (!result.valid) console.log(`   Reason: ${result.reason}`);

    return {
        passed: !result.valid,
        reason: result.valid ? 'Should be invalid (gap too large)' : null
    };
});

// ============================================================
// Test 9: Add A to 10-J-Q-JOKER (JOKER becomes K)
// ============================================================
runTest('Add A to 10-J-Q-JOKER (JOKER acts as K)', () => {
    const existing = [
        card('10', 'hearts', '10-h'),
        card('J', 'hearts', 'J-h'),
        card('Q', 'hearts', 'Q-h'),
        card('JOKER', 'joker', 'joker-9')
    ];
    const newCards = [card('A', 'hearts', 'A-h')];
    const meldInfo = { type: 'sequence', suit: 'hearts', isClean: false };

    const result = canExtendMeld(existing, newCards, meldInfo);
    const combined = [...existing, ...newCards];
    const sorted = sortSequenceMeld(combined, 'hearts');

    console.log(`   Result: ${result.valid ? 'VALID' : 'INVALID'}`);
    console.log(`   Sorted: ${sorted.map(c => c.rank).join(' ')}`);
    console.log(`   JOKER position: between Q and A (acting as K)`);

    const expected = '10 J Q JOKER A';
    const actual = sorted.map(c => c.rank).join(' ');

    return {
        passed: result.valid && actual === expected,
        reason: !result.valid ? 'Should be valid' : actual !== expected ? `Expected ${expected}, got ${actual}` : null
    };
});

// ============================================================
// Test 10: Add A and 2 to 10-J-Q-JOKER (should fail)
// ============================================================
runTest('Add A and 2 to 10-J-Q-JOKER (gap too large)', () => {
    const existing = [
        card('10', 'hearts', '10-h'),
        card('J', 'hearts', 'J-h'),
        card('Q', 'hearts', 'Q-h'),
        card('JOKER', 'joker', 'joker-10')
    ];
    const newCards = [
        card('A', 'hearts', 'A-h'),
        card('2', 'hearts', '2-h')
    ];
    const meldInfo = { type: 'sequence', suit: 'hearts', isClean: false };

    const result = canExtendMeld(existing, newCards, meldInfo);

    console.log(`   Result: ${result.valid ? 'VALID' : 'INVALID'}`);
    if (!result.valid) console.log(`   Reason: ${result.reason}`);
    console.log(`   Note: Adding 2 makes A low, creating gap of 7 cards (2-10)`);

    return {
        passed: !result.valid,
        reason: result.valid ? 'Should be invalid (gap 2-10 too large)' : null
    };
});

// ============================================================
// Summary
// ============================================================
console.log('\n' + '='.repeat(60));
console.log('Test Summary');
console.log('='.repeat(60));

let passed = 0;
let failed = 0;

tests.forEach((test, idx) => {
    const status = test.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`Test ${idx + 1}: ${status} - ${test.name}`);
    if (test.passed) {
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
