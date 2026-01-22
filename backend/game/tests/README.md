# Game Tests

This directory contains all test suites for the game logic modules.

## Test Files

### `meld-validator.test.js`
Comprehensive test suite for MeldValidator with 10 test cases covering:
- JOKER repositioning in sequences
- Ace-high and Ace-low positioning
- Clean vs dirty sequences
- Set validation
- Gap validation with wilds
- Edge cases (wrong suit, gaps too large, etc.)

**Run:** `node backend/game/tests/meld-validator.test.js`

### `Scoring.test.js`
Test suite for the scoring system covering:
- Team score calculation
- Meld scoring (sets, sequences, buracos)
- Clean vs dirty buraco bonuses
- Pozzetto bonuses
- Hand penalties
- Going out bonuses

**Run:** `node backend/game/tests/Scoring.test.js`

### `Reconnection.test.js`
Test suite for player reconnection logic covering:
- Session management
- Reconnection handling
- State persistence
- Player identification

**Run:** `node backend/game/tests/Reconnection.test.js`

## Running All Tests

```bash
# Run all tests
for f in backend/game/tests/*.test.js; do node "$f"; done

# Or run individually
node backend/game/tests/meld-validator.test.js
node backend/game/tests/Scoring.test.js
node backend/game/tests/Reconnection.test.js
```

## Test Coverage Summary

- **MeldValidator**: 10 tests - JOKER repositioning, validation logic
- **Scoring**: Multiple scenarios - point calculation, bonuses
- **Reconnection**: Session handling, state management

