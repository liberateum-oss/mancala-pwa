/**
 * Mancala UI Controller
 * Manages rendering, interactions, and user feedback.
 */

const game = new MancalaGame();
let suggestedPitIndex = null;
let animating = false;

// --- DOM references ---
const boardEl = document.getElementById('board');
const turnBanner = document.getElementById('turnBanner');
const turnLabel = document.getElementById('turnLabel');
const turnIndicator = document.getElementById('turnIndicator');
const suggestionPanel = document.getElementById('suggestionPanel');
const suggestionPit = document.getElementById('suggestionPit');
const suggestionReason = document.getElementById('suggestionReason');
const opponentInputSection = document.getElementById('opponentInputSection');
const opponentMoveButtons = document.getElementById('opponentMoveButtons');
const opponentMoveNote = document.getElementById('opponentMoveNote');
const gameOverPanel = document.getElementById('gameOverPanel');
const gameOverTitle = document.getElementById('gameOverTitle');
const gameOverSubtitle = document.getElementById('gameOverSubtitle');
const gameOverIcon = document.getElementById('gameOverIcon');
const finalPlayerScore = document.getElementById('finalPlayerScore');
const finalOpponentScore = document.getElementById('finalOpponentScore');
const playerPitsInner = document.getElementById('player-pits-inner');
const opponentPitsInner = document.getElementById('opponent-pits-inner');
const storePlayerCount = document.getElementById('store-player-count');
const storeOpponentCount = document.getElementById('store-opponent-count');
// stores are: player on left, opponent on right

// --- Rendering ---

function renderBoard() {
  renderPits();
  renderStores();
  renderSuggestion();
  renderTurnUI();
}

function renderPits() {
  // Player pits: indices 0–5, rendered left to right
  playerPitsInner.innerHTML = '';
  for (let i = 0; i <= 5; i++) {
    const pit = createPitElement(i, game.board[i], 'player');
    playerPitsInner.appendChild(pit);
  }

  // Opponent pits: rendered right-to-left visually (12 → 7), so that:
  //   - Pit 12 appears leftmost = opponent's pit 1 (their left = our right-to-left view)
  //   - Pit 7 appears rightmost = opponent's pit 6 (nearest OPP STORE on the left)
  // This way opponent pit numbers match what they see from their side of the board.
  opponentPitsInner.innerHTML = '';
  for (let i = 12; i >= 7; i--) {
    const pit = createPitElement(i, game.board[i], 'opponent');
    opponentPitsInner.appendChild(pit);
  }

  renderOpponentMoveButtons();
}

function createPitElement(index, count, side) {
  const pit = document.createElement('div');
  const isPlayer = side === 'player';
  const isSuggested = isPlayer && index === suggestedPitIndex && game.turn === 'player';
  const isClickable = isPlayer && game.turn === 'player' && !game.gameOver && !animating;
  const isEmpty = count === 0;

  pit.className = [
    'pit',
    `pit--${side}`,
    isSuggested ? 'pit--suggested' : '',
    isClickable && !isEmpty ? 'pit--clickable' : '',
    isEmpty ? 'pit--empty' : '',
  ].join(' ').trim();

  pit.setAttribute('data-index', index);
  pit.setAttribute('data-testid', `pit-${index}`);
  pit.setAttribute('role', 'button');
  pit.setAttribute('tabindex', isClickable && !isEmpty ? '0' : '-1');
  pit.setAttribute('aria-label', `${side === 'player' ? 'Your' : 'Opponent'} pit ${isPlayer ? index + 1 : 13 - index}: ${count} stone${count !== 1 ? 's' : ''}`);

  // Pit number label (1-based, from each side's perspective)
  // Opponent store is on the LEFT. Opponent pits are rendered 12→7 left-to-right.
  // Pit 12 = their pit 1, pit 11 = their pit 2, ..., pit 7 = their pit 6
  const pitNum = isPlayer ? index + 1 : 13 - index; // opponent: 12→1, 11→2, ..., 7→6
  const label = document.createElement('span');
  label.className = 'pit-number';
  label.textContent = pitNum;
  pit.appendChild(label);

  // Stone count + label
  const countEl = document.createElement('span');
  countEl.className = 'pit-count';
  countEl.textContent = count;
  pit.appendChild(countEl);

  const countLabelEl = document.createElement('span');
  countLabelEl.className = 'pit-count-label';
  countLabelEl.textContent = count === 1 ? 'stone' : 'stones';
  pit.appendChild(countLabelEl);

  // Stone visual
  const stonesWrap = document.createElement('div');
  stonesWrap.className = 'stones-wrap';
  const visCount = Math.min(count, 16); // cap visual stones at 16
  for (let s = 0; s < visCount; s++) {
    const stone = document.createElement('span');
    stone.className = 'stone';
    stone.style.setProperty('--stone-angle', `${Math.random() * 360}deg`);
    stone.style.setProperty('--stone-x', `${(Math.random() * 70 - 35)}%`);
    stone.style.setProperty('--stone-y', `${(Math.random() * 70 - 35)}%`);
    stonesWrap.appendChild(stone);
  }
  pit.appendChild(stonesWrap);

  if (isClickable && !isEmpty) {
    pit.addEventListener('click', () => handlePlayerMove(index));
    pit.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handlePlayerMove(index);
      }
    });
  }

  return pit;
}

