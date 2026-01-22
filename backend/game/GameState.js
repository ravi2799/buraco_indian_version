/**
 * Core game state for Buraco
 * Manages turns, actions, and game flow
 */

import { validateMeld, canExtendMeld, sortSequenceMeld } from './MeldValidator.js';
import { calculateTeamScore, calculateMeldScore, checkGameEnd } from './Scoring.js';

/**
 * Game phases within a turn
 */
const PHASES = {
    DRAW: 'draw',
    MELD: 'meld',
    DISCARD: 'discard'
};

export default class GameState {
    constructor({ playerCount, players, hands, pozzetti, drawPile, discardPile, config = {} }) {
        this.playerCount = playerCount;
        this.players = players; // Array of { socketId, nickname, team, seat }

        // Room configuration
        this.config = {
            turnTimer: config.turnTimer ?? 60,
            deckCount: config.deckCount ?? 3,
            jokersPerDeck: config.jokersPerDeck ?? 2
        };

        // Card state
        this.hands = new Map(); // socketId -> cards array
        this.drawPile = drawPile;
        this.discardPile = discardPile;
        this.pozzetti = pozzetti; // [pozzetto1, pozzetto2]

        // Team state
        this.teams = {
            A: { melds: [], tookPozzetto: false, wentOut: false, playerIds: [] },
            B: { melds: [], tookPozzetto: false, wentOut: false, playerIds: [] }
        };

        // Initialize hands and team memberships
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            this.hands.set(player.socketId, hands[i]);
            this.teams[player.team].playerIds.push(player.socketId);
        }

        // Turn state
        this.currentPlayerIndex = 0;
        this.currentPhase = PHASES.DRAW;
        this.turnCount = 0;

        // Game state
        this.isGameOver = false;
        this.winner = null;
        this.scores = { A: 0, B: 0 };

