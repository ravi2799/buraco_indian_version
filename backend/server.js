/**
 * Buraco Multiplayer Server
 * Express + Socket.IO for real-time game communication
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import Room from './game/Room.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// CORS configuration
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
    const frontendPath = path.join(__dirname, '../frontend/dist');
    app.use(express.static(frontendPath));
}

// Room storage (in-memory)
const rooms = new Map(); // roomCode -> Room instance
const playerRooms = new Map(); // socketId -> roomCode

/**
 * Health check endpoint (API)
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        game: 'Buraco Multiplayer',
        rooms: rooms.size
    });
});

// Serve frontend index.html for all non-API routes in production
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        const frontendPath = path.join(__dirname, '../frontend/dist');
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
}

/**
 * Socket.IO connection handling
 */
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    /**
     * Create a new room
     */
    socket.on('createRoom', ({ nickname, maxPlayers, avatarId, roomConfig }, callback) => {
        try {
            if (!nickname || nickname.trim().length === 0) {
                return callback({ success: false, reason: 'Nickname required' });
            }

            if (![2, 4, 6].includes(maxPlayers)) {
                return callback({ success: false, reason: 'Invalid player count' });
            }

            const room = new Room(socket.id, nickname.trim(), avatarId, maxPlayers, roomConfig);
            rooms.set(room.code, room);
            playerRooms.set(socket.id, room.code);

            socket.join(room.code);

            console.log(`Room created: ${room.code} by ${nickname}`);

            callback({
                success: true,
                roomCode: room.code,
                roomInfo: room.getPublicInfo()
            });
        } catch (err) {
            console.error('Error creating room:', err);
            callback({ success: false, reason: 'Failed to create room' });
        }
    });

    /**
     * Join an existing room
     */
    socket.on('joinRoom', ({ nickname, roomCode, avatarId }, callback) => {
        try {
            if (!nickname || nickname.trim().length === 0) {
                return callback({ success: false, reason: 'Nickname required' });
            }

            const code = roomCode.toUpperCase().trim();
            const room = rooms.get(code);

            if (!room) {
                return callback({ success: false, reason: 'Room not found' });
            }

            const result = room.addPlayer(socket.id, nickname.trim(), avatarId);

            if (!result.success) {
                return callback(result);
            }

            playerRooms.set(socket.id, code);
            socket.join(code);

            // Notify all players in room
            io.to(code).emit('playerJoined', {
                roomInfo: room.getPublicInfo()
            });

            console.log(`${nickname} joined room ${code}`);

            callback({
                success: true,
                roomInfo: room.getPublicInfo()
            });
        } catch (err) {
            console.error('Error joining room:', err);
            callback({ success: false, reason: 'Failed to join room' });
        }
    });

    /**
     * Swap a player's team (host only, 4/6 player games)
     */
    socket.on('swapTeam', ({ seat }, callback) => {
        try {
            const roomCode = playerRooms.get(socket.id);
            if (!roomCode) {
                return callback({ success: false, reason: 'Not in a room' });
            }

            const room = rooms.get(roomCode);
            if (!room) {
                return callback({ success: false, reason: 'Room not found' });
            }

            if (room.hostId !== socket.id) {
                return callback({ success: false, reason: 'Only host can swap teams' });
            }

            const result = room.swapPlayerTeam(seat);

            if (!result.success) {
                return callback(result);
            }

            // Notify all players in the room
            io.to(roomCode).emit('playerJoined', {
                roomInfo: room.getPublicInfo()
            });

            callback({ success: true });
        } catch (err) {
            console.error('Error swapping team:', err);
            callback({ success: false, reason: 'Failed to swap team' });
        }
    });

    /**
     * Start the game (host only)
     */
    socket.on('startGame', (callback) => {
        try {
            const roomCode = playerRooms.get(socket.id);
            if (!roomCode) {
                return callback({ success: false, reason: 'Not in a room' });
            }

            const room = rooms.get(roomCode);
            if (!room) {
                return callback({ success: false, reason: 'Room not found' });
            }

            if (room.hostId !== socket.id) {
                return callback({ success: false, reason: 'Only host can start the game' });
            }

            const result = room.startGame();

            if (!result.success) {
                return callback(result);
            }

            console.log(`Game started in room ${roomCode}`);

            // Send personalized game state to each player
            for (const [playerId] of room.players) {
                io.to(playerId).emit('gameStarted', {
                    gameState: room.getPlayerView(playerId)
                });
            }

            callback({ success: true });
        } catch (err) {
            console.error('Error starting game:', err);
            callback({ success: false, reason: 'Failed to start game' });
        }
    });

    /**
     * Draw from draw pile
     */
    socket.on('drawFromPile', (callback) => {
        handleGameAction(socket, callback, (room) => {
            return room.game.drawFromPile(socket.id);
        });
    });

    /**
     * Take discard pile
     */
    socket.on('takeDiscardPile', (callback) => {
        handleGameAction(socket, callback, (room) => {
            return room.game.takeDiscardPile(socket.id);
        });
    });

    /**
     * Play a new meld
     */
    socket.on('playMeld', ({ cardIds }, callback) => {
        handleGameAction(socket, callback, (room) => {
            return room.game.playMeld(socket.id, cardIds);
        });
    });

    /**
     * Extend an existing meld
     */
    socket.on('extendMeld', ({ meldId, cardIds }, callback) => {
        handleGameAction(socket, callback, (room) => {
            return room.game.extendMeld(socket.id, meldId, cardIds);
        });
    });

    /**
     * Discard a card
     */
    socket.on('discard', ({ cardId }, callback) => {
        handleGameAction(socket, callback, (room) => {
            return room.game.discard(socket.id, cardId);
        });
    });

    /**
     * Replace a wild card in a meld with a natural card
     */
    socket.on('replaceWild', ({ meldId, wildCardId, naturalCardId }, callback) => {
        handleGameAction(socket, callback, (room) => {
            return room.game.replaceWildInMeld(socket.id, meldId, wildCardId, naturalCardId);
        });
    });

    /**
     * Handle player disconnect
     */
    socket.on('disconnect', () => {
        const roomCode = playerRooms.get(socket.id);

        if (roomCode) {
            const room = rooms.get(roomCode);

            if (room) {
                room.removePlayer(socket.id);

                if (room.players.size === 0) {
                    // Remove empty room
                    rooms.delete(roomCode);
                    console.log(`Room ${roomCode} removed (empty)`);
                } else {
                    // Notify remaining players
                    io.to(roomCode).emit('playerLeft', {
                        roomInfo: room.getPublicInfo()
                    });
                }
            }

            playerRooms.delete(socket.id);
        }

        console.log(`Player disconnected: ${socket.id}`);
    });
});

