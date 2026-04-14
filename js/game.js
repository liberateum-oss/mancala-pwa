/**
 * Mancala Game Engine
 *
 * Board layout (indices 0–13):
 *   Indices 0–5:  Player's pits (left to right)
 *   Index 6:      Player's store
 *   Indices 7–12: Opponent's pits (left to right from opponent's perspective, so right to left visually)
 *   Index 13:     Opponent's store
 *
 * Turn: 'player' or 'opponent'
 */

const PLAYER_PITS = [0, 1, 2, 3, 4, 5];
const PLAYER_STORE = 6;
const OPPONENT_PITS = [7, 8, 9, 10, 11, 12];
const OPPONENT_STORE = 13;
const TOTAL_PITS = 14;
const STARTING_STONES = 4;

class MancalaGame {
  constructor() {
    this.board = [];
    this.turn = 'player';
    this.gameOver = false;
    this.lastMoveIndex = null;
    this.history = []; // for undo support
    this.reset();
  }

  reset() {
    this.board = Array(TOTAL_PITS).fill(STARTING_STONES);
    this.board[PLAYER_STORE] = 0;
    this.board[OPPONENT_STORE] = 0;
    this.turn = 'player';
    this.gameOver = false;
    this.lastMoveIndex = null;
    this.history = [];
  }

  /**
   * Check if a move index is valid for the current turn.
   * @param {number} pitIndex
   * @returns {boolean}
   */
  isValidMove(pitIndex) {
    if (this.gameOver) return false;
    if (this.turn === 'player') {
      return PLAYER_PITS.includes(pitIndex) && this.board[pitIndex] > 0;
    } else {
      return OPPONENT_PITS.includes(pitIndex) && this.board[pitIndex] > 0;
    }
  }

  /**
   * Get all valid moves for the current player.
   * @returns {number[]} Array of valid pit indices.
   */
  getValidMoves() {
    if (this.turn === 'player') {
      return PLAYER_PITS.filter(i => this.board[i] > 0);
    } else {
      return OPPONENT_PITS.filter(i => this.board[i] > 0);
    }
  }

  /**
   * Save current state to history.
   */
  _saveHistory() {
    this.history.push({
      board: [...this.board],
      turn: this.turn,
      gameOver: this.gameOver,
    });
  }

  /**
   * Execute a move. Returns a result object.
   * @param {number} pitIndex
   * @returns {{ success: boolean, bonusTurn: boolean, captured: boolean, capturedCount: number, gameOver: boolean, winner: string|null, error: string|null }}
   */
  makeMove(pitIndex) {
    if (!this.isValidMove(pitIndex)) {
      return { success: false, error: 'Invalid move', bonusTurn: false, captured: false, capturedCount: 0, gameOver: false, winner: null };
    }

    this._saveHistory();

    const board = this.board;
    let stonesInHand = board[pitIndex];
    board[pitIndex] = 0;

    let currentIndex = pitIndex;
    const skipStore = this.turn === 'player' ? OPPONENT_STORE : PLAYER_STORE;

    while (stonesInHand > 0) {
      currentIndex = (currentIndex + 1) % TOTAL_PITS;
      if (currentIndex === skipStore) continue; // skip opponent's store
      board[currentIndex]++;
      stonesInHand--;
    }

    this.lastMoveIndex = currentIndex;

    let bonusTurn = false;
    let captured = false;
    let capturedCount = 0;

    // Check for bonus turn: last stone landed in own store
    if (this.turn === 'player' && currentIndex === PLAYER_STORE) {
      bonusTurn = true;
    } else if (this.turn === 'opponent' && currentIndex === OPPONENT_STORE) {
      bonusTurn = true;
    }

    // Check for capture: last stone in an empty pit on own side that now has exactly 1 stone
    if (!bonusTurn) {
      if (this.turn === 'player' && PLAYER_PITS.includes(currentIndex) && board[currentIndex] === 1) {
        // Opposite pit: opponent's pit at mirror index
        const oppositePit = 12 - currentIndex; // pits 0↔12, 1↔11, 2↔10, 3↔9, 4↔8, 5↔7
        if (board[oppositePit] > 0) {
          capturedCount = board[oppositePit] + 1; // opposite + our landing stone
          board[PLAYER_STORE] += capturedCount;
          board[oppositePit] = 0;
          board[currentIndex] = 0;
          captured = true;
        }
      } else if (this.turn === 'opponent' && OPPONENT_PITS.includes(currentIndex) && board[currentIndex] === 1) {
        const oppositePit = 12 - currentIndex;
        if (board[oppositePit] > 0) {
          capturedCount = board[oppositePit] + 1;
          board[OPPONENT_STORE] += capturedCount;
          board[oppositePit] = 0;
          board[currentIndex] = 0;
          captured = true;
        }
      }
    }

    // Check for game over
    const playerSideEmpty = PLAYER_PITS.every(i => board[i] === 0);
    const opponentSideEmpty = OPPONENT_PITS.every(i => board[i] === 0);

    let winner = null;
    if (playerSideEmpty || opponentSideEmpty) {
      // Sweep remaining stones into respective stores
      PLAYER_PITS.forEach(i => { board[PLAYER_STORE] += board[i]; board[i] = 0; });
      OPPONENT_PITS.forEach(i => { board[OPPONENT_STORE] += board[i]; board[i] = 0; });
      this.gameOver = true;
      if (board[PLAYER_STORE] > board[OPPONENT_STORE]) winner = 'player';
      else if (board[OPPONENT_STORE] > board[PLAYER_STORE]) winner = 'opponent';
      else winner = 'tie';
    }

    // Switch turns (unless bonus turn or game over)
    if (!bonusTurn && !this.gameOver) {
      this.turn = this.turn === 'player' ? 'opponent' : 'player';
    }

    return {
      success: true,
      bonusTurn,
      captured,
      capturedCount,
      gameOver: this.gameOver,
      winner,
      error: null,
    };
  }

  /**
   * Get score for a given side.
   */
  getScore(side) {
    if (side === 'player') return this.board[PLAYER_STORE];
    return this.board[OPPONENT_STORE];
  }

  /**
   * Total stones in play (sanity check).
   */
  totalStones() {
    return this.board.reduce((a, b) => a + b, 0);
  }

  /**
   * Serialize the current state.
   */
  serialize() {
    return {
      board: [...this.board],
      turn: this.turn,
      gameOver: this.gameOver,
    };
  }
}

// Export as global
window.MancalaGame = MancalaGame;
window.PLAYER_PITS = PLAYER_PITS;
window.PLAYER_STORE = PLAYER_STORE;
window.OPPONENT_PITS = OPPONENT_PITS;
window.OPPONENT_STORE = OPPONENT_STORE;
