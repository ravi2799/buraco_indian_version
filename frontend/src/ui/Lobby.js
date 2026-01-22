/**
 * Lobby UI Module
 * Handles create/join room interface
 */

import gameClient from '../game/GameClient.js';

class LobbyUI {
    constructor() {
        this.selectedPlayerCount = 4;
        this.nickname = '';
        this.avatarId = null;

        // Room configuration
        this.roomConfig = {
            turnTimer: 60,  // seconds (0 = disabled)
            deckCount: 3,
            jokersPerDeck: 2,
            pozzettoCount: 2  // number of pozzetti
        };

        // DOM elements
        this.playerCountBtns = document.querySelectorAll('.player-count-btn');
        this.createRoomBtn = document.getElementById('create-room-btn');
        this.roomCodeInput = document.getElementById('room-code-input');
        this.joinRoomBtn = document.getElementById('join-room-btn');
        this.errorMessage = document.getElementById('error-message');

        // Config buttons
        this.timerBtns = document.querySelectorAll('.config-btn[data-timer]');
        this.deckBtns = document.querySelectorAll('.config-btn[data-decks]');
        this.jokerBtns = document.querySelectorAll('.config-btn[data-jokers]');
        this.pozzettiBtns = document.querySelectorAll('.config-btn[data-pozzetti]');

        this.onRoomJoined = null; // Callback when room is joined

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Player count selection
        this.playerCountBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.playerCountBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.selectedPlayerCount = parseInt(btn.dataset.count);
            });
        });

        // Timer config
        this.timerBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.timerBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.roomConfig.turnTimer = parseInt(btn.dataset.timer);
            });
        });

        // Deck count config
        this.deckBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.deckBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.roomConfig.deckCount = parseInt(btn.dataset.decks);
            });
        });

        // Jokers config
        this.jokerBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.jokerBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.roomConfig.jokersPerDeck = parseInt(btn.dataset.jokers);
            });
        });

        // Pozzetti config
        this.pozzettiBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.pozzettiBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.roomConfig.pozzettoCount = parseInt(btn.dataset.pozzetti);
            });
        });

        // Create room
        this.createRoomBtn.addEventListener('click', () => this.handleCreateRoom());

        // Join room
        this.joinRoomBtn.addEventListener('click', () => this.handleJoinRoom());

        // Enter key handlers
        this.roomCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleJoinRoom();
            }
        });

        // Auto-uppercase room code
        this.roomCodeInput.addEventListener('input', () => {
            this.roomCodeInput.value = this.roomCodeInput.value.toUpperCase();
        });
    }

    getNickname() {
        if (!this.nickname) {
            this.showError('Nickname is missing');
            return null;
        }
        return this.nickname;
    }

    async handleCreateRoom() {
        const nickname = this.getNickname();
        if (!nickname) return;

        this.hideError();
        this.setLoading(true);

        try {
            await gameClient.connect();
            const response = await gameClient.createRoom(nickname, this.avatarId, this.selectedPlayerCount, this.roomConfig);
            this.nickname = nickname;

            if (this.onRoomJoined) {
                this.onRoomJoined(response.roomInfo, true);
            }
        } catch (err) {
            this.showError(err.message || 'Failed to create room');
        } finally {
            this.setLoading(false);
        }
    }

    async handleJoinRoom() {
        const nickname = this.getNickname();
        if (!nickname) return;

        const roomCode = this.roomCodeInput.value.trim().toUpperCase();
        if (!roomCode) {
            this.showError('Please enter a valid 6-character room code');
            return;
        }

        this.hideError();
        this.setLoading(true);

        try {
            await gameClient.connect();
            const response = await gameClient.joinRoom(nickname, this.avatarId, roomCode);
            this.nickname = nickname;

            if (this.onRoomJoined) {
                this.onRoomJoined(response.roomInfo, false);
            }
        } catch (err) {
            this.showError(err.message || 'Failed to join room');
        } finally {
            this.setLoading(false);
        }
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.remove('hidden');
    }

    hideError() {
        this.errorMessage.classList.add('hidden');
    }

    setLoading(loading) {
        this.createRoomBtn.disabled = loading;
        this.joinRoomBtn.disabled = loading;

        if (loading) {
            this.createRoomBtn.textContent = 'Connecting...';
            this.joinRoomBtn.textContent = 'Connecting...';
        } else {
            this.createRoomBtn.textContent = 'Create Room';
            this.joinRoomBtn.textContent = 'Join Room';
        }
    }
}

export default LobbyUI;
