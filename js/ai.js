/**
 * Mancala AI — Move Suggestion Engine
 *
 * Uses a heuristic scoring system to evaluate moves and suggest
 * the best option for the player, with a plain-English explanation.
 */

const MancalaAI = {
  /**
   * Score a move from the player's perspective.
   * Higher is better.
   * @param {number[]} board  Current board array
   * @param {number}   pitIndex  Index (0–5) of the move to evaluate
   * @returns {{ score: number, tags: string[] }}
   */
  scoreMove(board, pitIndex) {
    const b = [...board];
    const stones = b[pitIndex];
    if (stones === 0) return { score: -Infinity, tags: [] };

    let score = 0;
    const tags = [];

    // --- Simulate the move ---
    let sim = [...b];
    sim[pitIndex] = 0;
    let idx = pitIndex;
    let remaining = stones;
    while (remaining > 0) {
      idx = (idx + 1) % 14;
      if (idx === OPPONENT_STORE) continue;
      sim[idx]++;
      remaining--;
    }
    const landingIdx = idx;

    // 1. BONUS TURN: landing in own store is highest priority
    if (landingIdx === PLAYER_STORE) {
      score += 50;
      tags.push('bonus turn');
    }

    // 2. CAPTURE: landing in an empty own pit with stones opposite
    if (PLAYER_PITS.includes(landingIdx) && sim[landingIdx] === 1) {
      const oppIdx = 12 - landingIdx;
      const oppStones = b[oppIdx]; // original board opposite stones
      if (oppStones > 0) {
        score += 30 + oppStones * 3;
        tags.push(`capture ${oppStones + 1} stones`);
      }
    }

    // 3. NET STONE GAIN: how many stones end up in our store
    const storeGain = sim[PLAYER_STORE] - b[PLAYER_STORE];
    score += storeGain * 5;

    // 4. SEED FURTHEST PITS: stones left close to us are risky, far away is safer
    // Pits 4 and 5 are hardest to reach for opponent captures, prefer loading them
    const seededFar = (sim[4] + sim[5]) - (b[4] + b[5]);
    score += seededFar * 2;

    // 5. PREVENT OPPONENT BONUS TURN: if opponent has pits that will land in their store, try to disrupt
    // (heuristic: avoid giving opponent their bonus by analyzing their resulting state)
    // Check if our move leaves opponent with a clean bonus-turn pit
    let opponentBonusRisk = 0;
    OPPONENT_PITS.forEach(oppPit => {
      const oStones = sim[oppPit];
      // Distance from oppPit to OPPONENT_STORE (index 13), going in opponent's direction
      // Opponent travels 7→8→9→10→11→12→13, skipping PLAYER_STORE (6)
      // From oppPit, distance to store 13 (wrapping around past player side)
      let dist = 0;
      let tempIdx = oppPit;
      while (tempIdx !== OPPONENT_STORE) {
        tempIdx = (tempIdx + 1) % 14;
        if (tempIdx === PLAYER_STORE) continue;
        dist++;
      }
      if (oStones === dist) opponentBonusRisk++;
    });
    score -= opponentBonusRisk * 10;

    // 6. OPPONENT CAPTURE PREVENTION: don't leave empty pits with full opposite pits
    // After our move, check if any of our empty pits have lots of stones opposite
    let vulnerabilityPenalty = 0;
    PLAYER_PITS.forEach(pp => {
      if (sim[pp] === 0) {
        const opp = 12 - pp;
        if (sim[opp] > 3) vulnerabilityPenalty += sim[opp];
      }
    });
    score -= vulnerabilityPenalty * 2;

    // 7. BOARD CONTROL: having more stones on our side (excluding store) is advantageous
    const ourSideStones = PLAYER_PITS.reduce((s, i) => s + sim[i], 0);
    const oppSideStones = OPPONENT_PITS.reduce((s, i) => s + sim[i], 0);
    score += (ourSideStones - oppSideStones) * 0.5;

    // 8. ENDGAME AWARENESS: if we're ahead, prefer moves that clear our side
    const playerScore = sim[PLAYER_STORE];
    const opponentScore = sim[OPPONENT_STORE];
    if (playerScore > opponentScore && ourSideStones < 8) {
      score += 5; // slight bonus for moves when ahead in endgame
    }

    return { score, tags };
  },

  /**
   * Get the best suggested move for the player.
   * @param {number[]} board
   * @returns {{ pitIndex: number, pitNumber: number, score: number, reason: string } | null}
   */
  suggest(board) {
    const validMoves = PLAYER_PITS.filter(i => board[i] > 0);
    if (validMoves.length === 0) return null;

    let bestMove = null;
    let bestScore = -Infinity;

    validMoves.forEach(pitIndex => {
      const { score, tags } = this.scoreMove(board, pitIndex);
      if (score > bestScore) {
        bestScore = score;
        bestMove = { pitIndex, tags, score };
      }
    });

    if (!bestMove) return null;

    const pitNumber = bestMove.pitIndex + 1; // 1-based for display
    const reason = this._buildReason(bestMove.pitIndex, board, bestMove.tags);

    return {
      pitIndex: bestMove.pitIndex,
      pitNumber,
      score: bestMove.score,
      reason,
    };
  },

  /**
   * Build a human-readable explanation for the suggested move.
   */
  _buildReason(pitIndex, board, tags) {
    const stones = board[pitIndex];
    const pitNum = pitIndex + 1;

    if (tags.includes('bonus turn')) {
      return `Pit ${pitNum} has exactly the right number of stones (${stones}) to land in your store — earning you a free extra turn.`;
    }

    const captureTag = tags.find(t => t.startsWith('capture'));
    if (captureTag) {
      const n = captureTag.match(/\d+/)?.[0] || '?';
      const oppositePit = 6 - pitNum; // 1-based mirror
      return `Pit ${pitNum} will land in an empty pit on your side — capturing ${n} stones from the opponent's opposite pit. That's a big gain.`;
    }

    // Check for defensive play
    const simulatedBoard = [...board];
    simulatedBoard[pitIndex] = 0;
    let idx = pitIndex;
    let rem = stones;
    while (rem > 0) {
      idx = (idx + 1) % 14;
      if (idx === OPPONENT_STORE) continue;
      simulatedBoard[idx]++;
      rem--;
    }
    const storeGain = simulatedBoard[PLAYER_STORE] - board[PLAYER_STORE];

    if (storeGain > 0) {
      return `Pit ${pitNum} adds ${storeGain} stone${storeGain > 1 ? 's' : ''} to your store and creates a strong distribution across the board, keeping you ahead.`;
    }

    // General heuristic explanation
    const oppSide = OPPONENT_PITS.reduce((s, i) => s + board[i], 0);
    const ourSide = PLAYER_PITS.reduce((s, i) => s + board[i], 0);

    if (oppSide > ourSide) {
      return `The opponent has more stones on their side. Pit ${pitNum} spreads your ${stones} stones effectively, improving your board position and limiting their options.`;
    }

    return `Pit ${pitNum} offers the best overall board position — distributing ${stones} stones in a way that maximizes future capture and bonus turn opportunities.`;
  },
};

window.MancalaAI = MancalaAI;