/**
 * Helper function to handle game actions
 */
function handleGameAction(socket, callback, action) {
    try {
        const roomCode = playerRooms.get(socket.id);
        if (!roomCode) {
            return callback({ success: false, reason: 'Not in a room' });
        }

        const room = rooms.get(roomCode);
        if (!room || !room.game) {
            return callback({ success: false, reason: 'Game not found' });
        }

        const result = action(room);

        if (result.success) {
            // Broadcast updated game state to all players
            for (const [playerId] of room.players) {
                io.to(playerId).emit('gameStateUpdate', {
                    gameState: room.getPlayerView(playerId)
                });
            }

            // If game is over, send result
            if (result.gameOver || room.game.isGameOver) {
                io.to(roomCode).emit('gameOver', {
                    result: room.game.getGameResult()
                });
            }
        }

        callback(result);
    } catch (err) {
        console.error('Error in game action:', err);
        callback({ success: false, reason: 'Action failed' });
    }
}

/**
 * Cleanup stale rooms periodically
 */
setInterval(() => {
    const now = Date.now();
    const staleTimeout = 2 * 60 * 60 * 1000; // 2 hours

    for (const [code, room] of rooms) {
        if (now - room.createdAt > staleTimeout && room.players.size === 0) {
            rooms.delete(code);
            console.log(`Cleaned up stale room: ${code}`);
        }
    }
}, 30 * 60 * 1000); // Check every 30 minutes

/**
 * Start server
 */
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Buraco server running on port ${PORT}`);
});
