import { validateMeld } from '../MeldValidator.js';

const card = (rank, suit, id) => ({ id: id || `${rank}-${suit}`, rank, suit });

console.log('Testing: Maximum 1 Joker per meld rule\n');
console.log('='.repeat(50));

// Test 1: Valid - 1 Joker in set
let result = validateMeld([
    card('Q', 'hearts'),
    card('Q', 'diamonds'),
    card('JOKER', 'joker')
]);
console.log('\n1. Q-Q-JOKER (set with 1 joker):');
console.log('   Result:', result.valid ? '✅ VALID' : '❌ INVALID');

// Test 2: Invalid - 2 Jokers in set
result = validateMeld([
    card('Q', 'hearts'),
    card('JOKER', 'joker', 'j1'),
    card('JOKER', 'joker', 'j2')
]);
console.log('\n2. Q-JOKER-JOKER (set with 2 jokers):');
console.log('   Result:', result.valid ? '✅ VALID' : '❌ INVALID');
if (!result.valid) {
    console.log('   Reason:', result.reason);
}

// Test 3: Valid - 1 Joker in sequence
result = validateMeld([
    card('5', 'hearts'),
    card('JOKER', 'joker'),
    card('7', 'hearts')
]);
console.log('\n3. 5-JOKER-7 (sequence with 1 joker):');
console.log('   Result:', result.valid ? '✅ VALID' : '❌ INVALID');

// Test 4: Invalid - 2 Jokers in sequence
result = validateMeld([
    card('5', 'hearts'),
    card('JOKER', 'joker', 'j1'),
    card('JOKER', 'joker', 'j2'),
    card('8', 'hearts')
]);
console.log('\n4. 5-JOKER-JOKER-8 (sequence with 2 jokers):');
console.log('   Result:', result.valid ? '✅ VALID' : '❌ INVALID');
if (!result.valid) {
    console.log('   Reason:', result.reason);
}

// Test 5: Invalid - 3 Jokers
result = validateMeld([
    card('JOKER', 'joker', 'j1'),
    card('JOKER', 'joker', 'j2'),
    card('JOKER', 'joker', 'j3')
]);
console.log('\n5. JOKER-JOKER-JOKER (3 jokers):');
console.log('   Result:', result.valid ? '✅ VALID' : '❌ INVALID');
if (!result.valid) {
    console.log('   Reason:', result.reason);
}

console.log('\n' + '='.repeat(50));
console.log('\n✅ Rule enforced: Maximum 1 Joker per meld');
