/**
 * Player Session Management for SSE-based multiplayer
 * Replaces Socket.IO's socket.id with UUID-based player identification
 */

import { randomUUID } from 'crypto';

// Map playerId -> { roomCode, nickname, avatarId, sseResponse, lastSeen }
const sessions = new Map();

// Map playerId -> roomCode (for quick room lookup)
const playerRooms = new Map();

// Map roomCode -> Set of playerIds (for broadcasting)
const roomPlayers = new Map();

/**
 * Create a new player session
 * @returns {string} The new player ID
 */
export function createSession() {
    const playerId = randomUUID();
    sessions.set(playerId, {
        roomCode: null,
        nickname: null,
        avatarId: 1,
        sseResponse: null,
        lastSeen: Date.now()
    });
    return playerId;
}

/**
 * Get a player session
 * @param {string} playerId 
 * @returns {Object|null} Session data or null if not found
 */
export function getSession(playerId) {
    return sessions.get(playerId) || null;
}

/**
 * Update a player's session with room info
 * @param {string} playerId 
 * @param {string} roomCode 
 * @param {string} nickname 
 * @param {number} avatarId 
 */
export function joinRoom(playerId, roomCode, nickname, avatarId) {
    const session = sessions.get(playerId);

    if (!session) return;

    // leave prior room first
    if (session.roomCode && session.roomCode !== roomCode) {
        leaveRoom(playerId);
    }

    session.roomCode = roomCode;
    session.nickname = nickname;
    session.avatarId = avatarId;
    session.lastSeen = Date.now();

    playerRooms.set(playerId, roomCode);

    // Add to room's player set
    if (!roomPlayers.has(roomCode)) {
        roomPlayers.set(roomCode, new Set());
    }
    roomPlayers.get(roomCode).add(playerId);
}

/**
 * Remove a player from their current room
 * @param {string} playerId 
 */
export function leaveRoom(playerId) {
    const session = sessions.get(playerId);
    if (session && session.roomCode) {
        const roomCode = session.roomCode;

        // Remove from room's player set
        if (roomPlayers.has(roomCode)) {
            roomPlayers.get(roomCode).delete(playerId);
            if (roomPlayers.get(roomCode).size === 0) {
                roomPlayers.delete(roomCode);
            }
        }

        playerRooms.delete(playerId);
        session.roomCode = null;
    }
}

/**
 * Get the room code for a player
 * @param {string} playerId 
 * @returns {string|null} Room code or null
 */
export function getPlayerRoom(playerId) {
    return playerRooms.get(playerId) || null;
}

/**
 * Set SSE response object for a player (for broadcasting)
 * @param {string} playerId 
 * @param {Response} res Express response object
 */
export function setSseResponse(playerId, res) {
    const session = sessions.get(playerId);
    if (session) {
        session.sseResponse = res;
        session.lastSeen = Date.now();
    }
}

/**
 * Remove SSE response (on disconnect)
 * @param {string} playerId 
 */
export function removeSseResponse(playerId) {
    const session = sessions.get(playerId);
    if (session) {
        session.sseResponse = null;
    }
}

/**
 * Send SSE event to a specific player
 * @param {string} playerId 
 * @param {string} eventType 
 * @param {Object} data 
 */
export function sendToPlayer(playerId, eventType, data) {
    const session = sessions.get(playerId);
    if (session && session.sseResponse) {
        try {
            const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
            session.sseResponse.write(message);
            session.lastSeen = Date.now();
        } catch (err) {
            console.error(`Failed to send SSE to player ${playerId}:`, err.message);
            session.sseResponse = null;
        }
    }
}

/**
 * Broadcast SSE event to all players in a room
 * @param {string} roomCode 
 * @param {string} eventType 
 * @param {Object} data 
 * @param {string} excludePlayerId Optional player to exclude from broadcast
 */
export function broadcastToRoom(roomCode, eventType, data, excludePlayerId = null) {
    const players = roomPlayers.get(roomCode);
    if (players) {
        for (const playerId of players) {
            if (playerId !== excludePlayerId) {
                sendToPlayer(playerId, eventType, data);
            }
        }
    }
}

/**
 * Get all player IDs in a room
 * @param {string} roomCode 
 * @returns {string[]} Array of player IDs
 */
export function getPlayersInRoom(roomCode) {
    const players = roomPlayers.get(roomCode);
    return players ? Array.from(players) : [];
}

/**
 * Update last seen timestamp for a player
 * @param {string} playerId 
 */
export function updateLastSeen(playerId) {
    const session = sessions.get(playerId);
    if (session) {
        session.lastSeen = Date.now();
    }
}

/**
 * Remove a player session
 * @param {string} playerId 
 */
export function removeSession(playerId) {
    leaveRoom(playerId);
    sessions.delete(playerId);
}

/**
 * Cleanup stale sessions (no activity for 10 minutes)
 */
export function cleanupStaleSessions() {
    const now = Date.now();
    const staleTimeout = 5 * 60 * 1000; // 5 minutes (optimized for low memory)

    for (const [playerId, session] of sessions) {
        if (now - session.lastSeen > staleTimeout && !session.sseResponse) {
            console.log(`Cleaning up stale session: ${playerId}`);
            removeSession(playerId);
        }
    }
}

// Export all functions and maps for testing
export default {
    createSession,
    getSession,
    joinRoom,
    leaveRoom,
    getPlayerRoom,
    setSseResponse,
    removeSseResponse,
    sendToPlayer,
    broadcastToRoom,
    getPlayersInRoom,
    updateLastSeen,
    removeSession,
    cleanupStaleSessions
};
