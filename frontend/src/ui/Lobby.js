/**
 * Lobby UI Module
 * Handles create/join room interface
 */

import gameClient from '../game/GameClient.js';

class LobbyUI {
    constructor() {
        this.selectedPlayerCount = 4;
        this.nickname = '';

        // DOM elements
        this.nicknameInput = document.getElementById('nickname-input');
        this.playerCountBtns = document.querySelectorAll('.player-count-btn');
        this.createRoomBtn = document.getElementById('create-room-btn');
        this.roomCodeInput = document.getElementById('room-code-input');
        this.joinRoomBtn = document.getElementById('join-room-btn');
        this.errorMessage = document.getElementById('error-message');

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

        // Create room
        this.createRoomBtn.addEventListener('click', () => this.handleCreateRoom());

        // Join room
        this.joinRoomBtn.addEventListener('click', () => this.handleJoinRoom());

        // Enter key handlers
        this.nicknameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.roomCodeInput.value.length === 0) {
                this.handleCreateRoom();
            }
        });

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
        const name = this.nicknameInput.value.trim();
        if (!name) {
            this.showError('Please enter a nickname');
            return null;
        }
        if (name.length > 20) {
            this.showError('Nickname too long (max 20 characters)');
            return null;
        }
        return name;
    }

    async handleCreateRoom() {
        const nickname = this.getNickname();
        if (!nickname) return;

        this.hideError();
        this.setLoading(true);

        try {
            await gameClient.connect();
            const response = await gameClient.createRoom(nickname, this.selectedPlayerCount);
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
        if (!roomCode || roomCode.length !== 6) {
            this.showError('Please enter a valid 6-character room code');
            return;
        }

        this.hideError();
        this.setLoading(true);

        try {
            await gameClient.connect();
            const response = await gameClient.joinRoom(nickname, roomCode);
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