function renderStores() {
  storePlayerCount.textContent = game.board[PLAYER_STORE];
  storeOpponentCount.textContent = game.board[OPPONENT_STORE];
  renderStoreStones(
    document.getElementById('store-player-pile'),
    game.board[PLAYER_STORE]
  );
  renderStoreStones(
    document.getElementById('store-opponent-pile'),
    game.board[OPPONENT_STORE]
  );
}

function renderStoreStones(container, count) {
  container.innerHTML = '';
  const vis = Math.min(count, 24);
  for (let s = 0; s < vis; s++) {
    const stone = document.createElement('span');
    stone.className = 'stone stone--store';
    stone.style.setProperty('--stone-angle', `${Math.random() * 360}deg`);
    stone.style.setProperty('--stone-x', `${(Math.random() * 80 - 40)}%`);
    stone.style.setProperty('--stone-y', `${(Math.random() * 80 - 40)}%`);
    container.appendChild(stone);
  }
}

function renderTurnUI() {
  if (game.gameOver) {
    turnLabel.textContent = 'Game Over';
    turnIndicator.className = 'turn-indicator turn-indicator--neutral';
    return;
  }
  if (game.turn === 'player') {
    turnLabel.textContent = 'Your Turn';
    turnIndicator.className = 'turn-indicator turn-indicator--player';
    opponentInputSection.classList.add('hidden');
  } else {
    turnLabel.textContent = "Opponent's Turn — Enter their move below";
    turnIndicator.className = 'turn-indicator turn-indicator--opponent';
    opponentInputSection.classList.remove('hidden');
  }
}

function renderSuggestion() {
  if (game.gameOver || game.turn !== 'player') {
    suggestionPanel.classList.add('suggestion--muted');
    suggestionPit.textContent = '—';
    suggestionReason.textContent = game.turn !== 'player'
      ? 'Waiting for opponent to move...'
      : 'Game over.';
    return;
  }

  const suggestion = MancalaAI.suggest(game.board);
  if (!suggestion) {
    suggestionPit.textContent = '—';
    suggestionReason.textContent = 'No valid moves available.';
    return;
  }

  suggestionPanel.classList.remove('suggestion--muted');
  suggestedPitIndex = suggestion.pitIndex;
  suggestionPit.textContent = `Pit ${suggestion.pitNumber}`;
  suggestionReason.textContent = suggestion.reason;
}

function renderOpponentMoveButtons() {
  opponentMoveButtons.innerHTML = '';
  if (game.turn !== 'opponent' || game.gameOver) return;

  // Opponent pits rendered as buttons 1–6 from their perspective.
  // Pit 12 = their pit 1, pit 11 = their pit 2, ..., pit 7 = their pit 6
  for (let i = 12; i >= 7; i--) {
    const opponentPitNumber = 13 - i; // 12→1, 11→2, ..., 7→6
    const count = game.board[i];
    const btn = document.createElement('button');
    btn.className = 'opp-move-btn' + (count === 0 ? ' opp-move-btn--empty' : '');
    btn.setAttribute('data-testid', `opp-move-btn-${opponentPitNumber}`);
    btn.disabled = count === 0;
    btn.innerHTML = `
      <span class="opp-btn-label">Pit</span>
      <span class="opp-btn-num">${opponentPitNumber}</span>
      <span class="opp-btn-stones">${count} <span class="opp-btn-stones-word">${count === 1 ? 'stone' : 'stones'}</span></span>
    `;
    btn.setAttribute('aria-label', `Opponent pit ${opponentPitNumber}: ${count} stones`);
    if (count > 0) {
      btn.addEventListener('click', () => handleOpponentMove(i));
    }
    opponentMoveButtons.appendChild(btn);
  }
}

