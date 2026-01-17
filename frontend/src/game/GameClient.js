/**
 * Socket.IO Game Client
 * Handles connection to server and game events
 */

import { io } from 'socket.io-client';

// Backend URL - uses window.BACKEND_URL from config.js or falls back to localhost
const BACKEND_URL = window.BACKEND_URL || 'http://localhost:3001';

class GameClient {
    constructor() {
        this.socket = null;
        this.roomCode = null;
        this.gameState = null;
        this.listeners = new Map();
    }

    /**
     * Connect to the server
     */
    connect() {
        return new Promise((resolve, reject) => {
            this.socket = io(BACKEND_URL, {
                transports: ['websocket', 'polling'],
                pingInterval: 10000,  // Ping every 10 seconds
                pingTimeout: 5000
            });

            this.socket.on('connect', () => {
                console.log('Connected to server');
                // Start keep-alive ping to prevent Render from killing connection
                this.startKeepAlive();
                resolve();
            });

            this.socket.on('connect_error', (err) => {
                console.error('Connection error:', err);
                reject(err);
            });

            // Set up game event listeners
            this.setupEventListeners();
        });
    }

    /**
     * Set up socket event listeners
     */
    setupEventListeners() {
        this.socket.on('playerJoined', (data) => {
            this.emit('playerJoined', data);
        });

        this.socket.on('playerLeft', (data) => {
            this.emit('playerLeft', data);
        });

        this.socket.on('gameStarted', (data) => {
            this.gameState = data.gameState;
            this.emit('gameStarted', data);
        });

        this.socket.on('gameStateUpdate', (data) => {
            this.gameState = data.gameState;
            this.emit('gameStateUpdate', data);
        });

        this.socket.on('gameOver', (data) => {
            this.emit('gameOver', data);
        });

        // Player action animations (draw, take discard, take pozzetto)
        this.socket.on('playerAction', (data) => {
            this.emit('playerAction', data);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.emit('disconnected');
        });
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
     * Create a new room
     */
    createRoom(nickname, avatarId, maxPlayers, roomConfig = {}) {
        return new Promise((resolve, reject) => {
            this.socket.emit('createRoom', { nickname, avatarId, maxPlayers, roomConfig }, (response) => {
                if (response.success) {
                    this.roomCode = response.roomCode;
                    resolve(response);
                } else {
                    reject(new Error(response.reason));
                }
            });
        });
    }

    /**
     * Join an existing room
     */
    joinRoom(nickname, avatarId, roomCode) {
        return new Promise((resolve, reject) => {
            this.socket.emit('joinRoom', { nickname, avatarId, roomCode }, (response) => {
                if (response.success) {
                    this.roomCode = roomCode;
                    resolve(response);
                } else {
                    reject(new Error(response.reason));
                }
            });
        });
    }

    /**
     * Swap a player's team (host only, 4/6 player games)
     */
    swapTeam(seat) {
        return new Promise((resolve, reject) => {
            this.socket.emit('swapTeam', { seat }, (response) => {
                if (response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response.reason));
                }
            });
        });
    }

    /**
     * Start the game (host only)
     */
    startGame() {
        return new Promise((resolve, reject) => {
            this.socket.emit('startGame', (response) => {
                if (response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response.reason));
                }
            });
        });
    }

    /**
     * Draw a card from the draw pile
     */
    drawFromPile() {
        return new Promise((resolve, reject) => {
            this.socket.emit('drawFromPile', (response) => {
                if (response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response.reason));
                }
            });
        });
    }

    /**
     * Take the entire discard pile
     */
    takeDiscardPile() {
        return new Promise((resolve, reject) => {
            this.socket.emit('takeDiscardPile', (response) => {
                if (response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response.reason));
                }
            });
        });
    }

    /**
     * Play a new meld
     */
    playMeld(cardIds) {
        return new Promise((resolve, reject) => {
            this.socket.emit('playMeld', { cardIds }, (response) => {
                if (response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response.reason));
                }
            });
        });
    }

    /**
     * Extend an existing meld
     */
    extendMeld(meldId, cardIds) {
        return new Promise((resolve, reject) => {
            this.socket.emit('extendMeld', { meldId, cardIds }, (response) => {
                if (response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response.reason));
                }
            });
        });
    }

    /**
     * Discard a card
     */
    discard(cardId) {
        return new Promise((resolve, reject) => {
            this.socket.emit('discard', { cardId }, (response) => {
                if (response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response.reason));
                }
            });
        });
    }

    /**
     * Replace a wild card in a meld with a natural card from hand
     */
    replaceWild(meldId, wildCardId, naturalCardId) {
        return new Promise((resolve, reject) => {
            this.socket.emit('replaceWild', { meldId, wildCardId, naturalCardId }, (response) => {
                if (response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response.reason));
                }
            });
        });
    }

    /**
     * Start keep-alive ping to prevent Render from killing the connection
     */
    startKeepAlive() {
        // Clear any existing interval
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
        }

        // Ping server every 30 seconds to keep connection alive
        this.keepAliveInterval = setInterval(() => {
            if (this.socket && this.socket.connected) {
                this.socket.emit('ping');
            }
        }, 30000);
    }

    /**
     * Disconnect from server
     */
    disconnect() {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.roomCode = null;
            this.gameState = null;
        }
    }
}

// Singleton instance
export const gameClient = new GameClient();
export default gameClient;
