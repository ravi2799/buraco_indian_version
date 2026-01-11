/**
 * Buraco - Main Entry Point
 * Handles screen transitions and application state
 */

import gameClient from './game/GameClient.js';
import LobbyUI from './ui/Lobby.js';
import GameTableUI from './ui/GameTable.js';
import CharacterSelection from './ui/CharacterSelection.js';

// Screen elements
const characterSelectionScreen = document.getElementById('character-selection-screen');
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
const configTimer = document.getElementById('config-timer');
const configDecks = document.getElementById('config-decks');
const configJokers = document.getElementById('config-jokers');

// Game over elements
const winnerText = document.getElementById('winner-text');
const backToLobbyBtn = document.getElementById('back-to-lobby-btn');

// State
let isHost = false;
let currentRoomInfo = null;

// Initialize UI modules
const characterSelection = new CharacterSelection();
const lobbyUI = new LobbyUI();
const gameTableUI = new GameTableUI();

/**
 * Switch between screens
 */
function showScreen(screenId) {
    [characterSelectionScreen, lobbyScreen, waitingScreen, gameScreen].forEach(screen => {
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

    // Update config display
    if (roomInfo.config) {
        configTimer.textContent = roomInfo.config.turnTimer > 0 ? `${roomInfo.config.turnTimer}s` : 'Off';
        configDecks.textContent = roomInfo.config.deckCount;
        configJokers.textContent = roomInfo.config.jokersPerDeck;
    }

    // Render player slots
    playersContainer.innerHTML = '';

    // For 4/6 players, group by teams
    const showTeamSwap = isHost && roomInfo.maxPlayers > 2;
    
    for (let i = 0; i < roomInfo.maxPlayers; i++) {
        const player = roomInfo.players[i];
        const slot = document.createElement('div');
        slot.className = 'player-slot';

        if (player) {
            slot.classList.add('filled');
            slot.classList.add(`team-${player.team.toLowerCase()}`);
            
            let swapBtnHtml = '';
            if (showTeamSwap) {
                const otherTeam = player.team === 'A' ? 'B' : 'A';
                swapBtnHtml = `<button class="swap-team-btn" data-seat="${player.seat}" title="Move to Team ${otherTeam}">⇄</button>`;
            }
            
            slot.innerHTML = `
                <div class="player-info-row">
                    <div class="nickname">${player.nickname}</div>
                    ${swapBtnHtml}
                </div>
                <div class="team-badge">Team ${player.team}</div>
            `;
        } else {
            slot.innerHTML = `<div class="nickname" style="opacity: 0.5">Waiting...</div>`;
        }

        playersContainer.appendChild(slot);
    }

    // Add swap button event listeners
    if (showTeamSwap) {
        document.querySelectorAll('.swap-team-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const seat = parseInt(btn.dataset.seat);
                handleSwapTeam(seat);
            });
        });
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
 * Handle team swap request
 */
async function handleSwapTeam(seat) {
    try {
        await gameClient.swapTeam(seat);
    } catch (err) {
        console.error('Failed to swap team:', err);
        alert(err.message);
    }
}

/**
 * Show game over modal with score breakdown
 */
function showGameOver(result) {
    gameOverModal.classList.remove('hidden');

    // Set winner text
    if (result.winner === 'tie') {
        winnerText.textContent = "It's a Tie!";
    } else {
        winnerText.textContent = `Team ${result.winner} Wins!`;
    }

    // Highlight winning card
    const teamACard = document.querySelector('.team-a-card');
    const teamBCard = document.querySelector('.team-b-card');
    teamACard.classList.toggle('winner', result.winner === 'A');
    teamBCard.classList.toggle('winner', result.winner === 'B');

    // Populate Team A breakdown
    populateTeamBreakdown('a', result.teamDetails?.A, result.scores.A);
    
    // Populate Team B breakdown
    populateTeamBreakdown('b', result.teamDetails?.B, result.scores.B);
}

/**
 * Populate score breakdown for a team
 */
function populateTeamBreakdown(teamId, details, totalScore) {
    document.getElementById(`total-score-${teamId}`).textContent = totalScore || 0;
    
    if (!details) {
        // No details available, just show total
        return;
    }

    // Regular Meld Points (non-burraco melds only: 3-6 cards)
    const regularMeldPoints = details.regularMeldPoints || 0;
    document.getElementById(`meld-score-${teamId}`).textContent = regularMeldPoints;

    // Same Rank Burracos
    const sameRankCount = details.sameRankBurracos || 0;
    document.getElementById(`same-rank-${teamId}`).textContent = 
        sameRankCount > 0 ? `${sameRankCount} × 100 = ${sameRankCount * 100}` : '0';

    // Clean Burracos
    const cleanCount = details.cleanBurracos || 0;
    document.getElementById(`clean-burraco-${teamId}`).textContent = 
        cleanCount > 0 ? `${cleanCount} × 200 = ${cleanCount * 200}` : '0';

    // Dirty Burracos
    const dirtyCount = details.dirtyBurracos || 0;
    document.getElementById(`dirty-burraco-${teamId}`).textContent = 
        dirtyCount > 0 ? `${dirtyCount} × 200 = ${dirtyCount * 200}` : '0';

    // Going Out Bonus
    const goingOutBonus = details.wentOutBonus || 0;
    document.getElementById(`going-out-${teamId}`).textContent = 
        goingOutBonus > 0 ? `+${goingOutBonus}` : '0';

    // Pozzetto Bonus
    const pozzettoBonus = details.pozzettoBonus || 0;
    document.getElementById(`pozzetto-${teamId}`).textContent = 
        pozzettoBonus > 0 ? `+${pozzettoBonus}` : '0';

    // Hand Penalty (negative)
    const penalty = details.handPenalty || 0;
    document.getElementById(`penalty-${teamId}`).textContent = penalty;
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
 * Character Selection listener
 */
characterSelection.onSelectionComplete = (info) => {
    lobbyUI.nickname = info.nickname;
    lobbyUI.avatarId = info.avatarId;
    showScreen('lobby-screen');
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
showScreen('character-selection-screen');

console.log('Buraco game initialized');
