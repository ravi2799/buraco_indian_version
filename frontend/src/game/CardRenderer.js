/**
 * Card Renderer
 * Creates and manages card DOM elements
 */

const SUIT_SYMBOLS = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
    joker: '★'
};

/**
 * Create a card DOM element
 */
export function createCardElement(card, options = {}) {
    const { faceDown = false, mini = false, clickable = true } = options;

    const cardEl = document.createElement('div');
    cardEl.className = `card ${card.suit}`;
    cardEl.dataset.cardId = card.id;

    if (mini) cardEl.classList.add('mini');
    if (!clickable) cardEl.classList.add('disabled');

    if (faceDown) {
        cardEl.innerHTML = '<div class="card-back"></div>';
    } else {
        cardEl.innerHTML = createCardFaceHTML(card);
    }

    return cardEl;
}

/**
 * Create HTML for card face
 */
function createCardFaceHTML(card) {
    if (card.rank === 'JOKER') {
        return `
      <div class="card-face">
        <div class="card-corner top">
          <span class="card-rank">★</span>
        </div>
        <div class="card-center">JOKER</div>
        <div class="card-corner bottom">
          <span class="card-rank">★</span>
        </div>
      </div>
    `;
    }

    const suitSymbol = SUIT_SYMBOLS[card.suit];
    const displayRank = card.rank === '10' ? '10' : card.rank;

    return `
    <div class="card-face">
      <div class="card-corner top">
        <span class="card-rank">${displayRank}</span>
        <span class="card-suit-small">${suitSymbol}</span>
      </div>
      <div class="card-center">${suitSymbol}</div>
      <div class="card-corner bottom">
        <span class="card-rank">${displayRank}</span>
        <span class="card-suit-small">${suitSymbol}</span>
      </div>
    </div>
  `;
}

/**
 * Create card back element
 */
export function createCardBackElement(mini = false) {
    const cardEl = document.createElement('div');
    cardEl.className = 'card' + (mini ? ' mini' : '');
    cardEl.innerHTML = '<div class="card-back"></div>';
    return cardEl;
}

/**
 * Create a stack of card backs (for draw pile, pozzetto)
 */
export function createCardStackElement(count, options = {}) {
    const { maxVisible = 3 } = options;
    const stackEl = document.createElement('div');
    stackEl.className = 'card-stack';

    const visibleCount = Math.min(count, maxVisible);
    for (let i = 0; i < visibleCount; i++) {
        stackEl.appendChild(createCardBackElement());
    }

    return stackEl;
}

/**
 * Render a player's hand
 */
export function renderHand(container, cards, options = {}) {
    const { selectedIds = [], onCardClick } = options;

    container.innerHTML = '';

    // Sort cards for display (by suit then rank)
    const sortedCards = [...cards].sort((a, b) => {
        const suitOrder = ['hearts', 'diamonds', 'clubs', 'spades', 'joker'];
        const rankOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'JOKER'];

        const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
        if (suitDiff !== 0) return suitDiff;
        return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
    });

    for (const card of sortedCards) {
        const cardEl = createCardElement(card);

        if (selectedIds.includes(card.id)) {
            cardEl.classList.add('selected');
        }

        if (onCardClick) {
            cardEl.addEventListener('click', () => onCardClick(card));
        }

        container.appendChild(cardEl);
    }
}

/**
 * Render opponent hands (as card backs with card count)
 */
export function renderOpponentHand(container, cardCount, nickname, isCurrentTurn = false) {
    container.innerHTML = `
    <div class="opponent-hand">
      <div class="opponent-info">
        <span class="opponent-name ${isCurrentTurn ? 'current-turn' : ''}">${nickname}</span>
        <span class="card-count-badge">${cardCount} cards</span>
      </div>
      <div class="opponent-cards"></div>
    </div>
  `;

    const cardsContainer = container.querySelector('.opponent-cards');
    for (let i = 0; i < Math.min(cardCount, 11); i++) {
        cardsContainer.appendChild(createCardBackElement(true));
    }
    if (cardCount > 11) {
        const moreLabel = document.createElement('span');
        moreLabel.className = 'more-cards';
        moreLabel.textContent = `+${cardCount - 11}`;
        cardsContainer.appendChild(moreLabel);
    }
}

/**
 * Render a meld
 */
export function renderMeld(meld, options = {}) {
    const { onMeldClick, isClickable = false } = options;

    const meldEl = document.createElement('div');
    meldEl.className = 'meld';
    meldEl.dataset.meldId = meld.id;

    if (meld.isBurraco) meldEl.classList.add('burraco');
    if (meld.isClean) meldEl.classList.add('clean');
    if (isClickable) meldEl.classList.add('clickable');

    for (const card of meld.cards) {
        const cardEl = createCardElement(card, { clickable: false });
        meldEl.appendChild(cardEl);
    }

    if (onMeldClick && isClickable) {
        meldEl.addEventListener('click', () => onMeldClick(meld));
    }

    return meldEl;
}

/**
 * Render team melds
 */
export function renderTeamMelds(container, melds, options = {}) {
    const { onMeldClick, isClickable = false } = options;
    const grid = container.querySelector('.melds-grid');
    grid.innerHTML = '';

    for (const meld of melds) {
        grid.appendChild(renderMeld(meld, { onMeldClick, isClickable }));
    }
}

/**
 * Render discard pile (show ALL cards in a row)
 */
export function renderDiscardPile(container, discardPile) {
    container.innerHTML = '';

    if (discardPile.length === 0) {
        container.innerHTML = '<div class="card-placeholder">Empty</div>';
        return;
    }

    const rowEl = document.createElement('div');
    rowEl.className = 'discard-row';

    // Show ALL discarded cards in a row
    for (const card of discardPile) {
        const cardEl = createCardElement(card, { clickable: false });
        rowEl.appendChild(cardEl);
    }

    container.appendChild(rowEl);
}

export default {
    createCardElement,
    createCardBackElement,
    createCardStackElement,
    renderHand,
    renderOpponentHand,
    renderMeld,
    renderTeamMelds,
    renderDiscardPile
};
