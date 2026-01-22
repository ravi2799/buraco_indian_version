/**
 * Comprehensive Test Suite for 3-Card Melds
 * Tests all valid and invalid combinations of 3-card melds
 */

import { validateMeld } from '../MeldValidator.js';

// Helper to create card objects
function card(rank, suit, id) {
    return { id: id || `${rank}-${suit}`, rank, suit };
}

console.log('='.repeat(70));
console.log('3-Card Meld Validation - Comprehensive Test Suite');
console.log('='.repeat(70));

const tests = [];
let testNumber = 0;

function runTest(name, cards, shouldBeValid, expectedType = null) {
    testNumber++;
    const cardStr = cards.map(c => c.rank).join('-');
    const suitStr = cards[0].suit !== 'joker' ? ` (${cards[0].suit})` : '';

    console.log(`\n📌 Test ${testNumber}: ${name}`);
    console.log(`   Cards: ${cardStr}${suitStr}`);

    const result = validateMeld(cards);
    const passed = shouldBeValid ? result.valid : !result.valid;

    if (result.valid && expectedType) {
        const typeMatches = result.type === expectedType;
        if (!typeMatches) {
            console.log(`   ❌ FAIL - Expected type ${expectedType}, got ${result.type}`);
            tests.push({ name, passed: false, reason: `Type mismatch: expected ${expectedType}, got ${result.type}` });
            return false;
        }
    }

    if (passed) {
        console.log(`   ✅ PASS ${result.valid ? `- ${result.type}${result.isClean ? ' (clean)' : ' (dirty)'}` : ''}`);
    } else {
        console.log(`   ❌ FAIL - ${shouldBeValid ? 'Should be valid' : 'Should be invalid'}`);
        if (result.reason) console.log(`   Reason: ${result.reason}`);
    }

    tests.push({ name, passed, reason: !passed ? (shouldBeValid ? result.reason : 'Should be invalid') : null });
    return passed;
}

console.log('\n' + '─'.repeat(70));
console.log('VALID SEQUENCES (Clean - No Joker)');
console.log('─'.repeat(70));

// Consecutive sequences - low cards
runTest('A-2-3 sequence', [
    card('A', 'hearts'),
    card('2', 'hearts'),
    card('3', 'hearts')
], true, 'sequence');

runTest('3-4-5 sequence', [
    card('3', 'diamonds'),
    card('4', 'diamonds'),
    card('5', 'diamonds')
], true, 'sequence');

runTest('7-8-9 sequence', [
    card('7', 'clubs'),
    card('8', 'clubs'),
    card('9', 'clubs')
], true, 'sequence');

// Consecutive sequences - face cards
runTest('J-Q-K sequence', [
    card('J', 'spades'),
    card('Q', 'spades'),
    card('K', 'spades')
], true, 'sequence');

runTest('Q-K-A sequence (A high)', [
    card('Q', 'hearts'),
    card('K', 'hearts'),
    card('A', 'hearts')
], true, 'sequence');

runTest('10-J-Q sequence', [
    card('10', 'diamonds'),
    card('J', 'diamonds'),
    card('Q', 'diamonds')
], true, 'sequence');

console.log('\n' + '─'.repeat(70));
console.log('VALID SEQUENCES (Dirty - With Joker)');
console.log('─'.repeat(70));

// Joker filling single gaps
runTest('A-JOKER-3 (Joker as 2)', [
    card('A', 'hearts'),
    card('JOKER', 'joker'),
    card('3', 'hearts')
], true, 'sequence');

runTest('J-JOKER-K (Joker as Q)', [
    card('J', 'spades'),
    card('JOKER', 'joker'),
    card('K', 'spades')
], true, 'sequence');

runTest('5-JOKER-7 (Joker as 6)', [
    card('5', 'diamonds'),
    card('JOKER', 'joker'),
    card('7', 'diamonds')
], true, 'sequence');

runTest('9-JOKER-J (Joker as 10)', [
    card('9', 'clubs'),
    card('JOKER', 'joker'),
    card('J', 'clubs')
], true, 'sequence');

runTest('Q-JOKER-A (Joker as K)', [
    card('Q', 'hearts'),
    card('JOKER', 'joker'),
    card('A', 'hearts')
], true, 'sequence');

console.log('\n' + '─'.repeat(70));
console.log('VALID SETS (Clean - Same Rank, No Joker)');
console.log('─'.repeat(70));

runTest('A-A-A set', [
    card('A', 'hearts'),
    card('A', 'diamonds'),
    card('A', 'clubs')
], true, 'set');

runTest('Q-Q-Q set', [
    card('Q', 'hearts'),
    card('Q', 'diamonds'),
    card('Q', 'clubs')
], true, 'set');

runTest('5-5-5 set', [
    card('5', 'hearts'),
    card('5', 'spades'),
    card('5', 'diamonds')
], true, 'set');

