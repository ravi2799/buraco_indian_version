/**
 * Room management for Buraco multiplayer
 */

import { dealCards } from './Deck.js';
import GameState from './GameState.js';

/**
 * Generate a random 6-character room code
 */
function generateRoomCode() {
    const chars = '123456789';
    let code = '';
    for (let i = 0; i < 3; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

/**
 * Room class - manages players and game instance
 */
export default class Room {
    constructor(hostId, hostNickname, hostAvatarId, maxPlayers, roomConfig = {}) {
        this.code = generateRoomCode();
        this.maxPlayers = maxPlayers; // 2, 4, or 6
        this.players = new Map(); // socketId -> { nickname, team, seat }
        this.hostId = hostId;
        this.status = 'waiting'; // waiting, playing, finished
        this.game = null;
        this.createdAt = Date.now();

        // Room configuration with defaults
        this.config = {
            turnTimer: roomConfig.turnTimer ?? 60,      // seconds (0 = disabled)
            deckCount: roomConfig.deckCount ?? 3,       // number of decks
            jokersPerDeck: roomConfig.jokersPerDeck ?? 2 // jokers per deck
        };

        // Add host
        this.addPlayer(hostId, hostNickname, hostAvatarId, true);
    }

    /**
     * Add a player to the room
     */
    addPlayer(socketId, nickname, avatarId = 1, isHost = false) {
        if (this.players.size >= this.maxPlayers) {
            return { success: false, reason: 'Room is full' };
        }

        if (this.status !== 'waiting') {
            return { success: false, reason: 'Game already in progress' };
        }

        // Check for duplicate nickname
        for (const [, player] of this.players) {
            if (player.nickname.toLowerCase() === nickname.toLowerCase()) {
                return { success: false, reason: 'Nickname already taken' };
            }
        }

        const seat = this.players.size;
        const team = this.assignTeam(seat);

        this.players.set(socketId, {
            nickname,
            team,
            seat,
            avatarId: Number.isInteger(Number(avatarId)) ? Number(avatarId) : 1,
            ready: isHost // Host is auto-ready
        });

        return { success: true, seat, team };
    }

    /**
     * Assign team based on seat number
     * For 4 players: 0,2 = Team A (North/South), 1,3 = Team B (East/West)
     * For 6 players: 0,2,4 = Team A, 1,3,5 = Team B
     * For 2 players: each is their own team
     */
    assignTeam(seat) {
        if (this.maxPlayers === 2) {
            return seat === 0 ? 'A' : 'B';
        }
        return seat % 2 === 0 ? 'A' : 'B';
    }

    /**
     * Swap a player's team (for 4/6 player games)
     */
    swapPlayerTeam(seat) {
        if (this.maxPlayers === 2) {
            return { success: false, reason: 'Cannot swap teams in 2-player game' };
        }

        if (this.status !== 'waiting') {
            return { success: false, reason: 'Cannot swap teams after game started' };
        }

        // Find player by seat
        let targetPlayer = null;
        let targetSocketId = null;
        for (const [socketId, player] of this.players) {
            if (player.seat === seat) {
                targetPlayer = player;
                targetSocketId = socketId;
                break;
            }
        }

        if (!targetPlayer) {
            return { success: false, reason: 'Player not found' };
        }

        // Swap team
        targetPlayer.team = targetPlayer.team === 'A' ? 'B' : 'A';

        return { success: true };
    }

    /**
     * Remove a player from the room
     */
    removePlayer(socketId) {
        const player = this.players.get(socketId);
        if (!player) return false;

        this.players.delete(socketId);

        // If host left, assign new host
        if (socketId === this.hostId && this.players.size > 0) {
            this.hostId = this.players.keys().next().value;
        }

        return true;
    }

    /**
     * Check if room is ready to start
     */
    canStart() {
        return this.players.size === this.maxPlayers && this.status === 'waiting';
    }

    /**
     * Start the game
     */
    startGame() {
        if (!this.canStart()) {
            return { success: false, reason: 'Cannot start game yet' };
        }

        this.status = 'playing';

        // Deal cards with room config
        const dealt = dealCards(this.maxPlayers, this.config.deckCount, this.config.jokersPerDeck);

        // Create game state
        this.game = new GameState({
            playerCount: this.maxPlayers,
            players: Array.from(this.players.entries()).map(([socketId, info]) => ({
                socketId,
                ...info
            })),
            hands: dealt.hands,
            pozzetti: dealt.pozzetti,
            drawPile: dealt.drawPile,
            discardPile: dealt.discardPile,
            config: this.config
        });

        return { success: true, game: this.game };
    }

    /**
     * Get public room info (for lobby display)
     */
    getPublicInfo() {
        return {
            code: this.code,
            maxPlayers: this.maxPlayers,
            currentPlayers: this.players.size,
            status: this.status,
            hostNickname: this.players.get(this.hostId)?.nickname,
            config: this.config,
            players: Array.from(this.players.values()).map(p => ({
                nickname: p.nickname,
                team: p.team,
                seat: p.seat,
                avatarId: p.avatarId
            }))
        };
    }

    /**
     * Get game state for a specific player
     */
    getPlayerView(socketId) {
        if (!this.game) return null;
        return this.game.getPlayerView(socketId);
    }
}
