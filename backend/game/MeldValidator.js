/**
 * Meld validation for Buraco
 * Validates sets (combinazione) and sequences (sequenze)
 */

import { getRankIndex } from './Deck.js';

const RANKS_ORDER = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/**
 * Sort sequence meld cards in proper order, placing wilds in gap positions
 * @param {Array} cards - Cards in the meld
 * @param {string} suit - Suit of the sequence
 * @returns {Array} - Sorted cards array
 */
export function sortSequenceMeld(cards, suit) {
    const wilds = [];
    const naturals = [];

    // Separate wilds from naturals - only Jokers are wild
    for (const card of cards) {
        if (card.rank === 'JOKER') {
            wilds.push(card);
        } else {
            naturals.push(card);
        }
    }

    // Sort naturals by rank
    naturals.sort((a, b) => {
        const idxA = getRankIndex(a.rank);
        const idxB = getRankIndex(b.rank);
        return idxA - idxB;
    });

    // Check if Ace should be at high end (after K)
    let aceIsHigh = false;
    if (naturals.length >= 2) {
        const firstCard = naturals[0];
        const lastCard = naturals[naturals.length - 1];
        const hasAce = naturals.some(c => c.rank === 'A');
        const hasKing = naturals.some(c => c.rank === 'K');
        const hasQueen = naturals.some(c => c.rank === 'Q');
        const hasJack = naturals.some(c => c.rank === 'J');
        const hasTwo = naturals.some(c => c.rank === '2');
        const hasThree = naturals.some(c => c.rank === '3');

        // Ace is high if:
        // 1. We have natural K with Ace
        // 2. We have Q or J with JOKER (JOKER will act as K)
        if (hasAce && !hasTwo && !hasThree) {
            if (hasKing) {
                aceIsHigh = true;
            } else if ((hasQueen || hasJack) && wilds.length > 0) {
                aceIsHigh = true;
            }
        }

        if (aceIsHigh && firstCard.rank === 'A') {
            // Move Ace to the end
            naturals.push(naturals.shift());
        }
    }

    // Now insert wilds into gaps
    const result = [];
    let wildIdx = 0;

    for (let i = 0; i < naturals.length; i++) {
        result.push(naturals[i]);

        if (i < naturals.length - 1) {
            // Check for gap to next card
            let currentRank = getRankIndex(naturals[i].rank);
            let nextRank = getRankIndex(naturals[i + 1].rank);

            // Handle Ace at end case - Ace's index should be 13 when it's high
            if (naturals[i + 1].rank === 'A' && aceIsHigh) {
                nextRank = 13;
            }

            const gap = nextRank - currentRank - 1;
            for (let g = 0; g < gap && wildIdx < wilds.length; g++) {
                result.push(wilds[wildIdx++]);
            }
        }
    }

    // Handle remaining wilds
    // If sequence ends with high Ace, place wilds at the BEGINNING (extending downward)
    // Otherwise, place at the end
    const wildsToPlace = [];
    while (wildIdx < wilds.length) {
        wildsToPlace.push(wilds[wildIdx++]);
    }

    if (wildsToPlace.length > 0) {
        // Check if last card is high Ace
        const lastCard = naturals[naturals.length - 1];
        const isEndingWithHighAce = lastCard && lastCard.rank === 'A' && aceIsHigh;

        if (isEndingWithHighAce) {
            // Place wilds at beginning (extend downward from lowest card)
            return [...wildsToPlace, ...result];
        } else {
            // Place wilds at end (extend upward)
            return [...result, ...wildsToPlace];
        }
    }

    return result;
}

/**
 * Check if a card is a wild card - only Jokers are wild
 */
function isWildCard(card) {
    return card.rank === 'JOKER';
}

/**
 * Validate a set (combinazione) - 3-7 cards of same rank
 * Rules:
 * - At least 3 cards, maximum 7 cards
 * - All same rank (except wilds)
 * - Maximum 1 wild card
 * - Cannot be all wilds
 */
