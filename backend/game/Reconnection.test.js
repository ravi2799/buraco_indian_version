/**
 * Test cases for player reconnection during active games
 * Run with: node --experimental-vm-modules backend/game/Reconnection.test.js
 */

import Room from './Room.js';

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ ${message}`);
        testsPassed++;
    } else {
        console.log(`  ❌ ${message}`);
        testsFailed++;
    }
}

function describe(name, fn) {
    console.log(`\n📋 ${name}`);
    fn();
}

function test(name, fn) {
    console.log(`\n  🧪 ${name}`);
    try {
        fn();
    } catch (err) {
        console.log(`  ❌ Error: ${err.message}`);
        testsFailed++;
    }
}

// ============================================
// TEST CASES
// ============================================

describe('Player Reconnection', () => {

    test('Player marked as disconnected during active game', () => {
        // Setup: Create room with 2 players and start game
        const room = new Room('socket-host', 'Host', 1, 2);
        room.addPlayer('socket-player2', 'Player2', 2);
        room.startGame();

        assert(room.status === 'playing', 'Game should be in playing status');

        // Player2 disconnects
        room.removePlayer('socket-player2');

        // Check player is marked as disconnected, not removed
        let player2 = null;
        for (const [socketId, player] of room.players) {
            if (player.nickname === 'Player2') {
                player2 = player;
                break;
            }
        }

        assert(player2 !== null, 'Player2 should still exist in room');
        assert(player2.disconnected === true, 'Player2 should be marked as disconnected');
        assert(player2.disconnectedAt !== null, 'Player2 should have disconnectedAt timestamp');
    });

    test('Player can rejoin with same nickname', () => {
        // Setup: Create room with 2 players and start game
        const room = new Room('socket-host', 'Host', 1, 2);
        room.addPlayer('socket-player2', 'Player2', 2);
        room.startGame();

        // Get Player2's original cards
        const originalHand = room.game.hands.get('socket-player2');
        const originalCardCount = originalHand.length;

        // Player2 disconnects
        room.removePlayer('socket-player2');

        // Player2 rejoins with new socket
        const result = room.addPlayer('socket-player2-new', 'Player2', 2);

        assert(result.success === true, 'Rejoin should succeed');
        assert(result.oldSocketId === 'socket-player2', 'Result should contain old socket ID');

        // Check player is reconnected
        const player = room.players.get('socket-player2-new');
        assert(player !== undefined, 'Player should exist with new socket ID');
        assert(player.disconnected === false, 'Player should not be marked as disconnected');
        assert(player.nickname === 'Player2', 'Player nickname should be preserved');
    });

    test('Reconnected player gets same cards', () => {
        // Setup
        const room = new Room('socket-host', 'Host', 1, 2);
        room.addPlayer('socket-player2', 'Player2', 2);
        room.startGame();

        // Get original cards
        const originalHand = [...room.game.hands.get('socket-player2')];
        const originalCardIds = originalHand.map(c => c.id).sort();

        // Disconnect and rejoin
        room.removePlayer('socket-player2');
        room.addPlayer('socket-player2-new', 'Player2', 2);

        // Get cards after rejoin
        const newHand = room.game.hands.get('socket-player2-new');
        const newCardIds = newHand.map(c => c.id).sort();

        assert(newHand !== undefined, 'Player should have a hand after rejoin');
        assert(newHand.length === originalHand.length, `Card count should be same (${originalHand.length})`);
        assert(JSON.stringify(originalCardIds) === JSON.stringify(newCardIds), 'Card IDs should be identical');
    });

    test('Socket ID remapped in GameState', () => {
        // Setup
        const room = new Room('socket-host', 'Host', 1, 2);
        room.addPlayer('socket-player2', 'Player2', 2);
        room.startGame();

        // Disconnect and rejoin
        room.removePlayer('socket-player2');
        room.addPlayer('socket-player2-new', 'Player2', 2);

        // Check GameState has new socket ID
        const playerInGame = room.game.players.find(p => p.nickname === 'Player2');
        assert(playerInGame !== undefined, 'Player should exist in game');
        assert(playerInGame.socketId === 'socket-player2-new', 'Socket ID should be remapped in GameState');

        // Check hands map uses new socket ID
        assert(room.game.hands.has('socket-player2-new'), 'Hands map should have new socket ID');
        assert(!room.game.hands.has('socket-player2'), 'Hands map should not have old socket ID');
    });

    test('Cannot rejoin with wrong nickname', () => {
        // Setup
        const room = new Room('socket-host', 'Host', 1, 2);
        room.addPlayer('socket-player2', 'Player2', 2);
        room.startGame();

        // Player2 disconnects
        room.removePlayer('socket-player2');

        // Try to join with different nickname
        const result = room.addPlayer('socket-new', 'WrongName', 2);

        assert(result.success === false, 'Join with wrong name should fail');
        assert(result.reason.includes('game already in progress'), 'Should get appropriate error message');
    });

    test('Cannot rejoin if already connected', () => {
        // Setup
        const room = new Room('socket-host', 'Host', 1, 2);
        room.addPlayer('socket-player2', 'Player2', 2);
        room.startGame();

        // Don't disconnect - try to join with same nickname
        const result = room.addPlayer('socket-new', 'Player2', 2);

        assert(result.success === false, 'Join while already connected should fail');
        assert(result.reason === 'Player is already connected', 'Should get "already connected" error');
    });

    test('Player removed from waiting room (not game in progress)', () => {
        // Setup: Create room in waiting state
        const room = new Room('socket-host', 'Host', 1, 4);
        room.addPlayer('socket-player2', 'Player2', 2);

        assert(room.players.size === 2, 'Should have 2 players');

        // Player2 leaves waiting room
        room.removePlayer('socket-player2');

        assert(room.players.size === 1, 'Should have 1 player after leaving');

        // Player2 should be actually removed (not just marked disconnected)
        let player2Found = false;
        for (const [, player] of room.players) {
            if (player.nickname === 'Player2') {
                player2Found = true;
            }
        }
        assert(player2Found === false, 'Player2 should be fully removed from waiting room');
    });

    test('Case-insensitive nickname matching for rejoin', () => {
        // Setup
        const room = new Room('socket-host', 'Host', 1, 2);
        room.addPlayer('socket-player2', 'Player2', 2);
        room.startGame();

        // Disconnect
        room.removePlayer('socket-player2');

        // Rejoin with different case
        const result = room.addPlayer('socket-new', 'PLAYER2', 2);

        assert(result.success === true, 'Rejoin with different case should succeed');
    });

    test('Team preserved after reconnection', () => {
        // Setup 4-player game
        const room = new Room('socket-host', 'Host', 1, 4);
        room.addPlayer('socket-p2', 'Player2', 2);
        room.addPlayer('socket-p3', 'Player3', 3);
        room.addPlayer('socket-p4', 'Player4', 4);
        room.startGame();

        // Get original team for Player2
        const originalPlayer = room.players.get('socket-p2');
        const originalTeam = originalPlayer.team;
        const originalSeat = originalPlayer.seat;

        // Disconnect and rejoin
        room.removePlayer('socket-p2');
        room.addPlayer('socket-p2-new', 'Player2', 2);

        // Check team and seat preserved
        const newPlayer = room.players.get('socket-p2-new');
        assert(newPlayer.team === originalTeam, `Team should be preserved (${originalTeam})`);
        assert(newPlayer.seat === originalSeat, `Seat should be preserved (${originalSeat})`);
    });
});

describe('Meld validation still works after reconnection', () => {

    test('Reconnected player can play melds', () => {
        // Setup
        const room = new Room('socket-host', 'Host', 1, 2);
        room.addPlayer('socket-player2', 'Player2', 2);
        room.startGame();

        // Disconnect and rejoin
        room.removePlayer('socket-player2');
        room.addPlayer('socket-player2-new', 'Player2', 2);

        // Check game state is accessible for reconnected player
        const view = room.getPlayerView('socket-player2-new');

        assert(view !== null, 'Player view should be accessible');
        assert(view.hand !== undefined, 'Player should have hand in view');
        assert(view.hand.length > 0, 'Player should have cards');
    });
});

describe('Discard rule enforcement after changes', () => {

    test('Cannot meld all cards - must keep one for discard', () => {
        // Setup
        const room = new Room('socket-host', 'Host', 1, 2);
        room.addPlayer('socket-player2', 'Player2', 2);
        room.startGame();

        const game = room.game;
        const currentPlayerId = game.getCurrentPlayerId();

        // Draw a card first
        game.drawFromPile(currentPlayerId);

        // Get all card IDs in hand
        const hand = game.hands.get(currentPlayerId);
        const allCardIds = hand.map(c => c.id);

        // Try to meld ALL cards (this should fail)
        const result = game.playMeld(currentPlayerId, allCardIds);

        assert(result.success === false, 'Melding all cards should fail');
        assert(result.reason !== undefined, 'Should have error reason: ' + result.reason);
    });
});

// ============================================
// Run tests and print summary
// ============================================

console.log('\n' + '='.repeat(50));
console.log('TEST SUMMARY');
console.log('='.repeat(50));
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log('='.repeat(50));

if (testsFailed > 0) {
    process.exit(1);
}
