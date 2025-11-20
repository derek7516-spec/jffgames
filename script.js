const BOARD_SIZE = 8;
const FRUIT_LEVELS = 9; // Maximum fruit level (9.png is the highest)
const INITIAL_SPAWN_COUNT = 8;
const NEW_FRUITS_PER_MOVE = 2;
const MAX_SPAWN_LEVEL = 3; // Only spawn levels 1-3, higher levels come from merging
let board = [];
let score = 0;
let selectedCell = null;

function initBoard() {
    board = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
    score = 0;
    selectedCell = null;
    updateScore();
    spawnFruits(INITIAL_SPAWN_COUNT); // Initial spawn
    renderBoard();
}

function spawnFruits(count) {
    let emptyCells = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === 0) emptyCells.push([r, c]);
        }
    }
    for (let i = 0; i < count && emptyCells.length > 0; i++) {
        let idx = Math.floor(Math.random() * emptyCells.length);
        let [r, c] = emptyCells.splice(idx, 1)[0];
        // Only spawn low-level fruits (1.png, 2.png, 3.png)
        // Higher levels (4-9.png) must be earned by merging
        board[r][c] = Math.floor(Math.random() * MAX_SPAWN_LEVEL) + 1;
    }
}

function renderBoard() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            if (board[r][c] > 0) {
                const img = document.createElement('img');
                img.src = `img/${board[r][c]}.png`;
                img.alt = `Fruit ${board[r][c]}`;
                cell.appendChild(img);
            }
            if (selectedCell && selectedCell[0] === r && selectedCell[1] === c) {
                cell.style.border = '2px solid blue';
            }
            cell.addEventListener('click', () => handleCellClick(r, c));
            boardEl.appendChild(cell);
        }
    }
}

function handleCellClick(r, c) {
    if (selectedCell === null) {
        if (board[r][c] > 0) {
            selectedCell = [r, c];
            renderBoard();
        }
    } else {
        const [sr, sc] = selectedCell;
        if (sr === r && sc === c) {
            // Deselect
            selectedCell = null;
            renderBoard();
        } else if (board[r][c] === 0) {
            // Move to empty cell
            board[r][c] = board[sr][sc];
            board[sr][sc] = 0;
            selectedCell = null;
            applyGravity();
            spawnFruits(NEW_FRUITS_PER_MOVE); // Spawn new fruits after move
            renderBoard();
            checkGameOver();
        } else if (board[r][c] === board[sr][sc] && board[r][c] < FRUIT_LEVELS) {
            // Merge
            board[r][c]++;
            board[sr][sc] = 0;
            score += board[r][c] * 10;
            updateScore();
            selectedCell = null;
            
            // Check if player created the ultimate fruit (level 9)
            if (board[r][c] === FRUIT_LEVELS) {
                setTimeout(() => {
                    alert(`🎉 恭喜！你創造了最高級水果 (${FRUIT_LEVELS}.png)！\n當前分數: ${score}`);
                }, 100);
            }
            
            applyGravity();
            spawnFruits(NEW_FRUITS_PER_MOVE); // Spawn new fruits after merge
            renderBoard();
            checkGameOver();
        } else {
            // Invalid move, deselect
            selectedCell = null;
            renderBoard();
        }
    }
}

function applyGravity() {
    for (let c = 0; c < BOARD_SIZE; c++) {
        let writeRow = BOARD_SIZE - 1;
        for (let r = BOARD_SIZE - 1; r >= 0; r--) {
            if (board[r][c] > 0) {
                board[writeRow][c] = board[r][c];
                if (writeRow !== r) board[r][c] = 0;
                writeRow--;
            }
        }
    }
}

function updateScore() {
    document.getElementById('score').textContent = `分數: ${score}`;
}

function checkGameOver() {
    // Simple check: if no empty cells and no possible merges
    let hasEmpty = false;
    let canMerge = false;
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === 0) hasEmpty = true;
            // Check adjacent
            if (r > 0 && board[r][c] === board[r-1][c] && board[r][c] < FRUIT_LEVELS) canMerge = true;
            if (c > 0 && board[r][c] === board[r][c-1] && board[r][c] < FRUIT_LEVELS) canMerge = true;
        }
    }
    if (!hasEmpty && !canMerge) {
        alert('遊戲結束！分數: ' + score);
    }
}

document.getElementById('restart').addEventListener('click', initBoard);

// Start game
initBoard();