        // Stalemate detection
        this.stalemateMoves = 0;
    }

    /**
     * Get current player's socket ID
     */
    getCurrentPlayerId() {
        return this.players[this.currentPlayerIndex].socketId;
    }

    /**
     * Get current player info
     */
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    /**
     * Get the view of game state for a specific player
     * Hides other players' hands, shows only card counts
     */
    getPlayerView(socketId) {
        const playerInfo = this.players.find(p => p.socketId === socketId);
        if (!playerInfo) return null;

        return {
            // Own hand
            hand: this.hands.get(socketId),

            // Player's own team
            myTeam: playerInfo.team,
            myNickname: playerInfo.nickname,
            myAvatarId: playerInfo.avatarId,

            // Other players (hidden hands)
            players: this.players.map(p => ({
                nickname: p.nickname,
                seat: p.seat,
                team: p.team,
                avatarId: p.avatarId,
                cardCount: this.hands.get(p.socketId)?.length || 0,
                isCurrentPlayer: p.socketId === this.getCurrentPlayerId()
            })),

            // Shared state
            drawPileCount: this.drawPile.length,
            discardPile: this.discardPile,
            topDiscard: this.discardPile[this.discardPile.length - 1],

            // Team melds
            teamsMelds: {
                A: this.teams.A.melds,
                B: this.teams.B.melds
            },

            // Pozzetti status (shared - not team-specific)
            // Dynamically map all pozzetti (could be 2, 3, or 4)
            pozzettiTaken: this.pozzetti.map(p => p?.length === 0),

            // Pozzetti card counts
            pozzettiCounts: this.pozzetti.map(p => p?.length || 0),

            // Turn info
            isMyTurn: socketId === this.getCurrentPlayerId(),
            currentPhase: this.currentPhase,
            currentPlayerNickname: this.getCurrentPlayer().nickname,

            // Game status
            isGameOver: this.isGameOver,
            winner: this.winner,
            scores: this.getLiveScores(),

            // Room config (for timer, etc.)
            config: this.config
        };
    }

    /**
     * Draw from the draw pile
     */
    drawFromPile(socketId) {
        if (socketId !== this.getCurrentPlayerId()) {
            return { success: false, reason: 'Not your turn' };
        }
        if (this.currentPhase !== PHASES.DRAW) {
            return { success: false, reason: 'Cannot draw now' };
        }
        if (this.drawPile.length === 0) {
            return { success: false, reason: 'Draw pile is empty' };
        }

        const card = this.drawPile.pop();
        this.hands.get(socketId).unshift(card);  // Add to left side

        this.currentPhase = PHASES.MELD;

        return { success: true, card };
    }

    /**
     * Take the entire discard pile
     */
    takeDiscardPile(socketId) {
        if (socketId !== this.getCurrentPlayerId()) {
            return { success: false, reason: 'Not your turn' };
        }
        if (this.currentPhase !== PHASES.DRAW) {
            return { success: false, reason: 'Cannot take discard pile now' };
        }
        if (this.discardPile.length === 0) {
            return { success: false, reason: 'Discard pile is empty' };
        }

        const cards = [...this.discardPile];
        this.discardPile = [];
        this.hands.get(socketId).unshift(...cards);  // Add to left side

        this.currentPhase = PHASES.MELD;

        return { success: true, cards };
    }

    /**
     * Play a new meld
     */
    playMeld(socketId, cardIds) {
        if (socketId !== this.getCurrentPlayerId()) {
            return { success: false, reason: 'Not your turn' };
        }
        if (this.currentPhase !== PHASES.MELD) {
            return { success: false, reason: 'Cannot meld now' };
        }

        const hand = this.hands.get(socketId);
        const player = this.players.find(p => p.socketId === socketId);
        const team = this.teams[player.team];

        // Find cards from hand
        const cards = [];
        for (const cardId of cardIds) {
            const card = hand.find(c => c.id === cardId);
            if (!card) {
                return { success: false, reason: 'Card not in hand' };
            }
            cards.push(card);
        }

        // Validate meld
        const validation = validateMeld(cards);
        if (!validation.valid) {
            return { success: false, reason: validation.reason };
        }

        // Note: In Buraco with multiple decks, teams CAN have multiple sets of the same rank
        // For example, two separate 10-10-10 melds are valid

        // Remove cards from hand
        for (const card of cards) {
            const idx = hand.findIndex(c => c.id === card.id);
            hand.splice(idx, 1);
        }

        // Sort sequence melds to place wild cards in correct positions
        let sortedCards = cards;
        if (validation.type === 'sequence') {
            sortedCards = sortSequenceMeld(cards, validation.suit);
        }

        // Add meld to team
        team.melds.push({
            id: `meld-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            cards: sortedCards,
            type: validation.type,
            rank: validation.rank,
            suit: validation.suit,
            isClean: validation.isClean,
            isBurraco: validation.isBurraco
        });

        // Check if hand is empty - take pozzetto
        if (hand.length === 0) {
            return this.handleEmptyHand(socketId);
        }

        return { success: true, meld: validation };
    }

    /**
     * Extend an existing team meld
     */
    extendMeld(socketId, meldId, cardIds) {
        if (socketId !== this.getCurrentPlayerId()) {
            return { success: false, reason: 'Not your turn' };
        }
        if (this.currentPhase !== PHASES.MELD) {
            return { success: false, reason: 'Cannot meld now' };
        }

        const hand = this.hands.get(socketId);
        const player = this.players.find(p => p.socketId === socketId);
        const team = this.teams[player.team];

        // Find the meld
        const meld = team.melds.find(m => m.id === meldId);
        if (!meld) {
            return { success: false, reason: 'Meld not found' };
        }

        // Find cards from hand
        const cards = [];
        for (const cardId of cardIds) {
            const card = hand.find(c => c.id === cardId);
            if (!card) {
                return { success: false, reason: 'Card not in hand' };
            }
            cards.push(card);
        }

        // Validate extended meld
        const validation = canExtendMeld(meld.cards, cards, meld);
        if (!validation.valid) {
            return { success: false, reason: validation.reason };
        }

        // Remove cards from hand
        for (const card of cards) {
            const idx = hand.findIndex(c => c.id === card.id);
            hand.splice(idx, 1);
        }

        // Update meld
        meld.cards.push(...cards);
        meld.isClean = validation.isClean;
        meld.isBurraco = validation.isBurraco;

        // Sort sequence melds to place cards in correct order
        if (meld.type === 'sequence') {
            meld.cards = sortSequenceMeld(meld.cards, meld.suit);
        }

        // Check if hand is empty - take pozzetto
        if (hand.length === 0) {
            return this.handleEmptyHand(socketId);
        }

        return { success: true, meld: validation };
    }

    /**
     * Replace a wild card in a meld with a natural card from hand
     * The wild card goes back to the player's hand
     */
    replaceWildInMeld(socketId, meldId, wildCardId, naturalCardId) {
        if (socketId !== this.getCurrentPlayerId()) {
            return { success: false, reason: 'Not your turn' };
        }
        if (this.currentPhase !== PHASES.MELD) {
            return { success: false, reason: 'Cannot modify melds now' };
        }

        const hand = this.hands.get(socketId);
        const player = this.players.find(p => p.socketId === socketId);
        const team = this.teams[player.team];

        // Find the meld
        const meld = team.melds.find(m => m.id === meldId);
        if (!meld) {
            return { success: false, reason: 'Meld not found' };
        }

        // Only works for sequences
        if (meld.type !== 'sequence') {
            return { success: false, reason: 'Can only replace wilds in sequences' };
        }

        // Find the wild card in the meld
        const wildIdx = meld.cards.findIndex(c => c.id === wildCardId);
        if (wildIdx === -1) {
            return { success: false, reason: 'Wild card not found in meld' };
        }

        const wildCard = meld.cards[wildIdx];
        if (wildCard.rank !== 'JOKER') {
            return { success: false, reason: 'Selected card is not a wild card (only Jokers are wild)' };
        }

        // Find the natural card in hand
        const naturalCard = hand.find(c => c.id === naturalCardId);
        if (!naturalCard) {
            return { success: false, reason: 'Natural card not in hand' };
        }

        // The natural card must be the same suit as the meld
        if (naturalCard.suit !== meld.suit) {
            return { success: false, reason: 'Card must match the meld suit' };
        }

        // Create new meld without the wild, add the natural
        const newMeldCards = meld.cards.filter(c => c.id !== wildCardId);
        newMeldCards.push(naturalCard);

        // Validate the new meld
        const validation = validateMeld(newMeldCards);
        if (!validation.valid) {
            return { success: false, reason: 'Replacement would create invalid meld' };
        }

        // Perform the swap
        // Remove natural from hand
        const handIdx = hand.findIndex(c => c.id === naturalCardId);
        hand.splice(handIdx, 1);

        // Add wild to hand
        hand.push(wildCard);

        // Update meld cards
        meld.cards = sortSequenceMeld(newMeldCards, meld.suit);
        meld.isClean = validation.isClean;
        meld.isBurraco = validation.isBurraco;

        return { success: true, returnedWild: wildCard };
    }

    /**
     * Handle empty hand - take pozzetto
     */
    handleEmptyHand(socketId) {
        const player = this.players.find(p => p.socketId === socketId);
        const team = this.teams[player.team];

        if (team.tookPozzetto) {
            // Already took pozzetto - player can go out
            // Going out is handled in discard
            return { success: true, canGoOut: true };
        }

        // Take the first available pozzetto (any team can take any pozzetto)
        for (let i = 0; i < this.pozzetti.length; i++) {
            // Check if this pozzetto is still available (not taken by any team)
            const isTaken = Object.values(this.teams).some(t => t.pozzettoIndex === i);
            if (!isTaken && this.pozzetti[i] && this.pozzetti[i].length > 0) {
                const pozzetto = this.pozzetti[i];
                this.hands.set(socketId, [...pozzetto]);
                team.tookPozzetto = true;
                team.pozzettoIndex = i; // Track which pozzetto was taken
                team.pozzettoCount = (team.pozzettoCount || 0) + 1; // Increment count (+50 per pozzetto)
                this.pozzetti[i] = []; // Mark as taken
                return {
                    success: true,
                    tookPozzetto: true,
                    cards: pozzetto.length,
                    pozzettoIndex: i,
                    playerNickname: player.nickname,
                    playerSeat: player.seat
                };
            }
        }

        return { success: true };
    }

    /**
     * Discard a card (end turn)
     */
    discard(socketId, cardId) {
        if (socketId !== this.getCurrentPlayerId()) {
            return { success: false, reason: 'Not your turn' };
        }
        if (this.currentPhase !== PHASES.MELD && this.currentPhase !== PHASES.DISCARD) {
            return { success: false, reason: 'Cannot discard now' };
        }

        const hand = this.hands.get(socketId);
        const player = this.players.find(p => p.socketId === socketId);
        const team = this.teams[player.team];

        // Find card in hand
        const cardIndex = hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) {
            return { success: false, reason: 'Card not in hand' };
        }

        const card = hand[cardIndex];

        // Remove from hand
        hand.splice(cardIndex, 1);

        // Add to discard pile
        this.discardPile.push(card);

        let pozzettoInfo = null;

        // If hand is empty, check for pozzetto or going out
        if (hand.length === 0) {
            // Check if any pozzetto is available
            const availablePozzettoIndex = this.pozzetti.findIndex(p => p && p.length > 0);

            if (availablePozzettoIndex === -1) {
                // No pozzetti left - player goes out and wins!
                team.wentOut = true;
                this.endGame('closing');
                return { success: true, gameOver: true, winner: player.team };
            } else {
                // Take the available pozzetto
                const pozzetto = this.pozzetti[availablePozzettoIndex];
                this.hands.set(socketId, [...pozzetto]);
                team.tookPozzetto = true;
                team.pozzettoIndex = availablePozzettoIndex;
                team.pozzettoCount = (team.pozzettoCount || 0) + 1; // +50 per pozzetto
                this.pozzetti[availablePozzettoIndex] = []; // Mark as taken

                // Store pozzetto info for broadcasting
                pozzettoInfo = {
                    tookPozzetto: true,
                    cards: pozzetto.length,
                    pozzettoIndex: availablePozzettoIndex,
                    playerNickname: player.nickname,
                    playerSeat: player.seat
                };
            }
        }

        // Next turn
        this.nextTurn();

        return { success: true, pozzettoInfo };
    }

    /**
     * Advance to next player's turn
     */
    nextTurn() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerCount;
        this.currentPhase = PHASES.DRAW;
        this.turnCount++;
    }

    /**
     * Get live scores calculated from current melds (without hand penalties)
     */
    getLiveScores() {
        const scores = { A: 0, B: 0 };

        for (const [teamId, team] of Object.entries(this.teams)) {
            if (team.melds && team.melds.length > 0) {
                const meldResult = calculateMeldScore(team.melds);
                scores[teamId] = meldResult.score;
            }
        }

        return scores;
    }

    /**
     * End the game and calculate scores
     */
    endGame(reason) {
        this.isGameOver = true;
        this.endReason = reason;

        // Calculate scores for each team
        for (const [teamId, team] of Object.entries(this.teams)) {
            const teamHands = team.playerIds.map(id => this.hands.get(id) || []);
            const scoreResult = calculateTeamScore({
                melds: team.melds,
                hands: teamHands,
                pozzettoCount: team.pozzettoCount || 0,
                wentOut: team.wentOut
            });
            this.scores[teamId] = scoreResult.totalScore;
            team.scoreDetails = scoreResult;
        }

        // Determine winner
        if (this.scores.A > this.scores.B) {
            this.winner = 'A';
        } else if (this.scores.B > this.scores.A) {
            this.winner = 'B';
        } else {
            this.winner = 'tie';
        }
    }

    /**
     * Get full game result
     */
    getGameResult() {
        return {
            winner: this.winner,
            scores: this.scores,
            endReason: this.endReason,
            teamDetails: {
                A: this.teams.A.scoreDetails,
                B: this.teams.B.scoreDetails
            }
        };
    }
}
