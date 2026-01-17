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
        // this.opponentsArea = document.getElementById('opponents-area');
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
        this.sortHandBtn.addEventListener('click', () => this.sortAndRenderHand());

        // Game events
        gameClient.on('gameStateUpdate', (data) => {
            this.updateGameState(data.gameState);
        });

        gameClient.on('gameOver', (data) => {
            if (this.onGameOver) {
                this.onGameOver(data.result);
            }
        });

        // Player action animations
        gameClient.on('playerAction', (data) => {
            this.showActionAnimation(data);
        });
    }

    /**
     * Show visual animation for player actions (draw, take discard, take pozzetto)
     */
    showActionAnimation(action) {
        const { type, playerNickname, cardCount } = action;
        const isMe = playerNickname === this.gameState?.myNickname;

        // Get icon and description based on action type
        let icon = '🃏';
        let desc = '';
        let sourceElement = null;

        switch (type) {
            case 'drawFromPile':
                icon = '📥';
                desc = 'drew a card';
                sourceElement = this.drawPile;
                break;
            case 'takeDiscardPile':
                icon = '🎴';
                desc = `took ${cardCount} cards from discard`;
                sourceElement = this.discardPile;
                break;
            case 'takePozzetto':
                icon = '🎁';
                desc = `took the pozzetto (${cardCount} cards)`;
                sourceElement = this.pozzetto1?.classList.contains('taken') ? this.pozzetto2 : this.pozzetto1;
                break;
            default:
                return;
        }

        // Add glow effect to source pile
        if (sourceElement) {
            if (type === 'drawFromPile') {
                this.drawPile.classList.add('drawing');
                setTimeout(() => this.drawPile.classList.remove('drawing'), 400);
            } else if (type === 'takeDiscardPile') {
                this.discardPile.classList.add('taking');
                setTimeout(() => this.discardPile.classList.remove('taking'), 400);
            } else if (type === 'takePozzetto') {
                sourceElement?.classList.add('taking');
                setTimeout(() => sourceElement?.classList.remove('taking'), 600);
            }
        }

        // Create flying cards animation
        if (sourceElement && type !== 'drawFromPile') {
            this.createFlyingCards(sourceElement, cardCount, isMe);
        } else if (type === 'drawFromPile') {
            this.createFlyingCards(this.drawPile, 1, isMe);
        }

        // Show action toast (skip for self on simple draw)
        if (!isMe || type !== 'drawFromPile') {
            this.showActionToast(icon, playerNickname, desc, isMe);
        }
    }

    /**
     * Create flying card animation from source to player position
     */
    createFlyingCards(sourceElement, count, isMe) {
        if (!sourceElement) return;

        const rect = sourceElement.getBoundingClientRect();
        const cardsToAnimate = Math.min(count, 5); // Max 5 cards for performance

        // Create container if not exists
        let container = document.querySelector('.flying-card-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'flying-card-container';
            document.body.appendChild(container);
        }

        for (let i = 0; i < cardsToAnimate; i++) {
            setTimeout(() => {
                const card = document.createElement('div');
                card.className = 'flying-card';
                card.style.left = `${rect.left + rect.width / 2 - 35}px`;
                card.style.top = `${rect.top + rect.height / 2 - 50}px`;
                card.style.animation = isMe ? 'flyToBottom 0.6s ease-out forwards' : 'flyToTop 0.6s ease-out forwards';
                container.appendChild(card);

                // Remove after animation
                setTimeout(() => card.remove(), 600);
            }, i * 80); // Stagger cards
        }
    }

    /**
     * Show action toast notification
     */
    showActionToast(icon, playerName, desc, isMe) {
        // Remove existing toast
        const existing = document.querySelector('.action-toast-container');
        if (existing) existing.remove();

        const container = document.createElement('div');
        container.className = 'action-toast-container';
        container.innerHTML = `
            <div class="action-toast">
                <span class="toast-icon">${icon}</span>
                <div class="toast-text">
                    <span class="player-name">${isMe ? 'You' : playerName}</span>
                    <span class="action-desc">${desc}</span>
                </div>
            </div>
        `;
        document.body.appendChild(container);

        // Remove after animation (2s total)
        setTimeout(() => container.remove(), 2000);
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

        // Initialize custom card order with initial hand
        if (gameState.hand && gameState.hand.length > 0) {
            this.customCardOrder = gameState.hand.map(c => c.id);
        } else {
            this.customCardOrder = null;
        }

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
     * Preserves custom card order across state updates
     */
    updateGameState(gameState) {
        const oldHand = this.gameState?.hand || [];
        this.gameState = gameState;
        this.selectedCards.clear();

        // Preserve custom card order when hand changes
        this.updateCustomCardOrder(oldHand, gameState.hand || []);

        this.renderAll();
    }

    /**
     * Update custom card order to handle added/removed cards
     * New cards are added to the left, removed cards are filtered out
     */
    updateCustomCardOrder(oldHand, newHand) {
        if (!newHand || newHand.length === 0) {
            this.customCardOrder = null;
            return;
        }

        const newCardIds = new Set(newHand.map(c => c.id));
        const oldCardIds = new Set(oldHand.map(c => c.id));

        // Find new cards (cards in new hand but not in old hand)
        const addedCardIds = newHand
            .filter(c => !oldCardIds.has(c.id))
            .map(c => c.id);

        // If no custom order exists, create one from current hand
        if (!this.customCardOrder) {
            this.customCardOrder = newHand.map(c => c.id);
            return;
        }

        // Filter out removed cards from existing order
        const filteredOrder = this.customCardOrder.filter(id => newCardIds.has(id));

        // Add new cards to the LEFT (beginning) of the order
        this.customCardOrder = [...addedCardIds, ...filteredOrder];
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
            onReorder: (draggedId, targetId, dropSide) => {
                this.handleCardReorder(draggedId, targetId, dropSide);
            }
        });
    }

    /**
     * Adjust draw pile position based on discard pile card count
     * Moves left by ~30px per card added to discard pile
     */
    adjustDrawPilePosition() {
        if (!this.drawPile) return;

        const discardCount = this.gameState?.discardPile?.length || 0;

        // Move left by 5px per card (after first card)
        const offsetPerCard = 5;
        const offset = Math.max(0, (discardCount - 1) * offsetPerCard);

        // Limit offset to not go beyond left edge of screen
        const maxOffset = this.drawPile.getBoundingClientRect().left - 20;
        const finalOffset = Math.min(offset, maxOffset);

        if (finalOffset > 0) {
            this.drawPile.style.transform = `scale(0.8) translateX(-${finalOffset}px)`;
        } else {
            this.drawPile.style.transform = 'scale(0.8)';
        }
    }

    /**
     * Handle card reordering in hand
     * @param {string} draggedId - ID of the card being dragged
     * @param {string} targetId - ID of the card being dropped on
     * @param {string} dropSide - 'left' or 'right' of target card
     */
    handleCardReorder(draggedId, targetId, dropSide = 'right') {
        if (!this.gameState?.hand || this.gameState.hand.length === 0) return;
        if (draggedId === targetId) return; // Can't drop on self

        // Ensure we have a valid custom order
        if (!this.customCardOrder) {
            this.customCardOrder = this.gameState.hand.map(c => c.id);
        }

        // Get current order
        const currentOrder = [...this.customCardOrder];

        // Find positions
        const draggedIdx = currentOrder.indexOf(draggedId);
        const originalTargetIdx = currentOrder.indexOf(targetId);

        // Validate indices
        if (draggedIdx === -1) {
            console.warn('Dragged card not found in order:', draggedId);
            return;
        }
        if (originalTargetIdx === -1) {
            console.warn('Target card not found in order:', targetId);
            return;
        }

        // Remove dragged card first
        currentOrder.splice(draggedIdx, 1);

        // Recalculate target index after removal
        const newTargetIdx = currentOrder.indexOf(targetId);
        if (newTargetIdx === -1) {
            console.warn('Target card lost after removal');
            return;
        }

        // Insert at correct position based on drop side
        const insertIdx = dropSide === 'left' ? newTargetIdx : newTargetIdx + 1;
        currentOrder.splice(insertIdx, 0, draggedId);

        this.customCardOrder = currentOrder;
        this.renderPlayerHand();
    }

    /**
     * Sort hand by suit then rank and render
     */
    sortAndRenderHand() {
        if (!this.gameState?.hand) return;

        const suitOrder = ['hearts', 'diamonds', 'clubs', 'spades', 'joker'];
        const rankOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'JOKER'];

        const sortedCards = [...this.gameState.hand].sort((a, b) => {
            const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
            if (suitDiff !== 0) return suitDiff;
            return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
        });

        this.customCardOrder = sortedCards.map(c => c.id);
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
        const teamClass = this.myTeam === 'A' ? 'team-a' : 'team-b';

        this.opponentBadge.innerHTML = `
            <div class="player-info-badge ${teamClass} ${isOpponentTurn ? 'current-turn' : ''}">
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

        // Adjust draw pile position based on discard pile size
        this.adjustDrawPilePosition();
    }

    getTeamPlayerNames(team) {
        const players = this.gameState?.players || [];
        return players
            .filter(p => p.team === team)
            .map(p => p.nickname)
            .join(', ');
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

        // Names for each team
        const leftNames = this.getTeamPlayerNames(leftTeam);
        const rightNames = this.getTeamPlayerNames(rightTeam);

        // Update zone headers
        const leftHeader = this.teamAMelds.querySelector('.zone-header h4');
        const rightHeader = this.teamBMelds.querySelector('.zone-header h4');
        if (leftHeader) leftHeader.textContent = `Team ${leftTeam} (You) — ${leftNames}`;
        if (rightHeader) rightHeader.textContent = `Team ${rightTeam} - ${rightNames}`;

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
     * Check if selected cards form a valid meld
     * Rules:
     * - Minimum 3 cards, maximum 7 cards
     * - Maximum 1 joker per meld
     * - Same rank meld: A A A or A A JOKER (same rank, different suits)
     * - Sequence meld: A K Q or JOKER A K Q (same suit, consecutive ranks)
     * - Ace can be high (A-K-Q) or low (A-2-3)
     */
    isValidMeld(cardIds) {
        if (cardIds.length < 3 || cardIds.length > 7) return false;

        const cards = cardIds.map(id =>
            this.gameState.hand.find(c => c.id === id)
        ).filter(Boolean);

        if (cards.length < 3) return false;

        // Separate jokers and natural cards
        const jokers = cards.filter(c => c.rank === 'JOKER');
        const natural = cards.filter(c => c.rank !== 'JOKER');

        // Maximum 1 joker per meld
        if (jokers.length > 1) return false;

        // Need at least 2 natural cards
        if (natural.length < 2) return false;

        // Check if same rank meld (e.g., A A A or A A JOKER)
        const firstRank = natural[0].rank;
        const allSameRank = natural.every(c => c.rank === firstRank);

        if (allSameRank) {
            // Same rank melds are valid with 3+ cards and max 1 joker
            return cards.length >= 3;
        }

        // Check if sequence (all same suit, consecutive ranks)
        const firstSuit = natural[0].suit;
        const allSameSuit = natural.every(c => c.suit === firstSuit);

        if (!allSameSuit) return false;

        // Try both Ace-low (A=1) and Ace-high (A=14) for sequences
        const isValidSequence = (aceValue) => {
            const rankValues = { 'A': aceValue, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 };
            const sorted = natural.map(c => ({ rank: c.rank, value: rankValues[c.rank] }))
                .sort((a, b) => a.value - b.value);

            // Check if consecutive allowing joker to fill gaps
            let totalGaps = 0;
            for (let i = 1; i < sorted.length; i++) {
                const gap = sorted[i].value - sorted[i - 1].value - 1;

                if (gap < 0) {
                    return false; // Duplicate rank in sequence
                }

                totalGaps += gap;
            }

            // Total gaps must be fillable by the joker(s)
            return totalGaps <= jokers.length;
        };

        // Valid if sequence works with Ace as 1 OR Ace as 14
        return isValidSequence(1) || isValidSequence(14);
    }

    /**
     * Update action button states
     */
    updateActionButtons() {
        const handCount = this.gameState?.hand?.length || 0
        const selectedCount = this.selectedCards.size;
        const leavesAtLeastOneCard = (handCount - selectedCount) >= 1;


        const canDraw = this.isMyTurn && this.currentPhase === 'draw';
        const canMeldPhase = this.isMyTurn && (this.currentPhase === 'meld' || this.currentPhase === 'discard');

        const canDiscard = this.isMyTurn && this.currentPhase !== 'draw' && this.selectedCards.size === 1;

        // Must be >= 3, form valid meld, AND leave at least 1 card in hand
        const cardIds = Array.from(this.selectedCards);
        const canPlayMeld = canMeldPhase && selectedCount >= 3 && leavesAtLeastOneCard && this.isValidMeld(cardIds);

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