export function validateSet(cards) {
    if (cards.length < 3) {
        return { valid: false, reason: 'Set must have at least 3 cards' };
    }

    if (cards.length > 7) {
        return { valid: false, reason: 'Meld cannot have more than 7 cards' };
    }

    const wilds = cards.filter(c => isWildCard(c));
    const naturals = cards.filter(c => !isWildCard(c));

    if (wilds.length > 1) {
        return { valid: false, reason: 'Set can have at most 1 wild card' };
    }

    if (naturals.length === 0) {
        return { valid: false, reason: 'Set cannot consist entirely of wild cards' };
    }

    // All naturals must be same rank
    const rank = naturals[0].rank;
    if (!naturals.every(c => c.rank === rank)) {
        return { valid: false, reason: 'All cards in a set must be the same rank' };
    }

    const isClean = wilds.length === 0;

    return {
        valid: true,
        type: 'set',
        rank,
        isClean,
        isBurraco: cards.length >= 7
    };
}

/**
 * Validate a sequence (sequenza) - 3-7 consecutive cards in same suit
 * Rules:
 * - At least 3 cards, maximum 7 cards
 * - All same suit (naturals)
 * - Consecutive ranks
 * - Maximum 1 wild card (Joker only)
 * - Ace can be at either end but not both
 * - 2 is a normal card (not wild)
 */
export function validateSequence(cards) {
    if (cards.length < 3) {
        return { valid: false, reason: 'Sequence must have at least 3 cards' };
    }

    if (cards.length > 7) {
        return { valid: false, reason: 'Meld cannot have more than 7 cards' };
    }

    // Separate wilds and naturals - only Jokers are wild
    const wilds = cards.filter(c => c.rank === 'JOKER');
    const naturals = cards.filter(c => c.rank !== 'JOKER');

    if (naturals.length === 0) {
        return { valid: false, reason: 'Sequence must contain natural cards' };
    }

    // All naturals must be same suit
    const suit = naturals[0].suit;
    if (!naturals.every(c => c.suit === suit)) {
        return { valid: false, reason: 'All cards in a sequence must be the same suit' };
    }

    // Build the sequence by position
    const positions = [];

    for (const card of naturals) {
        const idx = getRankIndex(card.rank);
        positions.push({ idx, card, isWild: false });
    }

    // Sort by position
    positions.sort((a, b) => a.idx - b.idx);

    // Check if there's an Ace that could be at the high end (after K)
    const hasLowAce = positions.some(p => p.idx === 0 && positions.some(p2 => p2.idx === 1 || p2.idx === 2));
    const hasHighAce = positions.some(p => p.idx === 0) && positions.some(p => p.idx === 12); // K

    // Adjust ace position if it's at high end
    if (hasHighAce && !hasLowAce) {
        const acePos = positions.find(p => p.idx === 0);
        if (acePos) acePos.idx = 13;
        positions.sort((a, b) => a.idx - b.idx);
    }

    // Count gaps between consecutive cards
    let gaps = 0;
    for (let i = 1; i < positions.length; i++) {
        const gap = positions[i].idx - positions[i - 1].idx - 1;
        if (gap > 0) {
            gaps += gap;
        } else if (gap < 0) {
            return { valid: false, reason: 'Duplicate ranks in sequence' };
        }
    }

    // Can only use 1 wild card (Joker) total
    if (wilds.length > 1) {
        return { valid: false, reason: 'Sequence can have at most 1 wild card (Joker)' };
    }

    if (gaps > wilds.length) {
        return { valid: false, reason: 'Not enough wild cards to fill gaps in sequence' };
    }

    const isClean = wilds.length === 0;

    return {
        valid: true,
        type: 'sequence',
        suit,
        isClean,
        isBurraco: cards.length >= 7
    };
}

/**
 * Validate any meld (auto-detect type)
 */
export function validateMeld(cards) {
    if (!cards || cards.length < 3) {
        return { valid: false, reason: 'Meld must have at least 3 cards' };
    }

    // Try as set first
    const setResult = validateSet(cards);
    if (setResult.valid) {
        return setResult;
    }

    // Try as sequence
    const seqResult = validateSequence(cards);
    if (seqResult.valid) {
        return seqResult;
    }

    // Neither valid
    return { valid: false, reason: 'Cards do not form a valid set or sequence' };
}

