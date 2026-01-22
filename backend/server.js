/**
 * Buraco Multiplayer Server
 * Express + SSE for real-time game communication
 * Uses HTTP POST for actions and Server-Sent Events for updates
 */

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import Room from './game/Room.js';
import {
    createSession,
    getSession,
    joinRoom as sessionJoinRoom,
    leaveRoom as sessionLeaveRoom,
    getPlayerRoom,
    setSseResponse,
    removeSseResponse,
    sendToPlayer,
    broadcastToRoom,
    getPlayersInRoom,
    removeSession,
    cleanupStaleSessions
} from './game/playerSessions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// CORS configuration
app.use(cors());
app.use(express.json());

// Room storage (in-memory)
const rooms = new Map(); // roomCode -> Room instance

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
    const frontendPath = path.join(__dirname, '../frontend/dist');
    app.use(express.static(frontendPath));
}

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        game: 'Buraco Multiplayer',
        rooms: rooms.size,
        transport: 'SSE'
    });
});

/**
 * Create a new player session (get a player ID)
 */
app.post('/api/session', (req, res) => {
    const playerId = createSession();
    console.log(`New session created: ${playerId}`);
    res.json({ success: true, playerId });
});

/**
 * SSE endpoint - Server-Sent Events stream for game updates
 */
