/**
 * Buraco - Main Entry Point
 * Handles screen transitions and application state
 */

import gameClient from './game/GameClient.js';
import LobbyUI from './ui/Lobby.js';
import GameTableUI from './ui/GameTable.js';

// Screen elements
const lobbyScreen = document.getElementById('lobby-screen');
const waitingScreen = document.getElementById('waiting-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverModal = document.getElementById('game-over-modal');

// Waiting room elements
const displayRoomCode = document.getElementById('display-room-code');
const copyCodeBtn = document.getElementById('copy-code-btn');
const playerCount = document.getElementById('player-count');
const maxPlayers = document.getElementById('max-players');
const playersContainer = document.getElementById('players-container');
const startGameBtn = document.getElementById('start-game-btn');
const leaveRoomBtn = document.getElementById('leave-room-btn');

// Game over elements
const winnerText = document.getElementById('winner-text');
const finalScoreA = document.getElementById('final-score-a');
const finalScoreB = document.getElementById('final-score-b');
const backToLobbyBtn = document.getElementById('back-to-lobby-btn');

// State
let isHost = false;
let currentRoomInfo = null;

// Initialize UI modules
const lobbyUI = new LobbyUI();
const gameTableUI = new GameTableUI();

/**
 * Switch between screens
 */
function showScreen(screenId) {
    [lobbyScreen, waitingScreen, gameScreen].forEach(screen => {
        screen.classList.remove('active');
    });

    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

/**
 * Update waiting room UI
 */
function updateWaitingRoom(roomInfo) {
    currentRoomInfo = roomInfo;

    displayRoomCode.textContent = roomInfo.code;
    playerCount.textContent = roomInfo.currentPlayers;
    maxPlayers.textContent = roomInfo.maxPlayers;

    // Render player slots
    playersContainer.innerHTML = '';

    for (let i = 0; i < roomInfo.maxPlayers; i++) {
        const player = roomInfo.players[i];
        const slot = document.createElement('div');
        slot.className = 'player-slot';

        if (player) {
            slot.classList.add('filled');
            slot.classList.add(`team-${player.team.toLowerCase()}`);
            slot.innerHTML = `
        <div class="nickname">${player.nickname}</div>
        <div class="team-badge">Team ${player.team}</div>
      `;
        } else {
            slot.innerHTML = `<div class="nickname" style="opacity: 0.5">Waiting...</div>`;
        }

        playersContainer.appendChild(slot);
    }

    // Enable start button only for host when room is full
    startGameBtn.disabled = !isHost || roomInfo.currentPlayers < roomInfo.maxPlayers;

    if (isHost && roomInfo.currentPlayers === roomInfo.maxPlayers) {
        startGameBtn.textContent = 'Start Game';
    } else if (isHost) {
        startGameBtn.textContent = `Waiting for ${roomInfo.maxPlayers - roomInfo.currentPlayers} more...`;
    } else {
        startGameBtn.textContent = 'Waiting for host...';
    }
}

/**
 * Show game over modal
 */
function showGameOver(result) {
    gameOverModal.classList.remove('hidden');

    if (result.winner === 'tie') {
        winnerText.textContent = "It's a Tie!";
    } else {
        winnerText.textContent = `Team ${result.winner} Wins!`;
    }

    finalScoreA.textContent = result.scores.A;
    finalScoreB.textContent = result.scores.B;
}

/**
 * Handle room joined (from lobby)
 */
lobbyUI.onRoomJoined = (roomInfo, createdRoom) => {
    isHost = createdRoom;
    updateWaitingRoom(roomInfo);
    showScreen('waiting-screen');
};

/**
 * Game event listeners
 */
gameClient.on('playerJoined', (data) => {
    updateWaitingRoom(data.roomInfo);
});

gameClient.on('playerLeft', (data) => {
    updateWaitingRoom(data.roomInfo);
});

gameClient.on('gameStarted', (data) => {
    showScreen('game-screen');
    gameTableUI.initGame(data.gameState);
});

gameTableUI.onGameOver = (result) => {
    showGameOver(result);
};

/**
 * Waiting room event listeners
 */
copyCodeBtn.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(currentRoomInfo?.code || '');
        copyCodeBtn.textContent = '✓';
        setTimeout(() => { copyCodeBtn.textContent = '📋'; }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
    }
});

startGameBtn.addEventListener('click', async () => {
    if (!isHost) return;

    startGameBtn.disabled = true;
    startGameBtn.textContent = 'Starting...';

    try {
        await gameClient.startGame();
    } catch (err) {
        console.error('Failed to start game:', err);
        alert(err.message);
        startGameBtn.disabled = false;
        startGameBtn.textContent = 'Start Game';
    }
});

leaveRoomBtn.addEventListener('click', () => {
    gameClient.disconnect();
    isHost = false;
    currentRoomInfo = null;
    showScreen('lobby-screen');
});

backToLobbyBtn.addEventListener('click', () => {
    gameClient.disconnect();
    gameOverModal.classList.add('hidden');
    isHost = false;
    currentRoomInfo = null;
    showScreen('lobby-screen');
});

/**
 * Handle disconnection
 */
gameClient.on('disconnected', () => {
    // Only show alert if we were in a game
    if (gameScreen.classList.contains('active')) {
        alert('Disconnected from server');
    }
    gameOverModal.classList.add('hidden');
    showScreen('lobby-screen');
});

// Initial state
showScreen('lobby-screen');

console.log('Buraco game initialized');