/**
 * Check if cards can be added to an existing meld
 * For sequences with wilds, this will attempt to reposition the wild if needed
 */
export function canExtendMeld(existingMeld, newCards, meldInfo) {
    const combined = [...existingMeld, ...newCards];

    if (meldInfo.type === 'set') {
        return validateSet(combined);
    } else {
        // For sequences, validate the combined meld
        // The validation will work because sortSequenceMeld intelligently places wilds
        const result = validateSequence(combined);

        // If validation failed but we have wilds, it might be because a wild needs repositioning
        // The sortSequenceMeld function will handle this automatically when the meld is saved
        if (!result.valid && combined.some(c => c.rank === 'JOKER')) {
            // Try to see if the natural cards form a valid sequence
            // This helps when adding a card that displaces a wild
            const naturals = combined.filter(c => c.rank !== 'JOKER');
            const wilds = combined.filter(c => c.rank === 'JOKER');

            if (naturals.length >= 3) {
                // Check if naturals can form a sequence with the wild filling gaps
                const naturalResult = validateSequence(naturals);

                // If naturals are valid by themselves, or can be valid with wild repositioning
                if (naturalResult.valid || canFormSequenceWithWild(naturals, wilds, meldInfo.suit)) {
                    // Return a valid result - the sortSequenceMeld will fix positioning
                    return {
                        valid: true,
                        type: 'sequence',
                        suit: meldInfo.suit,
                        isClean: wilds.length === 0,
                        isBurraco: combined.length >= 7
                    };
                }
            }
        }

        return result;
    }
}

/**
 * Helper function to check if naturals + wilds can form a valid sequence
 * This allows for wild repositioning
 */
function canFormSequenceWithWild(naturals, wilds, suit) {
    if (naturals.length === 0) return false;
    if (wilds.length > 1) return false; // Max 1 wild

    // All naturals must be same suit
    if (!naturals.every(c => c.suit === suit)) return false;

    // Get positions of all natural cards
    const positions = naturals.map(card => {
        let idx = getRankIndex(card.rank);
        return { idx, rank: card.rank };
    }).sort((a, b) => a.idx - b.idx);

    // Check for Ace positioning (can be high or low)
    const hasAce = positions.some(p => p.rank === 'A');
    const hasKing = positions.some(p => p.rank === 'K');
    const hasQueen = positions.some(p => p.rank === 'Q');
    const hasJack = positions.some(p => p.rank === 'J');
    const hasTwo = positions.some(p => p.rank === '2');
    const hasThree = positions.some(p => p.rank === '3');

    // Determine if Ace should be high
    // Ace is high if:
    // 1. We have natural K, OR
    // 2. We have Q or J with a JOKER (JOKER will be K)
    let aceIsHigh = false;
    if (hasAce && !hasTwo && !hasThree) {
        if (hasKing) {
            aceIsHigh = true;
        } else if ((hasQueen || hasJack) && wilds.length > 0) {
            // JOKER can act as K between Q and A
            aceIsHigh = true;
        }
    }

    // If we have K and A, Ace should be high (idx 13)
    if (aceIsHigh) {
        const acePos = positions.find(p => p.rank === 'A');
        if (acePos) acePos.idx = 13;
        positions.sort((a, b) => a.idx - b.idx);
    }

    // Count total gaps
    let totalGaps = 0;
    for (let i = 1; i < positions.length; i++) {
        const gap = positions[i].idx - positions[i - 1].idx - 1;
        if (gap > 0) {
            totalGaps += gap;
        } else if (gap < 0) {
            return false; // Duplicate ranks
        }
    }

    // We can fill gaps with wilds
    return totalGaps <= wilds.length;
}

/**
 * Check if replacing a wild card with the natural card is valid
 */
export function canReplaceWild(meld, wildCard, naturalCard, meldInfo) {
    if (meldInfo.type !== 'sequence') {
        return { valid: false, reason: 'Wild replacement only applies to sequences' };
    }

    // The natural card must be the same as what the wild represents
    // This is complex - for now, allow any valid resulting sequence
    const newMeld = meld.filter(c => c.id !== wildCard.id).concat([naturalCard, wildCard]);
    return validateSequence(newMeld);
}
