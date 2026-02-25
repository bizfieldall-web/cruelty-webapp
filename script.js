const difficultySelect = document.querySelector('#difficulty');
const rowsInput = document.querySelector('#rows');
const colsInput = document.querySelector('#cols');
const imageUpload = document.querySelector('#imageUpload');
const newGameBtn = document.querySelector('#newGameBtn');
const shuffleBtn = document.querySelector('#shuffleBtn');
const showOriginal = document.querySelector('#showOriginal');
const puzzleBoard = document.querySelector('#puzzleBoard');
const originalPreview = document.querySelector('#originalPreview');
const originalWrap = document.querySelector('#originalWrap');
const statusText = document.querySelector('#status');

let rows = 4;
let cols = 4;
let slots = [];
let emptySlotIndex = 0;
let imageSrc = createDefaultImage();

function difficultyToSize(stars) {
  return stars + 3;
}

function createDefaultImage() {
  const svg = encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop stop-color='#2a67f5'/>
          <stop offset='1' stop-color='#7f5af0'/>
        </linearGradient>
      </defs>
      <rect width='100%' height='100%' fill='url(#g)'/>
      <circle cx='460' cy='130' r='90' fill='rgba(255,255,255,.2)'/>
      <circle cx='180' cy='380' r='130' fill='rgba(255,255,255,.15)'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='56' fill='white' font-family='Arial'>Sliding Puzzle</text>
    </svg>
  `);
  return `data:image/svg+xml;charset=utf-8,${svg}`;
}

function slotGridIndex(row, col) {
  return row * (cols + 1) + col;
}

function isValidSlot(row, col) {
  if (row < 0 || row >= rows || col < 0 || col > cols) {
    return false;
  }

  if (row < rows - 1 && col === cols) {
    return false;
  }

  return true;
}

function buildSolvedSlots() {
  slots = Array(rows * (cols + 1)).fill(null);
  let pieceValue = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col <= cols; col += 1) {
      if (!isValidSlot(row, col)) {
        continue;
      }

      const index = slotGridIndex(row, col);
      if (row === rows - 1 && col === cols) {
        slots[index] = -1;
        emptySlotIndex = index;
      } else {
        slots[index] = pieceValue;
        pieceValue += 1;
      }
    }
  }
}

function isAdjacentByIndex(firstIndex, secondIndex) {
  const firstRow = Math.floor(firstIndex / (cols + 1));
  const firstCol = firstIndex % (cols + 1);
  const secondRow = Math.floor(secondIndex / (cols + 1));
  const secondCol = secondIndex % (cols + 1);

  return Math.abs(firstRow - secondRow) + Math.abs(firstCol - secondCol) === 1;
}

function listMovableNeighbors(index) {
  const row = Math.floor(index / (cols + 1));
  const col = index % (cols + 1);
  const candidates = [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ];

  return candidates
    .filter(([candidateRow, candidateCol]) => isValidSlot(candidateRow, candidateCol))
    .map(([candidateRow, candidateCol]) => slotGridIndex(candidateRow, candidateCol))
    .filter((candidateIndex) => slots[candidateIndex] !== -1);
}

function movePiece(slotIndex) {
  if (!isAdjacentByIndex(slotIndex, emptySlotIndex)) {
    return;
  }

  if (slots[slotIndex] === null || slots[slotIndex] === -1) {
    return;
  }

  [slots[slotIndex], slots[emptySlotIndex]] = [slots[emptySlotIndex], slots[slotIndex]];
  emptySlotIndex = slotIndex;
  renderBoard();
  updateStatus();
}

function shuffleBoard() {
  const totalMoves = rows * cols * 60;

  for (let move = 0; move < totalMoves; move += 1) {
    const neighbors = listMovableNeighbors(emptySlotIndex);
    const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
    [slots[randomNeighbor], slots[emptySlotIndex]] = [slots[emptySlotIndex], slots[randomNeighbor]];
    emptySlotIndex = randomNeighbor;
  }

  renderBoard();
  updateStatus();
}

function renderBoard() {
  puzzleBoard.innerHTML = '';
  puzzleBoard.style.gridTemplateColumns = `repeat(${cols + 1}, 1fr)`;
  puzzleBoard.style.aspectRatio = `${cols + 1} / ${rows}`;

  slots.forEach((pieceValue, index) => {
    const row = Math.floor(index / (cols + 1));
    const col = index % (cols + 1);

    if (!isValidSlot(row, col)) {
      const voidCell = document.createElement('div');
      voidCell.className = 'void-cell';
      puzzleBoard.append(voidCell);
      return;
    }

    const tile = document.createElement('button');
    tile.className = 'tile';
    tile.setAttribute('type', 'button');

    if (pieceValue === -1) {
      tile.classList.add('empty');
      tile.disabled = true;
      tile.setAttribute('aria-label', '빈 칸');
    } else {
      const sourceRow = Math.floor(pieceValue / cols);
      const sourceCol = pieceValue % cols;
      const positionX = cols === 1 ? 0 : (sourceCol / (cols - 1)) * 100;
      const positionY = rows === 1 ? 0 : (sourceRow / (rows - 1)) * 100;
      tile.style.backgroundImage = `url("${imageSrc}")`;
      tile.style.backgroundSize = `${cols * 100}% ${rows * 100}%`;
      tile.style.backgroundPosition = `${positionX}% ${positionY}%`;
      tile.setAttribute('aria-label', `${sourceRow + 1}행 ${sourceCol + 1}열 조각`);
      tile.addEventListener('click', () => movePiece(index));
    }

    puzzleBoard.append(tile);
  });
}

function isSolved() {
  let expectedPiece = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col <= cols; col += 1) {
      if (!isValidSlot(row, col)) {
        continue;
      }

      const index = slotGridIndex(row, col);
      const piece = slots[index];

      if (row === rows - 1 && col === cols) {
        return piece === -1;
      }

      if (piece !== expectedPiece) {
        return false;
      }
      expectedPiece += 1;
    }
  }

  return true;
}

function updateStatus() {
  const stars = Number.parseInt(difficultySelect.value, 10);
  if (isSolved()) {
    statusText.textContent = `완성! 난이도 ${'⭐'.repeat(stars)} 퍼즐을 맞췄어요 🎉`;
  } else {
    statusText.textContent = `난이도 ${'⭐'.repeat(stars)} · 우하단 확장 빈칸으로 타일을 밀어 맞춰보세요.`;
  }
}

function applyImage(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    imageSrc = event.target?.result;
    originalPreview.src = imageSrc;
    renderBoard();
    updateStatus();
  };
  reader.readAsDataURL(file);
}

function applyDifficulty() {
  const stars = Number.parseInt(difficultySelect.value, 10);
  const size = difficultyToSize(Number.isNaN(stars) ? 1 : stars);
  rows = size;
  cols = size;
  rowsInput.value = rows;
  colsInput.value = cols;
}

function startNewGame() {
  applyDifficulty();
  buildSolvedSlots();
  shuffleBoard();
}

showOriginal.addEventListener('change', () => {
  originalWrap.classList.toggle('hidden', !showOriginal.checked);
});

imageUpload.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  applyImage(file);
});

difficultySelect.addEventListener('change', () => {
  startNewGame();
});

newGameBtn.addEventListener('click', () => {
  startNewGame();
});

shuffleBtn.addEventListener('click', () => {
  shuffleBoard();
});

originalPreview.src = imageSrc;
startNewGame();
