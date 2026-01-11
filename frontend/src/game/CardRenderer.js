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
 * Render a player's hand with drag support and reordering
 */
export function renderHand(container, cards, options = {}) {
    const { selectedIds = [], onCardClick, onCardDragStart, onCardDragEnd, onReorder, customOrder } = options;

    container.innerHTML = '';

    // Use custom order if provided, otherwise sort by suit then rank
    let displayCards;
    if (customOrder && customOrder.length === cards.length) {
        // Use custom order
        displayCards = customOrder.map(id => cards.find(c => c.id === id)).filter(Boolean);
        // Add any cards not in customOrder
        const orderedIds = new Set(customOrder);
        for (const card of cards) {
            if (!orderedIds.has(card.id)) {
                displayCards.push(card);
            }
        }
    } else {
        // Default sort by suit then rank
        displayCards = [...cards].sort((a, b) => {
            const suitOrder = ['hearts', 'diamonds', 'clubs', 'spades', 'joker'];
            const rankOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'JOKER'];

            const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
            if (suitDiff !== 0) return suitDiff;
            return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
        });
    }

    for (const card of displayCards) {
        const cardEl = createCardElement(card);
        
        // Make card draggable
        cardEl.draggable = true;
        
        cardEl.addEventListener('dragstart', (e) => {
            cardEl.classList.add('dragging');
            e.dataTransfer.setData('text/plain', card.id);
            e.dataTransfer.effectAllowed = 'move';
            if (onCardDragStart) onCardDragStart(card);
        });
        
        cardEl.addEventListener('dragend', () => {
            cardEl.classList.remove('dragging');
            if (onCardDragEnd) onCardDragEnd(card);
        });

        // Allow dropping on cards to reorder
        cardEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            const dragging = container.querySelector('.dragging');
            if (dragging && dragging !== cardEl) {
                cardEl.classList.add('drag-target');
            }
        });

        cardEl.addEventListener('dragleave', () => {
            cardEl.classList.remove('drag-target');
        });

        cardEl.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            cardEl.classList.remove('drag-target');
            
            const draggedId = e.dataTransfer.getData('text/plain');
            if (draggedId && draggedId !== card.id && onReorder) {
                onReorder(draggedId, card.id);
            }
        });

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
 * Render opponent hands - compact avatar with card count badge like reference
 */
export function renderOpponentHand(container, cardCount, nickname, avatarId, isCurrentTurn = false) {
    container.innerHTML = `
    <div class="opponent-hand ${isCurrentTurn ? 'current-turn' : ''}">
      <div class="opponent-avatar-wrapper">
        <img src="/assets/avatars/avatar_${avatarId || 1}.png" class="opponent-avatar" alt="${nickname}">
        <span class="card-count-badge">${cardCount}</span>
      </div>
      <span class="opponent-name">${nickname}</span>
      <div class="opponent-mini-deck"></div>
    </div>
  `;

    // Create a small visual deck representation (max 3 cards stacked)
    const deckContainer = container.querySelector('.opponent-mini-deck');
    const visibleCards = Math.min(cardCount, 3);
    for (let i = 0; i < visibleCards; i++) {
        const miniCard = createCardBackElement(true);
        miniCard.style.position = 'absolute';
        miniCard.style.top = `${i * 2}px`;
        miniCard.style.left = `${i * 2}px`;
        deckContainer.appendChild(miniCard);
    }
}

/**
 * Render a meld with label (Clean/Dirty) like reference image
 */
export function renderMeld(meld, options = {}) {
    const { onMeldClick, isClickable = false } = options;

    const meldEl = document.createElement('div');
    meldEl.className = 'meld';
    meldEl.dataset.meldId = meld.id;

    if (meld.isBurraco) meldEl.classList.add('burraco');
    if (meld.isClean) meldEl.classList.add('clean');
    if (isClickable) meldEl.classList.add('clickable');

    // Add meld type label at top (like reference image)
    if (meld.isBurraco) {
        const label = document.createElement('span');
        label.className = 'meld-label';
        label.textContent = meld.isClean ? 'Clean' : 'Dirty';
        meldEl.appendChild(label);
    }

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
 * Render team melds with dynamic sizing based on count
 */
export function renderTeamMelds(container, melds, options = {}) {
    const { onMeldClick, isClickable = false } = options;
    const grid = container.querySelector('.melds-grid');
    grid.innerHTML = '';

    // Dynamic sizing based on meld count
    grid.classList.remove('medium', 'compact', 'x-compact', 'two-rows');
    
    const count = melds.length;
    if (count > 7) {
        // Two-row layout: 7 on top, rest on bottom
        grid.classList.add('two-rows');
        
        // Also add size class based on total count
        if (count >= 13) {
            grid.classList.add('x-compact');
        } else if (count >= 9) {
            grid.classList.add('compact');
        }
    } else if (count >= 5) {
        grid.classList.add('medium');
    }
    // 1-4 melds: default large size (no class needed)

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
