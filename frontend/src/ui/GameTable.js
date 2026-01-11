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

        // DOM elements
        this.playerHand = document.getElementById('player-hand');
        this.opponentsArea = document.getElementById('opponents-area');
        this.drawPile = document.getElementById('draw-pile');
        this.discardPile = document.getElementById('discard-pile');
        this.teamAMelds = document.getElementById('team-a-melds');
        this.teamBMelds = document.getElementById('team-b-melds');
        this.drawCount = document.getElementById('draw-count');
        this.turnIndicator = document.getElementById('current-turn');
        this.teamAZonePoints = document.getElementById('team-a-zone-points');
        this.teamBZonePoints = document.getElementById('team-b-zone-points');

        // Action buttons
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
     * Initialize the game UI with initial state
     */
    initGame(gameState) {
        this.gameState = gameState;
        this.selectedCards.clear();
        this.renderAll();
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

        this.isMyTurn = this.gameState.isMyTurn;
        this.currentPhase = this.gameState.currentPhase;

        this.renderPlayerHand();
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
            onCardClick: (card) => this.handleCardClick(card)
        });
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
     * Render opponent hands
     */
    renderOpponents() {
        if (!this.gameState?.players) return;

        this.opponentsArea.innerHTML = '';

        // Find opponents (everyone except current player)
        const opponents = this.gameState.players.filter(p =>
            p.cardCount !== undefined && p.cardCount >= 0 &&
            this.gameState.hand && p.cardCount !== this.gameState.hand.length
        );

        for (const opponent of this.gameState.players) {
            // Skip self (match by comparing if this player has the hand we're showing)
            if (opponent.cardCount === this.gameState.hand?.length) {
                // This might be us - check if it's marked as current player and we're it
                const isUs = this.gameState.hand?.length === opponent.cardCount;
                // Skip if this seems to be us
                if (this.gameState.players.length > 1) {
                    const selfIndex = this.gameState.players.findIndex(p =>
                        p.cardCount === this.gameState.hand?.length && !p.isCurrentPlayer
                    );
                    if (selfIndex === this.gameState.players.indexOf(opponent)) continue;
                }
            }

            const opponentContainer = document.createElement('div');
            renderOpponentHand(
                opponentContainer,
                opponent.cardCount,
                opponent.nickname,
                opponent.isCurrentPlayer && !this.isMyTurn
            );
            this.opponentsArea.appendChild(opponentContainer.firstChild);
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
     * Render team melds
     */
    renderMelds() {
        if (!this.gameState.teamsMelds) return;

        // Use myTeam from server (more reliable)
        this.myTeam = this.gameState.myTeam || null;

        // Make own team's melds clickable when we have cards selected
        const canExtend = this.isMyTurn &&
            this.currentPhase !== 'draw' &&
            this.selectedCards.size >= 1;

        renderTeamMelds(this.teamAMelds, this.gameState.teamsMelds.A || [], {
            onMeldClick: (meld) => this.handleExtendMeld(meld),
            isClickable: canExtend && this.myTeam === 'A'
        });
        renderTeamMelds(this.teamBMelds, this.gameState.teamsMelds.B || [], {
            onMeldClick: (meld) => this.handleExtendMeld(meld),
            isClickable: canExtend && this.myTeam === 'B'
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
     * Update score display
     */
    updateScores() {
        if (this.gameState.scores) {
            // Update Top Bar (if exists)
            if (this.teamAPoints) this.teamAPoints.textContent = this.gameState.scores.A || 0;
            if (this.teamBPoints) this.teamBPoints.textContent = this.gameState.scores.B || 0;

            // Update Zone Points (if exists)
            if (this.teamAZonePoints) this.teamAZonePoints.textContent = `${this.gameState.scores.A || 0} Pts.`;
            if (this.teamBZonePoints) this.teamBZonePoints.textContent = `${this.gameState.scores.B || 0} Pts.`;
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
