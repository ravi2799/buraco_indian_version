/**
 * Scoring system for Buraco
 */

import { calculateCardsValue } from './Deck.js';

/**
 * Bonus points
 */
const BONUSES = {
    CLEAN_BURRACO: 200,
    DIRTY_BURRACO: 100,
    SEMI_CLEAN_BURRACO: 150,
    GOING_OUT: 50,
    POZZETTO_BONUS: 50  // +50 for each pozzetto taken
};

/**
 * Calculate score for a team's melds
 */
export function calculateMeldScore(melds) {
    let score = 0;
    let cleanBurracos = 0;
    let dirtyBurracos = 0;

    for (const meld of melds) {
        // Card values
        score += calculateCardsValue(meld.cards);

        // Burraco bonuses
        if (meld.isBurraco) {
            if (meld.isClean) {
                score += BONUSES.CLEAN_BURRACO;
                cleanBurracos++;
            } else {
                score += BONUSES.DIRTY_BURRACO;
                dirtyBurracos++;
            }
        }
    }

    return { score, cleanBurracos, dirtyBurracos };
}

/**
 * Calculate score for cards remaining in hand (negative)
 */
export function calculateHandPenalty(hands) {
    let penalty = 0;
    for (const hand of hands) {
        penalty += calculateCardsValue(hand);
    }
    return -penalty;
}

/**
 * Calculate final score for a team at end of round
 */
export function calculateTeamScore(team) {
    const { melds, hands, pozzettoCount = 0, wentOut } = team;

    // Score from melds
    const meldResult = calculateMeldScore(melds);
    let totalScore = meldResult.score;

    // Penalty for cards in hand
    totalScore += calculateHandPenalty(hands);

    // Bonus for going out
    if (wentOut) {
        totalScore += BONUSES.GOING_OUT;
    }

    // Bonus for pozzetti taken (+50 per pozzetto)
    const pozzettoBonus = pozzettoCount * BONUSES.POZZETTO_BONUS;
    totalScore += pozzettoBonus;

    return {
        totalScore,
        meldScore: meldResult.score,
        handPenalty: calculateHandPenalty(hands),
        cleanBurracos: meldResult.cleanBurracos,
        dirtyBurracos: meldResult.dirtyBurracos,
        wentOutBonus: wentOut ? BONUSES.GOING_OUT : 0,
        pozzettoBonus: pozzettoBonus
    };
}

/**
 * Check if game should end (team reaches 2000+ points)
 */
export function checkGameEnd(teamScores) {
    for (const [teamId, score] of Object.entries(teamScores)) {
        if (score >= 2000) {
            return { ended: true, winner: teamId, score };
        }
    }
    return { ended: false };
}

/**
 * Determine winner when game ends
 */
export function determineWinner(teamScores) {
    const teams = Object.entries(teamScores);
    teams.sort((a, b) => b[1] - a[1]);

    return {
        winner: teams[0][0],
        winnerScore: teams[0][1],
        scores: teamScores
    };
}
