/**
 * Game Table UI Module
 * Handles the main game interface
 */

import gameClient from '../game/GameClient.js';
import {
    renderHand,
    renderOpponentHand,
    renderTeamMelds,
    renderDiscardPile,
    createCardStackElement
} from '../game/CardRenderer.js';

class GameTableUI {
    constructor() {
        this.gameState = null;
        this.selectedCards = new Set();
        this.isMyTurn = false;
        this.currentPhase = null;
        this.myTeam = null;
        this.draggedCardId = null;
        this.customCardOrder = null; // Custom card arrangement

        // Timer state
        this.turnTimer = null;
        this.turnTimeLeft = 60; // Default 60 seconds
        this.turnDuration = 60; // Configurable
        this.timerEnabled = true; // Can be disabled
        this.lastCurrentPlayer = null; // Track turn changes

        // DOM elements
        this.playerHand = document.getElementById('player-hand');
        this.opponentsArea = document.getElementById('opponents-area');
        this.playerTop = document.getElementById('player-top');
        this.playerLeft = document.getElementById('player-left');
        this.playerRight = document.getElementById('player-right');
        this.drawPile = document.getElementById('draw-pile');
        this.discardPile = document.getElementById('discard-pile');
        this.teamAMelds = document.getElementById('team-a-melds');
        this.teamBMelds = document.getElementById('team-b-melds');
        this.drawCount = document.getElementById('draw-count');
        this.turnIndicator = document.getElementById('current-turn');
        this.teamAZonePoints = document.getElementById('team-a-zone-points');
        this.teamBZonePoints = document.getElementById('team-b-zone-points');

        // Player info badges
        this.opponentBadge = document.getElementById('opponent-badge');
        this.opponentsRow = document.getElementById('opponents-row');
        this.myBadge = document.getElementById('my-player-badge');

        // Action buttons (hidden, used internally)
        this.drawBtn = document.getElementById('draw-btn');
        this.takeDiscardBtn = document.getElementById('take-discard-btn');
        this.discardBtn = document.getElementById('discard-btn');
        this.meldBtn = document.getElementById('meld-btn');
        this.sortHandBtn = document.getElementById('sort-hand-btn');

        // Pozzetti
        this.pozzetto1 = document.getElementById('pozzetto-1');
        this.pozzetto2 = document.getElementById('pozzetto-2');

        this.onGameOver = null; // Callback for game end

        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    setupEventListeners() {
        // Draw from pile
        this.drawBtn.addEventListener('click', () => this.handleDraw());
        this.drawPile.addEventListener('click', () => {
            if (!this.drawBtn.disabled) this.handleDraw();
        });

        // Take discard pile
        this.takeDiscardBtn.addEventListener('click', () => this.handleTakeDiscard());
        this.discardPile.addEventListener('click', () => {
            if (!this.takeDiscardBtn.disabled) this.handleTakeDiscard();
        });

        // Discard
        this.discardBtn.addEventListener('click', () => this.handleDiscard());

        // Play meld
        this.meldBtn.addEventListener('click', () => this.handlePlayMeld());

        // Sort hand
        this.sortHandBtn.addEventListener('click', () => this.renderPlayerHand());

        // Game events
        gameClient.on('gameStateUpdate', (data) => {
            this.updateGameState(data.gameState);
        });

        gameClient.on('gameOver', (data) => {
            if (this.onGameOver) {
                this.onGameOver(data.result);
            }
        });
    }

    /**
     * Setup drag and drop for discarding cards
     */
    setupDragAndDrop() {
        // Discard pile as drop target
        this.discardPile.addEventListener('dragover', (e) => {
            if (this.canDiscard()) {
                e.preventDefault();
                this.discardPile.classList.add('drag-over');
            }
        });

        this.discardPile.addEventListener('dragleave', () => {
            this.discardPile.classList.remove('drag-over');
        });

        this.discardPile.addEventListener('drop', (e) => {
            e.preventDefault();
            this.discardPile.classList.remove('drag-over');
            
            if (this.draggedCardId && this.canDiscard()) {
                this.handleDiscardCard(this.draggedCardId);
            }
            this.draggedCardId = null;
        });
    }

    /**
     * Check if player can discard
     */
    canDiscard() {
        return this.isMyTurn && this.currentPhase !== 'draw';
    }

    /**
     * Handle discarding a specific card (from drag)
     */
    async handleDiscardCard(cardId) {
        if (this.currentPhase === 'draw') {
            alert('You must draw a card first!');
            return;
        }
        
        try {
            await gameClient.discard(cardId);
            this.selectedCards.clear();
        } catch (err) {
            console.error('Discard failed:', err);
        }
    }

    /**
     * Initialize the game UI with initial state
     */
    initGame(gameState) {
        this.gameState = gameState;
        this.selectedCards.clear();
        this.lastCurrentPlayer = null; // Reset for new game
        
        // Apply room config (timer settings)
        if (gameState.config) {
            this.turnDuration = gameState.config.turnTimer || 60;
            this.timerEnabled = this.turnDuration > 0;
            this.turnTimeLeft = this.turnDuration;
        }
        
        // Set my team
        const me = gameState.players?.find(p => p.nickname === gameState.myNickname);
        this.myTeam = me?.team || 'A';
        
        this.renderAll();
        
        // Start timer for first turn
        if (this.timerEnabled) {
            this.startTurnTimer();
        }
    }

    /**
     * Update game state and re-render
     */
    updateGameState(gameState) {
        this.gameState = gameState;
        this.selectedCards.clear();
        this.renderAll();
    }

    /**
     * Render all game elements
     */
    renderAll() {
        if (!this.gameState) return;

        const wasPreviouslyMyTurn = this.isMyTurn;
        this.isMyTurn = this.gameState.isMyTurn;
        this.currentPhase = this.gameState.currentPhase;

        // Restart timer when turn changes to a new player
        const currentPlayerNickname = this.gameState.currentPlayerNickname;
        const turnChanged = currentPlayerNickname !== this.lastCurrentPlayer;
        
        if (turnChanged) {
            this.lastCurrentPlayer = currentPlayerNickname;
            if (this.timerEnabled) {
                this.startTurnTimer(); // Reset timer for new turn
            }
        }

        this.renderPlayerHand();
        this.renderMyBadge();
        this.renderOpponentBadge();
        this.renderOpponents();
        this.renderPiles();
        this.renderMelds();
        this.renderPozzetti();
        this.updateTurnIndicator();
        this.updateActionButtons();
        this.updateScores();
    }

    /**
     * Render player's hand
     */
    renderPlayerHand() {
        if (!this.gameState?.hand) return;

        renderHand(this.playerHand, this.gameState.hand, {
            selectedIds: Array.from(this.selectedCards),
            customOrder: this.customCardOrder,
            onCardClick: (card) => this.handleCardClick(card),
            onCardDragStart: (card) => {
                this.draggedCardId = card.id;
            },
            onCardDragEnd: () => {
                // draggedCardId is cleared after drop
            },
            onReorder: (draggedId, targetId) => {
                this.handleCardReorder(draggedId, targetId);
            }
        });
    }

    /**
     * Handle card reordering in hand
     */
    handleCardReorder(draggedId, targetId) {
        // Get current order (either custom or from hand)
        const currentOrder = this.customCardOrder || this.gameState.hand.map(c => c.id);
        
        // Find positions
        const draggedIdx = currentOrder.indexOf(draggedId);
        const targetIdx = currentOrder.indexOf(targetId);
        
        if (draggedIdx === -1 || targetIdx === -1) return;
        
        // Remove dragged card and insert at target position
        const newOrder = [...currentOrder];
        newOrder.splice(draggedIdx, 1);
        newOrder.splice(targetIdx, 0, draggedId);
        
        this.customCardOrder = newOrder;
        this.renderPlayerHand();
    }

    /**
     * Render my player badge (bottom right)
     */
    renderMyBadge() {
        if (!this.myBadge || !this.gameState?.myNickname) return;

        const isMyTurn = this.gameState.isMyTurn;
        const avatarId = this.gameState.myAvatarId || 1;
        const nickname = this.gameState.myNickname;
        const cardCount = this.gameState.hand?.length || 0;
        const teamClass = this.myTeam === 'A' ? 'team-a' : 'team-b';

        this.myBadge.innerHTML = `
            <div class="player-info-badge ${teamClass} ${isMyTurn ? 'current-turn' : ''}">
                <img src="/assets/avatars/avatar_${avatarId}.png" class="badge-avatar" alt="${nickname}">
                <div class="badge-info">
                    <span class="badge-name">${nickname}</span>
                    <span class="badge-card-count">${cardCount}</span>
                </div>
                ${this.timerEnabled && isMyTurn ? `<div class="badge-timer" id="my-timer">${this.turnTimeLeft}</div>` : ''}
            </div>
        `;
    }

    /**
     * Render opponent badge (top center for 2-player game only)
     */
    renderOpponentBadge() {
        if (!this.opponentBadge || !this.gameState?.players) {
            return;
        }

        const allPlayers = this.gameState.players;
        
        // Only show for 2-player games
        if (allPlayers.length !== 2) {
            this.opponentBadge.innerHTML = '';
            return;
        }
        
        const myNickname = this.gameState.myNickname;
        const opponent = allPlayers.find(p => p.nickname !== myNickname);

        if (!opponent) {
            this.opponentBadge.innerHTML = '';
            return;
        }

        const isOpponentTurn = opponent.isCurrentPlayer;
        const avatarId = opponent.avatarId || 1;
        const cardCount = opponent.cardCount || 0;

        this.opponentBadge.innerHTML = `
            <div class="player-info-badge ${isOpponentTurn ? 'current-turn' : ''}">
                <img src="/assets/avatars/avatar_${avatarId}.png" class="badge-avatar" alt="${opponent.nickname}">
                <div class="badge-info">
                    <span class="badge-name">${opponent.nickname}</span>
                    <span class="badge-card-count">${cardCount}</span>
                </div>
                ${this.timerEnabled && isOpponentTurn ? `<div class="badge-timer" id="opponent-timer">${this.turnTimeLeft}</div>` : ''}
            </div>
        `;
    }

    /**
     * Start the turn timer
     */
    startTurnTimer() {
        this.stopTurnTimer();
        
        if (!this.timerEnabled) return;
        
        this.turnTimeLeft = this.turnDuration;
        this.updateTimerDisplay();

        this.turnTimer = setInterval(() => {
            this.turnTimeLeft--;
            this.updateTimerDisplay();

            if (this.turnTimeLeft <= 0) {
                this.stopTurnTimer();
                this.handleTimerExpired();
            }
        }, 1000);
    }

    /**
     * Stop the turn timer
     */
    stopTurnTimer() {
        if (this.turnTimer) {
            clearInterval(this.turnTimer);
            this.turnTimer = null;
        }
    }

    /**
     * Update timer display in badges
     */
    updateTimerDisplay() {
        const timerEls = document.querySelectorAll('.badge-timer');
        const isWarning = this.turnTimeLeft <= 10;

        timerEls.forEach(el => {
            el.textContent = this.turnTimeLeft;
            el.classList.toggle('warning', isWarning);
        });
    }

    /**
     * Handle timer expiration - auto discard
     */
    async handleTimerExpired() {
        if (!this.isMyTurn) return;

        // If in draw phase, auto-draw first
        if (this.currentPhase === 'draw') {
            try {
                await gameClient.drawFromPile();
            } catch (err) {
                console.error('Auto-draw failed:', err);
            }
        }

        // Auto-discard a random card from hand
        const hand = this.gameState?.hand;
        if (hand && hand.length > 0) {
            const randomCard = hand[Math.floor(Math.random() * hand.length)];
            try {
                await gameClient.discard(randomCard.id);
            } catch (err) {
                console.error('Auto-discard failed:', err);
            }
        }
    }

    /**
     * Handle card click (select/deselect)
     */
    handleCardClick(card) {
        if (!this.isMyTurn) return;

        if (this.selectedCards.has(card.id)) {
            this.selectedCards.delete(card.id);
        } else {
            this.selectedCards.add(card.id);
        }

        this.renderPlayerHand();
        this.renderMelds(); // Re-render melds to make them clickable
        this.updateActionButtons();
    }

    /**
     * Render opponent hands arranged around the table
     */
    renderOpponents() {
        if (!this.gameState?.players) {
            console.log('DEBUG renderOpponents: No players data');
            return;
        }

        console.log('DEBUG renderOpponents:', {
            players: this.gameState.players,
            myNickname: this.gameState.myNickname,
            playerCount: this.gameState.players.length
        });

        // Clear all positions
        this.playerTop.innerHTML = '';
        this.playerLeft.innerHTML = '';
        this.playerRight.innerHTML = '';
        
        // Hide positions by default
        this.playerTop.classList.add('hidden');
        this.playerLeft.classList.add('hidden');
        this.playerRight.classList.add('hidden');

        // Get all players and find my index
        const allPlayers = this.gameState.players;
        const myIndex = allPlayers.findIndex(p => p.nickname === this.gameState.myNickname);
        const playerCount = allPlayers.length;

        if (myIndex === -1) return;

        // Arrange players based on count
        // For 2 players: opponent on top
        // For 4 players: teammate on top, opponents on left/right
        
        console.log('DEBUG: myIndex =', myIndex, ', playerCount =', playerCount);

        if (playerCount === 2) {
            // 2 player game: use the new badge style (top center)
            // The opponent badge is rendered separately via renderOpponentBadge()
            // Keep opponentsRow hidden for 2-player games
            this.opponentsRow.innerHTML = '';
            
        } else if (playerCount === 4) {
            // 4 player game: show all 3 other players in top row
            // Order: left opponent, teammate (center), right opponent
            const positions = [
                (myIndex + 1) % 4, // Left
                (myIndex + 2) % 4, // Center (teammate)
                (myIndex + 3) % 4  // Right
            ];
            
            this.renderOpponentsRow([
                allPlayers[positions[0]],
                allPlayers[positions[1]],
                allPlayers[positions[2]]
            ]);
        } else if (playerCount === 6) {
            // 6 player game: show all 5 other players in top row
            const otherPlayers = [];
            for (let i = 1; i < 6; i++) {
                otherPlayers.push(allPlayers[(myIndex + i) % 6]);
            }
            this.renderOpponentsRow(otherPlayers);
        }
    }

    /**
     * Render opponents row (top) for 4/6 player games
     */
    renderOpponentsRow(players) {
        if (!this.opponentsRow) return;
        
        this.opponentsRow.innerHTML = '';
        
        for (const player of players) {
            if (!player) continue;
            
            const isCurrentTurn = player.isCurrentPlayer;
            const avatarId = player.avatarId || 1;
            const cardCount = player.cardCount || 0;
            const isTeammate = player.team === this.myTeam;
            
            const badgeEl = document.createElement('div');
            badgeEl.className = `player-info-badge ${isCurrentTurn ? 'current-turn' : ''} ${isTeammate ? 'teammate' : 'opponent'}`;
            badgeEl.innerHTML = `
                <img src="/assets/avatars/avatar_${avatarId}.png" class="badge-avatar" alt="${player.nickname}">
                <div class="badge-info">
                    <span class="badge-name">${player.nickname}</span>
                    <span class="badge-card-count">${cardCount}</span>
                </div>
                ${this.timerEnabled && isCurrentTurn ? `<div class="badge-timer">${this.turnTimeLeft}</div>` : ''}
            `;
            
            this.opponentsRow.appendChild(badgeEl);
        }
    }

    /**
     * Render a player at a specific table position
     */
    renderPlayerAtPosition(container, player) {
        if (!player) return;
        
        const isCurrentTurn = player.isCurrentPlayer && !this.isMyTurn;
        const avatarId = player.avatarId || 1;
        const cardCount = player.cardCount || 0;
        
        container.innerHTML = `
            <div class="table-player-info ${isCurrentTurn ? 'current-turn' : ''}">
                <div class="player-avatar-wrapper">
                    <img src="/assets/avatars/avatar_${avatarId}.png" class="player-avatar" alt="${player.nickname}">
                    <span class="card-count-badge">${cardCount}</span>
                </div>
                <span class="player-name">${player.nickname}</span>
                <div class="player-cards-stack"></div>
            </div>
        `;
        
        // Create mini card stack
        const stackContainer = container.querySelector('.player-cards-stack');
        const visibleCards = Math.min(cardCount, 5);
        for (let i = 0; i < visibleCards; i++) {
            const miniCard = document.createElement('div');
            miniCard.className = 'mini-card-back';
            miniCard.style.transform = `translateX(${i * 3}px)`;
            stackContainer.appendChild(miniCard);
        }
    }

    /**
     * Render draw and discard piles
     */
    renderPiles() {
        // Draw pile
        const drawPileCards = this.drawPile.querySelector('.card-stack') ||
            this.drawPile.appendChild(document.createElement('div'));
        drawPileCards.className = 'card-stack';
        drawPileCards.innerHTML = '';

        if (this.gameState.drawPileCount > 0) {
            const stack = createCardStackElement(this.gameState.drawPileCount);
            drawPileCards.replaceWith(stack);
            this.drawCount.textContent = this.gameState.drawPileCount;
        } else {
            this.drawCount.textContent = '0';
        }

        // Discard pile
        renderDiscardPile(this.discardPile, this.gameState.discardPile || []);
    }

    /**
     * Render team melds - my team always on left side
     */
    renderMelds() {
        if (!this.gameState.teamsMelds) return;

        // Use myTeam from server (more reliable)
        this.myTeam = this.gameState.myTeam || null;

        // Make own team's melds clickable when we have cards selected
        const canExtend = this.isMyTurn &&
            this.currentPhase !== 'draw' &&
            this.selectedCards.size >= 1;

        // Determine which team goes on which side (my team on left)
        const leftTeam = this.myTeam || 'A';
        const rightTeam = leftTeam === 'A' ? 'B' : 'A';
        
        // Update zone headers
        const leftHeader = this.teamAMelds.querySelector('.zone-header h4');
        const rightHeader = this.teamBMelds.querySelector('.zone-header h4');
        if (leftHeader) leftHeader.textContent = `Team ${leftTeam} (You)`;
        if (rightHeader) rightHeader.textContent = `Team ${rightTeam}`;

        // Render melds: left container = my team, right container = opponent team
        renderTeamMelds(this.teamAMelds, this.gameState.teamsMelds[leftTeam] || [], {
            onMeldClick: (meld) => this.handleExtendMeld(meld),
            isClickable: canExtend // My team is always clickable when I can extend
        });
        renderTeamMelds(this.teamBMelds, this.gameState.teamsMelds[rightTeam] || [], {
            onMeldClick: (meld) => this.handleExtendMeld(meld),
            isClickable: false // Opponent team never clickable
        });
    }

    /**
     * Render pozzetti status
     */
    /**
     * Render pozzetti status and card stacks
     */
    renderPozzetti() {
        if (!this.gameState.pozzettiCounts) return;
        if (this.gameState.pozzettiTaken) {
            this.pozzetto1.classList.toggle('taken', this.gameState.pozzettiTaken[0]);
            this.pozzetto2.classList.toggle('taken', this.gameState.pozzettiTaken[1]);
        }

        const updatePozzettoVisuals = (pozzettoEl, countEl, count) => {
            if (!pozzettoEl || !countEl) return;

            // textual count
            countEl.textContent = count > 0 ? `${count} cards` : 'Taken';

            // visual deck
            const stackContainer = pozzettoEl.querySelector('.card-stack') ||
                pozzettoEl.insertBefore(document.createElement('div'), pozzettoEl.firstChild);
            stackContainer.className = 'card-stack';
            stackContainer.innerHTML = '';

            if (count > 0) {
                // Create a stack visual (max 3 cards visible depth)
                const stack = createCardStackElement(count, { maxVisible: 3 });
                stackContainer.replaceWith(stack);
            } else {
                // Render empty placeholder or nothing
                stackContainer.innerHTML = '';
            }
        };

        // Update both pozzetti
        updatePozzettoVisuals(
            this.pozzetto1,
            document.getElementById('pozzetto-1-count'),
            this.gameState.pozzettiCounts[0]
        );

        updatePozzettoVisuals(
            this.pozzetto2,
            document.getElementById('pozzetto-2-count'),
            this.gameState.pozzettiCounts[1]
        );
    }

    /**
     * Update turn indicator
     */
    updateTurnIndicator() {
        const indicator = this.turnIndicator.parentElement;

        if (this.isMyTurn) {
            this.turnIndicator.textContent = `Your turn - ${this.getPhaseText()}`;
            indicator.classList.add('my-turn');
        } else {
            this.turnIndicator.textContent = `${this.gameState.currentPlayerNickname}'s turn`;
            indicator.classList.remove('my-turn');
        }
    }

    /**
     * Get readable phase text
     */
    getPhaseText() {
        switch (this.currentPhase) {
            case 'draw': return 'Draw a card';
            case 'meld': return 'Play melds or discard';
            case 'discard': return 'Discard a card';
            default: return '';
        }
    }

    /**
     * Update action button states
     */
    updateActionButtons() {
        const canDraw = this.isMyTurn && this.currentPhase === 'draw';
        const canMeld = this.isMyTurn && (this.currentPhase === 'meld' || this.currentPhase === 'discard');
        const canDiscard = this.isMyTurn && this.currentPhase !== 'draw' && this.selectedCards.size === 1;
        const canPlayMeld = this.isMyTurn && canMeld && this.selectedCards.size >= 3;

        this.drawBtn.disabled = !canDraw;
        this.takeDiscardBtn.disabled = !canDraw || (this.gameState.discardPile?.length === 0);
        this.discardBtn.disabled = !canDiscard;
        this.meldBtn.disabled = !canPlayMeld;

        // Highlight active buttons
        this.drawBtn.classList.toggle('highlight', canDraw);
        this.takeDiscardBtn.classList.toggle('highlight', canDraw);
        this.discardBtn.classList.toggle('highlight', canDiscard);
        this.meldBtn.classList.toggle('highlight', canPlayMeld);
    }

    /**
     * Update score display - respects team swap (my team on left)
     */
    updateScores() {
        if (this.gameState.scores) {
            // Determine which team is on which side
            const leftTeam = this.myTeam || 'A';
            const rightTeam = leftTeam === 'A' ? 'B' : 'A';

            // Update Top Bar (if exists)
            if (this.teamAPoints) this.teamAPoints.textContent = this.gameState.scores[leftTeam] || 0;
            if (this.teamBPoints) this.teamBPoints.textContent = this.gameState.scores[rightTeam] || 0;

            // Update Zone Points (left zone = my team, right zone = opponent)
            if (this.teamAZonePoints) this.teamAZonePoints.textContent = `${this.gameState.scores[leftTeam] || 0} Pts.`;
            if (this.teamBZonePoints) this.teamBZonePoints.textContent = `${this.gameState.scores[rightTeam] || 0} Pts.`;
        }
    }

    /**
     * Handle draw action
     */
    async handleDraw() {
        if (!this.isMyTurn || this.currentPhase !== 'draw') return;

        try {
            await gameClient.drawFromPile();
        } catch (err) {
            console.error('Draw failed:', err);
            alert(err.message);
        }
    }

    /**
     * Handle take discard pile action
     */
    async handleTakeDiscard() {
        if (!this.isMyTurn || this.currentPhase !== 'draw') return;

        try {
            await gameClient.takeDiscardPile();
        } catch (err) {
            console.error('Take discard failed:', err);
            alert(err.message);
        }
    }

    /**
     * Handle discard action
     */
    async handleDiscard() {
        if (this.currentPhase === 'draw') {
            alert('You must draw a card first!');
            return;
        }
        
        if (this.selectedCards.size !== 1) {
            alert('Select exactly one card to discard');
            return;
        }

        const cardId = Array.from(this.selectedCards)[0];

        try {
            await gameClient.discard(cardId);
            this.selectedCards.clear();
        } catch (err) {
            console.error('Discard failed:', err);
            alert(err.message);
        }
    }

    /**
     * Handle play meld action
     */
    async handlePlayMeld() {
        if (this.currentPhase === 'draw') {
            alert('You must draw a card first!');
            return;
        }
        
        if (this.selectedCards.size < 3) {
            alert('Select at least 3 cards to create a meld');
            return;
        }

        const cardIds = Array.from(this.selectedCards);

        try {
            await gameClient.playMeld(cardIds);
            this.selectedCards.clear();
        } catch (err) {
            console.error('Meld failed:', err);
            alert(err.message);
        }
    }
    /**
     * Handle extend meld action - add selected cards to existing meld
     */
    async handleExtendMeld(meld) {
        if (this.currentPhase === 'draw') {
            alert('You must draw a card first!');
            return;
        }
        
        if (this.selectedCards.size < 1) {
            alert('Select at least 1 card to add to the meld');
            return;
        }

        const cardIds = Array.from(this.selectedCards);

        try {
            await gameClient.extendMeld(meld.id, cardIds);
            this.selectedCards.clear();
        } catch (err) {
            console.error('Extend meld failed:', err);
            alert(err.message);
        }
    }
}

export default GameTableUI;
