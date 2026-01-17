/**
 * Card Renderer
 * Creates and manages card DOM elements
 */

const SUIT_CODES = {
    hearts: 'H',
    diamonds: 'D',
    clubs: 'C',
    spades: 'S'
};

/**
 * Get the image filename for a card
 */
function getCardImagePath(card) {
    if (card.rank === 'JOKER') {
        return '/assets/cards/JOKER.png';
    }
    
    const suitCode = SUIT_CODES[card.suit];
    const rankCode = card.rank === '10' ? '10' : card.rank;
    
    return `/assets/cards/${rankCode}${suitCode}.svg`;
}

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
 * Create HTML for card face using real card images
 */
function createCardFaceHTML(card) {
    const imagePath = getCardImagePath(card);
    return `<img class="card-image" src="${imagePath}" alt="${card.rank} of ${card.suit}" draggable="false">`;
}

/**
 * Create card back element
 */
export function createCardBackElement(mini = false) {
    const cardEl = document.createElement('div');
    cardEl.className = 'card' + (mini ? ' mini' : '');
    cardEl.innerHTML = '<img class="card-image card-back-img" src="/assets/cards/RED_BACK.svg" alt="Card back" draggable="false">';
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
        // Keep original order (new cards added to left)
        displayCards = [...cards];
    }

    // Calculate dynamic overlap when cards > 21
    const cardCount = displayCards.length;
    let marginLeft = -10; // Default margin (from CSS)
    if (cardCount > 21) {
        // Increase overlap as card count grows
        const extraCards = cardCount - 21;
        marginLeft = -10 - (extraCards * 3); // Tighter by 3px per extra card
        marginLeft = Math.max(marginLeft, -37); // Cap at -37px after 30 cards
    }

    for (let i = 0; i < displayCards.length; i++) {
        const card = displayCards[i];
        const cardEl = createCardElement(card);
        
        // Apply dynamic margin for cards after the first
        if (cardCount > 21 && i > 0) {
            cardEl.style.marginLeft = `${marginLeft}px`;
        }
        
        // Make card draggable
        cardEl.draggable = true;
        
        cardEl.addEventListener('dragstart', (e) => {
            cardEl.classList.add('dragging');
            container.classList.add('drag-active');
            e.dataTransfer.setData('text/plain', card.id);
            e.dataTransfer.effectAllowed = 'move';
            
            // Create custom drag image
            const dragImage = cardEl.cloneNode(true);
            dragImage.style.transform = 'rotate(5deg) scale(1.1)';
            dragImage.style.position = 'absolute';
            dragImage.style.top = '-1000px';
            document.body.appendChild(dragImage);
            e.dataTransfer.setDragImage(dragImage, 35, 50);
            setTimeout(() => dragImage.remove(), 0);
            
            if (onCardDragStart) onCardDragStart(card);
        });
        
        cardEl.addEventListener('dragend', () => {
            cardEl.classList.remove('dragging');
            container.classList.remove('drag-active');
            // Clean up all drag indicators
            container.querySelectorAll('.drag-target, .drag-over-left, .drag-over-right').forEach(el => {
                el.classList.remove('drag-target', 'drag-over-left', 'drag-over-right');
            });
            if (onCardDragEnd) onCardDragEnd(card);
        });

        // Allow dropping on cards to reorder with position indicator
        cardEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            const dragging = container.querySelector('.dragging');
            if (dragging && dragging !== cardEl) {
                cardEl.classList.add('drag-target');
                
                // Determine drop position (left or right of card)
                const rect = cardEl.getBoundingClientRect();
                const midpoint = rect.left + rect.width / 2;
                const isLeftSide = e.clientX < midpoint;
                
                cardEl.classList.remove('drag-over-left', 'drag-over-right');
                cardEl.classList.add(isLeftSide ? 'drag-over-left' : 'drag-over-right');
                cardEl.dataset.dropSide = isLeftSide ? 'left' : 'right';
            }
        });

        cardEl.addEventListener('dragleave', (e) => {
            // Only remove if actually leaving the card (not entering a child)
            if (!cardEl.contains(e.relatedTarget)) {
                cardEl.classList.remove('drag-target', 'drag-over-left', 'drag-over-right');
                delete cardEl.dataset.dropSide;
            }
        });

        cardEl.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const dropSide = cardEl.dataset.dropSide || 'right';
            cardEl.classList.remove('drag-target', 'drag-over-left', 'drag-over-right');
            delete cardEl.dataset.dropSide;
            
            const draggedId = e.dataTransfer.getData('text/plain');
            if (draggedId && draggedId !== card.id && onReorder) {
                onReorder(draggedId, card.id, dropSide);
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
