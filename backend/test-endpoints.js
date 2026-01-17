/**
 * API Endpoint Tests for SSE-based Buraco Server
 * Tests all HTTP POST endpoints and SSE connection
 */

const BASE_URL = 'http://localhost:3001';

async function post(endpoint, body = {}) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return res.json();
}

async function get(endpoint) {
    const res = await fetch(`${BASE_URL}${endpoint}`);
    return res.json();
}

async function runTests() {
    console.log('='.repeat(60));
    console.log('BURACO SSE API ENDPOINT TESTS');
    console.log('='.repeat(60));

    let passed = 0;
    let failed = 0;

    function test(name, condition, result) {
        if (condition) {
            console.log(`✅ PASS: ${name}`);
            passed++;
        } else {
            console.log(`❌ FAIL: ${name}`);
            console.log(`   Result: ${JSON.stringify(result)}`);
            failed++;
        }
    }

    try {
        // Test 1: Health Check
        console.log('\n--- Health Check ---');
        const health = await get('/api/health');
        test('Health endpoint returns ok', health.status === 'ok', health);
        test('Transport is SSE', health.transport === 'SSE', health);

        // Test 2: Create Session (Player 1)
        console.log('\n--- Session Creation ---');
        const session1 = await post('/api/session');
        test('Player 1 session created', session1.success === true && session1.playerId, session1);
        const player1Id = session1.playerId;

        // Test 3: Create Session (Player 2)
        const session2 = await post('/api/session');
        test('Player 2 session created', session2.success === true && session2.playerId, session2);
        const player2Id = session2.playerId;

        // Test 4: Create Room (Player 1)
        console.log('\n--- Room Operations ---');
        const createRoom = await post('/api/room/create', {
            playerId: player1Id,
            nickname: 'TestPlayer1',
            maxPlayers: 2,
            avatarId: 1
        });
        test('Room created successfully', createRoom.success === true && createRoom.roomCode, createRoom);
        const roomCode = createRoom.roomCode;

        // Test 5: Create room without session (should fail)
        const invalidRoom = await post('/api/room/create', {
            playerId: 'invalid-id',
            nickname: 'BadPlayer',
            maxPlayers: 2
        });
        test('Invalid session rejected', invalidRoom.success === false, invalidRoom);

        // Test 6: Join Room (Player 2)
        const joinRoom = await post('/api/room/join', {
            playerId: player2Id,
            nickname: 'TestPlayer2',
            roomCode: roomCode,
            avatarId: 2
        });
        test('Player 2 joined room', joinRoom.success === true, joinRoom);

        // Test 7: Join invalid room
        const joinInvalid = await post('/api/room/join', {
            playerId: player2Id,
            nickname: 'BadPlayer',
            roomCode: 'XXX',
            avatarId: 1
        });
        test('Join invalid room rejected', joinInvalid.success === false, joinInvalid);

        // Test 8: Health shows 1 room
        const healthWithRoom = await get('/api/health');
        test('Health shows 1 room', healthWithRoom.rooms === 1, healthWithRoom);

        // Test 9: Start Game (Player 1 is host)
        console.log('\n--- Game Start ---');
        const startGame = await post('/api/game/start', { playerId: player1Id });
        test('Game started by host', startGame.success === true, startGame);

        // Test 10: Non-host cannot start game
        const session3 = await post('/api/session');
        const createRoom2 = await post('/api/room/create', {
            playerId: session3.playerId,
            nickname: 'Host2',
            maxPlayers: 2,
            avatarId: 1
        });
        const session4 = await post('/api/session');
        await post('/api/room/join', {
            playerId: session4.playerId,
            nickname: 'Guest2',
            roomCode: createRoom2.roomCode,
            avatarId: 2
        });
        const nonHostStart = await post('/api/game/start', { playerId: session4.playerId });
        test('Non-host cannot start game', nonHostStart.success === false, nonHostStart);

        // Test 11-15: Game Actions (with the first game)
        console.log('\n--- Game Actions ---');

        // Draw from pile
        const draw = await post('/api/game/draw', { playerId: player1Id });
        test('Draw from pile', draw.success === true || draw.reason, draw);

        // Play meld (will likely fail without proper cards, but tests endpoint)
        const meld = await post('/api/game/meld', { playerId: player1Id, cardIds: ['invalid'] });
        test('Meld endpoint responds', meld.reason !== undefined || meld.success !== undefined, meld);

        // Extend meld
        const extend = await post('/api/game/extend-meld', {
            playerId: player1Id,
            meldId: 'test',
            cardIds: ['invalid']
        });
        test('Extend meld endpoint responds', extend.reason !== undefined || extend.success !== undefined, extend);

        // Discard
        const discard = await post('/api/game/discard', { playerId: player1Id, cardId: 'invalid' });
        test('Discard endpoint responds', discard.reason !== undefined || discard.success !== undefined, discard);

        // Replace wild
        const replaceWild = await post('/api/game/replace-wild', {
            playerId: player1Id,
            meldId: 'test',
            wildCardId: 'wild',
            naturalCardId: 'natural'
        });
        test('Replace wild endpoint responds', replaceWild.reason !== undefined || replaceWild.success !== undefined, replaceWild);

        // Take discard pile
        const takeDiscard = await post('/api/game/take-discard', { playerId: player2Id });
        test('Take discard endpoint responds', takeDiscard.reason !== undefined || takeDiscard.success !== undefined, takeDiscard);

        // Test 16: Swap Team
        console.log('\n--- Team Operations ---');
        const session5 = await post('/api/session');
        const room4p = await post('/api/room/create', {
            playerId: session5.playerId,
            nickname: 'Host4P',
            maxPlayers: 4,
            avatarId: 1
        });
        const swapTeam = await post('/api/room/swap-team', {
            playerId: session5.playerId,
            seat: 0
        });
        test('Swap team endpoint responds', swapTeam.success === true || swapTeam.reason, swapTeam);

    } catch (err) {
        console.log(`\n❌ TEST ERROR: ${err.message}`);
        failed++;
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`RESULTS: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(60));

    process.exit(failed > 0 ? 1 : 0);
}

runTests();