runTest('K-K-K set', [
    card('K', 'clubs'),
    card('K', 'hearts'),
    card('K', 'diamonds')
], true, 'set');

console.log('\n' + '─'.repeat(70));
console.log('VALID SETS (Dirty - With Joker)');
console.log('─'.repeat(70));

runTest('Q-Q-JOKER set', [
    card('Q', 'hearts'),
    card('Q', 'diamonds'),
    card('JOKER', 'joker')
], true, 'set');

runTest('A-A-JOKER set', [
    card('A', 'hearts'),
    card('A', 'clubs'),
    card('JOKER', 'joker')
], true, 'set');

runTest('7-JOKER-7 set', [
    card('7', 'hearts'),
    card('JOKER', 'joker'),
    card('7', 'spades')
], true, 'set');

console.log('\n' + '─'.repeat(70));
console.log('VALID SEQUENCES (Ace High with Joker)');
console.log('─'.repeat(70));

// A-JOKER-Q is valid: Q(11)-K(JOKER)-A(13) has gap of 1
runTest('A-JOKER-Q (Joker as K, Ace high)', [
    card('A', 'hearts'),
    card('JOKER', 'joker'),
    card('Q', 'hearts')
], true, 'sequence');

console.log('\n' + '─'.repeat(70));
console.log('INVALID MELDS - Non-Consecutive Sequences');
console.log('─'.repeat(70));

runTest('A-3-5 (not consecutive)', [
    card('A', 'hearts'),
    card('3', 'hearts'),
    card('5', 'hearts')
], false);

runTest('2-5-8 (gaps too large)', [
    card('2', 'diamonds'),
    card('5', 'diamonds'),
    card('8', 'diamonds')
], false);

runTest('J-JOKER-A (gap too large)', [
    card('J', 'hearts'),
    card('JOKER', 'joker'),
    card('A', 'hearts')
], false);

runTest('3-JOKER-6 (gap of 2, need 2 cards)', [
    card('3', 'clubs'),
    card('JOKER', 'joker'),
    card('6', 'clubs')
], false);

console.log('\n' + '─'.repeat(70));
console.log('INVALID MELDS - Wrong Suit');
console.log('─'.repeat(70));

runTest('A-2-3 mixed suits', [
    card('A', 'hearts'),
    card('2', 'diamonds'),
    card('3', 'hearts')
], false);

runTest('J-Q-K mixed suits', [
    card('J', 'spades'),
    card('Q', 'hearts'),
    card('K', 'spades')
], false);

runTest('5-JOKER-7 wrong suit', [
    card('5', 'hearts'),
    card('JOKER', 'joker'),
    card('7', 'diamonds')
], false);

console.log('\n' + '─'.repeat(70));
console.log('VALID SEQUENCES (Ace High)');
console.log('─'.repeat(70));

runTest('A-Q-K sequence (Q-K-A, Ace high)', [
    card('A', 'hearts'),
    card('Q', 'hearts'),
    card('K', 'hearts')
], true, 'sequence');

console.log('\n' + '─'.repeat(70));
console.log('INVALID MELDS - Mixed Ranks (Not Set or Sequence)');
console.log('─'.repeat(70));

runTest('2-7-J (random ranks)', [
    card('2', 'spades'),
    card('7', 'spades'),
    card('J', 'spades')
], false);

runTest('A-5-9 (random ranks)', [
    card('A', 'clubs'),
    card('5', 'clubs'),
    card('9', 'clubs')
], false);

console.log('\n' + '─'.repeat(70));
console.log('EDGE CASES');
console.log('─'.repeat(70));

runTest('K-A-2 wrap-around (invalid - A cannot be both high and low)', [
    card('K', 'hearts'),
    card('A', 'hearts'),
    card('2', 'hearts')
], false);

runTest('Two aces in different positions', [
    card('A', 'hearts'),
    card('A', 'diamonds'),
    card('2', 'hearts')
], false);

// ============================================================
// Summary
// ============================================================
console.log('\n' + '='.repeat(70));
console.log('Test Summary');
console.log('='.repeat(70));

let passed = 0;
let failed = 0;

tests.forEach((test, idx) => {
    const status = test.passed ? '✅ PASS' : '❌ FAIL';
    if (!test.passed) {
        console.log(`Test ${idx + 1}: ${status} - ${test.name}`);
        if (test.reason) {
            console.log(`         Reason: ${test.reason}`);
        }
    }

    if (test.passed) {
        passed++;
    } else {
        failed++;
    }
});

console.log('\n' + '='.repeat(70));
console.log(`Total: ${tests.length} tests | Passed: ${passed} | Failed: ${failed}`);
console.log('='.repeat(70));

if (failed === 0) {
    console.log('\n🎉 All tests passed! 3-card meld validation works correctly.');
} else {
    console.log(`\n⚠️  ${failed} test(s) failed. Please review the implementation.`);
    process.exit(1);
}