app.get('/api/events/:playerId', (req, res) => {
    const { playerId } = req.params;
    const session = getSession(playerId);

    if (!session) {
        return res.status(404).json({ success: false, reason: 'Invalid session' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    // Store the response for broadcasting
    setSseResponse(playerId, res);

    // Send initial connected event
    res.write(`event: connected\ndata: ${JSON.stringify({ playerId })}\n\n`);

    // Keep-alive ping every 15 seconds
    const keepAliveInterval = setInterval(() => {
        try {
            res.write(`: keepalive\n\n`);
        } catch (err) {
            clearInterval(keepAliveInterval);
        }
    }, 15000);

    // Handle client disconnect
    req.on('close', () => {
        clearInterval(keepAliveInterval);
        removeSseResponse(playerId);

        // Handle player leaving room
        const roomCode = getPlayerRoom(playerId);
        if (roomCode) {
            const room = rooms.get(roomCode);
            if (room) {
                room.removePlayer(playerId);
                sessionLeaveRoom(playerId);

                if (room.players.size === 0) {
                    rooms.delete(roomCode);
                    console.log(`Room ${roomCode} removed (empty)`);
                } else {
                    // Notify remaining players
                    broadcastToRoom(roomCode, 'playerLeft', {
                        roomInfo: room.getPublicInfo()
                    });
                }
            }
        }

        console.log(`SSE connection closed for player: ${playerId}`);
    });
});

/**
 * Create a new room
 */
app.post('/api/room/create', (req, res) => {
    try {
        const { playerId, nickname, maxPlayers, avatarId, roomConfig } = req.body;

        if (!playerId || !getSession(playerId)) {
            return res.status(401).json({ success: false, reason: 'Invalid session' });
        }

        if (!nickname || nickname.trim().length === 0) {
            return res.json({ success: false, reason: 'Nickname required' });
        }

        if (![2, 4, 6].includes(maxPlayers)) {
            return res.json({ success: false, reason: 'Invalid player count' });
        }

        const room = new Room(playerId, nickname.trim(), avatarId, maxPlayers, roomConfig);
        rooms.set(room.code, room);
        sessionJoinRoom(playerId, room.code, nickname.trim(), avatarId);

        console.log(`Room created: ${room.code} by ${nickname}`);

        res.json({
            success: true,
            roomCode: room.code,
            roomInfo: room.getPublicInfo()
        });
    } catch (err) {
        console.error('Error creating room:', err);
        res.json({ success: false, reason: 'Failed to create room' });
    }
});

/**
 * Join an existing room
 */
app.post('/api/room/join', (req, res) => {
    try {
        const { playerId, nickname, roomCode, avatarId } = req.body;

        if (!playerId || !getSession(playerId)) {
            return res.status(401).json({ success: false, reason: 'Invalid session' });
        }

        if (!nickname || nickname.trim().length === 0) {
            return res.json({ success: false, reason: 'Nickname required' });
        }

        const code = roomCode.toUpperCase().trim();
        const room = rooms.get(code);

        if (!room) {
            return res.json({ success: false, reason: 'Room not found' });
        }

        const result = room.addPlayer(playerId, nickname.trim(), avatarId);

        if (!result.success) {
            return res.json(result);
        }

        sessionJoinRoom(playerId, code, nickname.trim(), avatarId);

        // Notify all players in room via SSE
        broadcastToRoom(code, 'playerJoined', {
            roomInfo: room.getPublicInfo()
        });

        console.log(`${nickname} joined room ${code}`);

        res.json({
            success: true,
            roomInfo: room.getPublicInfo()
        });
    } catch (err) {
        console.error('Error joining room:', err);
        res.json({ success: false, reason: 'Failed to join room' });
    }
});

/**
 * Swap a player's team (host only, 4/6 player games)
 */
app.post('/api/room/swap-team', (req, res) => {
    try {
        const { playerId, seat } = req.body;

        if (!playerId || !getSession(playerId)) {
            return res.status(401).json({ success: false, reason: 'Invalid session' });
        }

        const roomCode = getPlayerRoom(playerId);
        if (!roomCode) {
            return res.json({ success: false, reason: 'Not in a room' });
        }

        const room = rooms.get(roomCode);
        if (!room) {
            return res.json({ success: false, reason: 'Room not found' });
        }

        if (room.hostId !== playerId) {
            return res.json({ success: false, reason: 'Only host can swap teams' });
        }

        const result = room.swapPlayerTeam(seat);

        if (!result.success) {
            return res.json(result);
        }

        // Notify all players in the room
        broadcastToRoom(roomCode, 'playerJoined', {
            roomInfo: room.getPublicInfo()
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Error swapping team:', err);
        res.json({ success: false, reason: 'Failed to swap team' });
    }
});

/**
 * Start the game (host only)
 */
app.post('/api/game/start', (req, res) => {
    try {
        const { playerId } = req.body;

        if (!playerId || !getSession(playerId)) {
            return res.status(401).json({ success: false, reason: 'Invalid session' });
        }

        const roomCode = getPlayerRoom(playerId);
        if (!roomCode) {
            return res.json({ success: false, reason: 'Not in a room' });
        }

        const room = rooms.get(roomCode);
        if (!room) {
            return res.json({ success: false, reason: 'Room not found' });
        }

        if (room.hostId !== playerId) {
            return res.json({ success: false, reason: 'Only host can start the game' });
        }

        const result = room.startGame();

        if (!result.success) {
            return res.json(result);
        }

        console.log(`Game started in room ${roomCode}`);

        // Send personalized game state to each player via SSE
        for (const [pid] of room.players) {
            sendToPlayer(pid, 'gameStarted', {
                gameState: room.getPlayerView(pid)
            });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Error starting game:', err);
        res.json({ success: false, reason: 'Failed to start game' });
    }
});

/**
 * Helper function to handle game actions
 */
function handleGameAction(playerId, action) {
    const roomCode = getPlayerRoom(playerId);
    if (!roomCode) {
        return { success: false, reason: 'Not in a room' };
    }

    const room = rooms.get(roomCode);
    if (!room || !room.game) {
        return { success: false, reason: 'Game not found' };
    }

    const result = action(room);

    if (result.success) {
        // Broadcast updated game state to all players via SSE
        for (const [pid] of room.players) {
            sendToPlayer(pid, 'gameStateUpdate', {
                gameState: room.getPlayerView(pid)
            });
        }

        // If game is over, send result and schedule cleanup
        if (result.gameOver || room.game.isGameOver) {
            broadcastToRoom(roomCode, 'gameOver', {
                result: room.game.getGameResult()
            });

            // Delete room after 30 seconds to free memory and allow new games
            setTimeout(() => {
                if (rooms.has(roomCode)) {
                    rooms.delete(roomCode);
                    console.log(`Deleted room ${roomCode} after game over`);
                }
            }, 30 * 1000);
        }
    }

    return result;
}

/**
 * Draw from draw pile
 */
app.post('/api/game/draw', (req, res) => {
    try {
        const { playerId } = req.body;

        if (!playerId || !getSession(playerId)) {
            return res.status(401).json({ success: false, reason: 'Invalid session' });
        }

        const roomCode = getPlayerRoom(playerId);
        const room = rooms.get(roomCode);

        const result = handleGameAction(playerId, (room) => {
            const drawResult = room.game.drawFromPile(playerId);
            if (drawResult.success) {
                // Get player info for animation
                const player = room.players.get(playerId);
                // Emit animation event to all players
                broadcastToRoom(roomCode, 'playerAction', {
                    type: 'drawFromPile',
                    playerNickname: player?.nickname || 'Player',
                    playerSeat: player?.seat,
                    cardCount: 1
                });
            }
            return drawResult;
        });

        res.json(result);
    } catch (err) {
        console.error('Error in draw action:', err);
        res.json({ success: false, reason: 'Action failed' });
    }
});

/**
 * Take discard pile
 */
app.post('/api/game/take-discard', (req, res) => {
    try {
        const { playerId } = req.body;

        if (!playerId || !getSession(playerId)) {
            return res.status(401).json({ success: false, reason: 'Invalid session' });
        }

        const roomCode = getPlayerRoom(playerId);
        const room = rooms.get(roomCode);

        const result = handleGameAction(playerId, (room) => {
            const discardCount = room.game.discardPile?.length || 0;
            const takeResult = room.game.takeDiscardPile(playerId);
            if (takeResult.success) {
                const player = room.players.get(playerId);
                broadcastToRoom(roomCode, 'playerAction', {
                    type: 'takeDiscardPile',
                    playerNickname: player?.nickname || 'Player',
                    playerSeat: player?.seat,
                    cardCount: takeResult.cards?.length || discardCount
                });
            }
            return takeResult;
        });

        res.json(result);
    } catch (err) {
        console.error('Error in take-discard action:', err);
        res.json({ success: false, reason: 'Action failed' });
    }
});

/**
 * Play a new meld
 */
app.post('/api/game/meld', (req, res) => {
    try {
        const { playerId, cardIds } = req.body;

        if (!playerId || !getSession(playerId)) {
            return res.status(401).json({ success: false, reason: 'Invalid session' });
        }

        const roomCode = getPlayerRoom(playerId);
        const room = rooms.get(roomCode);

        const result = handleGameAction(playerId, (room) => {
            const meldResult = room.game.playMeld(playerId, cardIds);

            // Check if pozzetto was taken
            if (meldResult.success && meldResult.tookPozzetto) {
                const player = room.players.get(playerId);
                broadcastToRoom(roomCode, 'playerAction', {
                    type: 'takePozzetto',
                    playerNickname: player?.nickname || 'Player',
                    playerSeat: player?.seat,
                    cardCount: meldResult.cards
                });
            }

            return meldResult;
        });

        res.json(result);
    } catch (err) {
        console.error('Error in meld action:', err);
        res.json({ success: false, reason: 'Action failed' });
    }
});

/**
 * Extend an existing meld
 */
app.post('/api/game/extend-meld', (req, res) => {
    try {
        const { playerId, meldId, cardIds } = req.body;

        if (!playerId || !getSession(playerId)) {
            return res.status(401).json({ success: false, reason: 'Invalid session' });
        }

        const roomCode = getPlayerRoom(playerId);
        const room = rooms.get(roomCode);

        const result = handleGameAction(playerId, (room) => {
            const extendResult = room.game.extendMeld(playerId, meldId, cardIds);

            // Check if pozzetto was taken
            if (extendResult.success && extendResult.tookPozzetto) {
                const player = room.players.get(playerId);
                broadcastToRoom(roomCode, 'playerAction', {
                    type: 'takePozzetto',
                    playerNickname: player?.nickname || 'Player',
                    playerSeat: player?.seat,
                    cardCount: extendResult.cards
                });
            }

            return extendResult;
        });

        res.json(result);
    } catch (err) {
        console.error('Error in extend-meld action:', err);
        res.json({ success: false, reason: 'Action failed' });
    }
});

/**
 * Discard a card
 */
app.post('/api/game/discard', (req, res) => {
    try {
        const { playerId, cardId } = req.body;

        if (!playerId || !getSession(playerId)) {
            return res.status(401).json({ success: false, reason: 'Invalid session' });
        }

        const roomCode = getPlayerRoom(playerId);
        const room = rooms.get(roomCode);

        const result = handleGameAction(playerId, (room) => {
            const discardResult = room.game.discard(playerId, cardId);

            // Check if pozzetto was taken after discarding
            if (discardResult.success && discardResult.pozzettoInfo) {
                const player = room.players.get(playerId);
                broadcastToRoom(roomCode, 'playerAction', {
                    type: 'takePozzetto',
                    playerNickname: player?.nickname || 'Player',
                    playerSeat: player?.seat,
                    cardCount: discardResult.pozzettoInfo.cards
                });
            }

            return discardResult;
        });

        res.json(result);
    } catch (err) {
        console.error('Error in discard action:', err);
        res.json({ success: false, reason: 'Action failed' });
    }
});

/**
 * Replace a wild card in a meld with a natural card
 */
app.post('/api/game/replace-wild', (req, res) => {
    try {
        const { playerId, meldId, wildCardId, naturalCardId } = req.body;

        if (!playerId || !getSession(playerId)) {
            return res.status(401).json({ success: false, reason: 'Invalid session' });
        }

        const result = handleGameAction(playerId, (room) => {
            return room.game.replaceWildInMeld(playerId, meldId, wildCardId, naturalCardId);
        });

        res.json(result);
    } catch (err) {
        console.error('Error in replace-wild action:', err);
        res.json({ success: false, reason: 'Action failed' });
    }
});

// Serve frontend index.html for all non-API routes in production
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        const frontendPath = path.join(__dirname, '../frontend/dist');
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
}

/**
 * Cleanup stale rooms and sessions periodically
 */
setInterval(() => {
    const now = Date.now();
    const staleTimeout = 10 * 60 * 1000; // 30 minutes (optimized for low memory)

    for (const [code, room] of rooms) {
        if (now - room.createdAt > staleTimeout && room.players.size === 0) {
            rooms.delete(code);
            console.log(`Cleaned up stale room: ${code}`);
        }
    }

    // Cleanup stale player sessions
    cleanupStaleSessions();
}, 10 * 60 * 1000); // Check every 10 minutes (optimized for low memory)

/**
 * Start server
 */
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Buraco server running on port ${PORT} (SSE mode)`);
});