// --- Game Logic Handlers ---

function handlePlayerMove(pitIndex) {
  if (animating) return;
  if (!game.isValidMove(pitIndex)) return;

  animating = true;
  suggestedPitIndex = null;

  const result = game.makeMove(pitIndex);
  renderBoard();

  if (result.bonusTurn) {
    showToast('Bonus turn! You get to go again.', 'success');
  }
  if (result.captured) {
    showToast(`Captured ${result.capturedCount} stone${result.capturedCount !== 1 ? 's' : ''}!`, 'capture');
  }
  if (result.gameOver) {
    setTimeout(() => showGameOver(result.winner), 300);
  }

  setTimeout(() => {
    animating = false;
    renderBoard(); // re-render after animations
  }, 350);
}

function handleOpponentMove(pitIndex) {
  if (animating) return;
  if (!game.isValidMove(pitIndex)) {
    opponentMoveNote.textContent = 'That pit is empty or not valid for the opponent. Please choose another.';
    return;
  }

  animating = true;
  opponentMoveNote.textContent = '';

  const result = game.makeMove(pitIndex);
  const opponentPitNumber = pitIndex - 6;

  renderBoard();

  if (result.bonusTurn) {
    showToast(`Opponent gets a bonus turn from pit ${opponentPitNumber}!`, 'warning');
  }
  if (result.captured) {
    showToast(`Opponent captured ${result.capturedCount} stone${result.capturedCount !== 1 ? 's' : ''}!`, 'warning');
  }
  if (result.gameOver) {
    setTimeout(() => showGameOver(result.winner), 300);
  }

  setTimeout(() => {
    animating = false;
    renderBoard();
  }, 350);
}

function showGameOver(winner) {
  gameOverPanel.classList.remove('hidden');
  finalPlayerScore.textContent = game.board[PLAYER_STORE];
  finalOpponentScore.textContent = game.board[OPPONENT_STORE];

  if (winner === 'player') {
    gameOverIcon.textContent = '🏆';
    gameOverTitle.textContent = 'You Win!';
    gameOverSubtitle.textContent = 'Outstanding play — your strategy paid off.';
  } else if (winner === 'opponent') {
    gameOverIcon.textContent = '😔';
    gameOverTitle.textContent = 'Opponent Wins';
    gameOverSubtitle.textContent = 'Better luck next time! Try following the suggestions more closely.';
  } else {
    gameOverIcon.textContent = '🤝';
    gameOverTitle.textContent = "It's a Tie!";
    gameOverSubtitle.textContent = 'Perfectly matched — well played by both sides.';
  }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.add('toast--visible');
  });
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 400);
  }, 2800);
}

// --- Controls ---

document.getElementById('newGameBtn').addEventListener('click', () => {
  game.reset();
  suggestedPitIndex = null;
  gameOverPanel.classList.add('hidden');
  opponentMoveNote.textContent = '';
  renderBoard();
});

document.getElementById('playAgainBtn').addEventListener('click', () => {
  game.reset();
  suggestedPitIndex = null;
  gameOverPanel.classList.add('hidden');
  opponentMoveNote.textContent = '';
  renderBoard();
});

// Help modal
const helpModal = document.getElementById('helpModal');
document.getElementById('helpBtn').addEventListener('click', () => {
  helpModal.classList.remove('hidden');
  helpModal.focus();
});
document.getElementById('closeHelp').addEventListener('click', () => {
  helpModal.classList.add('hidden');
});
helpModal.addEventListener('click', (e) => {
  if (e.target === helpModal) helpModal.classList.add('hidden');
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') helpModal.classList.add('hidden');
});

// Theme toggle
(function () {
  const toggle = document.getElementById('themeToggle');
  const root = document.documentElement;
  let currentTheme = root.getAttribute('data-theme') || 'dark';

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    currentTheme = theme;
    toggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    toggle.innerHTML = theme === 'dark'
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  // Default from system
  if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    applyTheme('light');
  } else {
    applyTheme('dark');
  }

  toggle.addEventListener('click', () => {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  });
})();

// --- Initial render ---
renderBoard();
