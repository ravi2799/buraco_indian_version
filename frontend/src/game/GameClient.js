/**
 * SSE Game Client
 * Handles connection to server using Server-Sent Events + HTTP POST
 */

// Backend URL - uses window.BACKEND_URL from config.js or falls back to localhost
const BACKEND_URL = window.BACKEND_URL || 'http://localhost:3001';

class GameClient {
    constructor() {
        this.eventSource = null;
        this.playerId = null;
        this.roomCode = null;
        this.gameState = null;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000;
    }

    /**
     * Connect to the server - creates session and establishes SSE connection
     */
    async connect() {
        try {
            // Create a session first
            const response = await fetch(`${BACKEND_URL}/api/session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error('Failed to create session');
            }

            this.playerId = data.playerId;
            console.log('Session created:', this.playerId);

            // Establish SSE connection
            await this.connectSSE();

            return this.playerId;
        } catch (err) {
            console.error('Connection error:', err);
            throw err;
        }
    }

    /**
     * Establish SSE connection for receiving game updates
     */
    connectSSE() {
        return new Promise((resolve, reject) => {
            if (!this.playerId) {
                reject(new Error('No player ID'));
                return;
            }

            // Close existing connection if any
            if (this.eventSource) {
                this.eventSource.close();
            }

            this.eventSource = new EventSource(`${BACKEND_URL}/api/events/${this.playerId}`);

            this.eventSource.onopen = () => {
                console.log('SSE connection opened');
                this.reconnectAttempts = 0;
            };

            this.eventSource.onerror = (err) => {
                console.error('SSE error:', err);

                // EventSource will auto-reconnect, but we track attempts
                if (this.eventSource.readyState === EventSource.CLOSED) {
                    this.handleDisconnect();
                }
            };

            // Handle connected event
            this.eventSource.addEventListener('connected', (e) => {
                const data = JSON.parse(e.data);
                console.log('Connected to server:', data);
                resolve();
            });

            // Game events
            this.eventSource.addEventListener('playerJoined', (e) => {
                const data = JSON.parse(e.data);
                this.emit('playerJoined', data);
            });

            this.eventSource.addEventListener('playerLeft', (e) => {
                const data = JSON.parse(e.data);
                this.emit('playerLeft', data);
            });

            this.eventSource.addEventListener('gameStarted', (e) => {
                const data = JSON.parse(e.data);
                this.gameState = data.gameState;
                this.emit('gameStarted', data);
            });

            this.eventSource.addEventListener('gameStateUpdate', (e) => {
                const data = JSON.parse(e.data);
                this.gameState = data.gameState;
                this.emit('gameStateUpdate', data);
            });

            this.eventSource.addEventListener('gameOver', (e) => {
                const data = JSON.parse(e.data);
                this.emit('gameOver', data);
            });

            this.eventSource.addEventListener('playerAction', (e) => {
                const data = JSON.parse(e.data);
                this.emit('playerAction', data);
            });

            this.eventSource.addEventListener('chatMessage', (e) => {
                const data = JSON.parse(e.data);
                this.emit('chatMessage', data);
            });

            // Set a timeout for initial connection
            setTimeout(() => {
                if (this.eventSource && this.eventSource.readyState === EventSource.CONNECTING) {
                    reject(new Error('SSE connection timeout'));
                }
            }, 10000);
        });
    }

    /**
     * Handle disconnection and attempt reconnect
     */
    handleDisconnect() {
        this.emit('disconnected');

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

            console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

            setTimeout(() => {
                this.connectSSE().catch(err => {
                    console.error('Reconnection failed:', err);
                });
            }, delay);
        } else {
            console.error('Max reconnection attempts reached');
        }
    }

    /**
     * Event emitter methods
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            for (const callback of this.listeners.get(event)) {
                callback(data);
            }
        }
    }

    /**
     * Helper to make POST requests
     */
    async postRequest(endpoint, body = {}) {
        const response = await fetch(`${BACKEND_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: this.playerId, ...body })
        });
        return response.json();
    }

    /**
     * Create a new room
     */
    async createRoom(nickname, avatarId, maxPlayers, roomConfig = {}) {
        const response = await this.postRequest('/api/room/create', {
            nickname,
            avatarId,
            maxPlayers,
            roomConfig
        });

        if (response.success) {
            this.roomCode = response.roomCode;
            return response;
        } else {
            throw new Error(response.reason);
        }
    }

    /**
     * Join an existing room
     */
    async joinRoom(nickname, avatarId, roomCode) {
        const response = await this.postRequest('/api/room/join', {
            nickname,
            avatarId,
            roomCode
        });

        if (response.success) {
            this.roomCode = roomCode;
            return response;
        } else {
            throw new Error(response.reason);
        }
    }

    /**
     * Swap a player's team (host only, 4/6 player games)
     */
    async swapTeam(seat) {
        const response = await this.postRequest('/api/room/swap-team', { seat });

        if (response.success) {
            return response;
        } else {
            throw new Error(response.reason);
        }
    }

    /**
     * Start the game (host only)
     */
    async startGame() {
        const response = await this.postRequest('/api/game/start');

        if (response.success) {
            return response;
        } else {
            throw new Error(response.reason);
        }
    }

    /**
     * Draw a card from the draw pile
     */
    async drawFromPile() {
        const response = await this.postRequest('/api/game/draw');

        if (response.success) {
            return response;
        } else {
            throw new Error(response.reason);
        }
    }

    /**
     * Take the entire discard pile
     */
    async takeDiscardPile() {
        const response = await this.postRequest('/api/game/take-discard');

        if (response.success) {
            return response;
        } else {
            throw new Error(response.reason);
        }
    }

    /**
     * Play a new meld
     */
    async playMeld(cardIds) {
        const response = await this.postRequest('/api/game/meld', { cardIds });

        if (response.success) {
            return response;
        } else {
            throw new Error(response.reason);
        }
    }

    /**
     * Extend an existing meld
     */
    async extendMeld(meldId, cardIds) {
        const response = await this.postRequest('/api/game/extend-meld', { meldId, cardIds });

        if (response.success) {
            return response;
        } else {
            throw new Error(response.reason);
        }
    }

    /**
     * Discard a card
     */
    async discard(cardId) {
        const response = await this.postRequest('/api/game/discard', { cardId });

        if (response.success) {
            return response;
        } else {
            throw new Error(response.reason);
        }
    }

    /**
     * Replace a wild card in a meld with a natural card from hand
     */
    async replaceWild(meldId, wildCardId, naturalCardId) {
        const response = await this.postRequest('/api/game/replace-wild', {
            meldId,
            wildCardId,
            naturalCardId
        });

        if (response.success) {
            return response;
        } else {
            throw new Error(response.reason);
        }
    }

    /**
     * Send a chat message
     */
    async sendChatMessage(message) {
        const response = await this.postRequest('/api/chat/send', { message });

        if (response.success) {
            return response;
        } else {
            throw new Error(response.reason);
        }
    }

    /**
     * Disconnect from server
     */
    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.playerId = null;
        this.roomCode = null;
        this.gameState = null;
        this.reconnectAttempts = 0;
    }
}

// Singleton instance
export const gameClient = new GameClient();
export default gameClient;
