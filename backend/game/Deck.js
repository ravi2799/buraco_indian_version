/**
 * Deck management for Buraco
 * Two standard 52-card decks + 4 jokers = 108 cards
 */

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/**
 * Card point values for scoring
 */
export const CARD_VALUES = {
  'JOKER': 10, 'A': 10, 'K': 10, 'Q': 10, 'J': 10, '10': 10,
  '9': 5, '8': 5, '7': 5, '6': 5, '5': 5, '4': 5, '3': 5, '2': 5,
};

/**
 * Create a single card object
 */
function createCard(suit, rank, deckIndex) {
  return {
    id: `${suit}-${rank}-${deckIndex}`,
    suit,
    rank,
    isWild: rank === 'JOKER' || rank === '2',
    isJoker: rank === 'JOKER',
    value: CARD_VALUES[rank]
  };
}

/**
 * Create the full 108-card deck (2 standard decks + 4 jokers)
 */
export function createDeck() {
  const deck = [];

  // Create two copies of the standard deck
  for (let deckIndex = 0; deckIndex < 2; deckIndex++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push(createCard(suit, rank, deckIndex));
      }
    }
    // Add 2 jokers per deck
    deck.push(createCard('joker', 'JOKER', deckIndex * 2));
    deck.push(createCard('joker', 'JOKER', deckIndex * 2 + 1));
  }

  return deck;
}

/**
 * Fisher-Yates shuffle
 */
export function shuffle(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deal cards for a game
 * @param {number} playerCount - Number of players (2, 4, or 6)
 * @returns {object} - { hands, pozzetti, drawPile, discardPile }
 */
export function dealCards(playerCount) {
  const deck = shuffle(createDeck());

  const hands = [];
  const cardsPerHand = 11;

  // Deal 11 cards to each player
  for (let i = 0; i < playerCount; i++) {
    hands.push(deck.splice(0, cardsPerHand));
  }

  // Create pozzetti (11 cards each)
  // For 2 players: 2 pozzetti
  // For 4 players: 2 pozzetti (one per team)
  // For 6 players: 2 pozzetti (one per team)
  const pozzetti = [
    deck.splice(0, 11),
    deck.splice(0, 11)
  ];

  // First card of discard pile
  const discardPile = [deck.splice(0, 1)[0]];

  // Remaining cards are the draw pile
  const drawPile = deck;

  return {
    hands,
    pozzetti,
    drawPile,
    discardPile
  };
}

/**
 * Get the rank index for sequence validation (A=0 at low end, A=13 at high end)
 */
export function getRankIndex(rank) {
  const order = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  return order.indexOf(rank);
}

/**
 * Calculate the total point value of a set of cards
 */
export function calculateCardsValue(cards) {
  return cards.reduce((sum, card) => sum + card.value, 0);
}
