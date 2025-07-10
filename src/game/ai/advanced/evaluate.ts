// Advanced board evaluation system
export const FIVE = 100000;
export const FOUR = 10000;
export const BLOCKED_FOUR = 1000;
export const THREE = 1000;
export const BLOCKED_THREE = 100;
export const TWO = 100;
export const BLOCKED_TWO = 10;
export const ONE = 10;
export const BLOCKED_ONE = 1;

// Pattern scores
const scoreTable = [
  [0], // 0 consecutive pieces
  [1, 1], // 1 consecutive piece
  [10, 10], // 2 consecutive pieces
  [100, 50], // 3 consecutive pieces
  [10000, 500], // 4 consecutive pieces
  [100000], // 5 consecutive pieces
];

class Evaluate {
  private size: number;

  constructor(size = 15) {
    this.size = size;
  }

  // Evaluate a single line (horizontal, vertical, or diagonal)
  private evaluateLine(line: number[], role: number): number {
    let score = 0;
    let consecutive = 0;
    let blocked = false;

    for (let i = 0; i < line.length; i++) {
      if (line[i] === role) {
        consecutive++;
      } else if (line[i] === 0) {
        if (consecutive > 0) {
          const isBlocked = blocked || i === line.length - 1;
          score += this.getScore(consecutive, isBlocked);
          consecutive = 0;
        }
        blocked = false;
      } else {
        if (consecutive > 0) {
          score += this.getScore(consecutive, true);
          consecutive = 0;
        }
        blocked = true;
      }
    }

    if (consecutive > 0) {
      score += this.getScore(consecutive, blocked);
    }

    return score;
  }

  private getScore(consecutive: number, blocked: boolean): number {
    if (consecutive >= 5) return FIVE;
    if (consecutive === 4) return blocked ? BLOCKED_FOUR : FOUR;
    if (consecutive === 3) return blocked ? BLOCKED_THREE : THREE;
    if (consecutive === 2) return blocked ? BLOCKED_TWO : TWO;
    if (consecutive === 1) return blocked ? BLOCKED_ONE : ONE;
    return 0;
  }

  // Main evaluation function
  evaluate(board: number[][], role: number): number {
    let score = 0;

    // Evaluate all horizontal lines
    for (let i = 0; i < this.size; i++) {
      score += this.evaluateLine(board[i], role);
      score -= this.evaluateLine(board[i], -role);
    }

    // Evaluate all vertical lines
    for (let j = 0; j < this.size; j++) {
      const line = [];
      for (let i = 0; i < this.size; i++) {
        line.push(board[i][j]);
      }
      score += this.evaluateLine(line, role);
      score -= this.evaluateLine(line, -role);
    }

    // Evaluate all diagonal lines (top-left to bottom-right)
    for (let k = 0; k < this.size * 2 - 1; k++) {
      const line = [];
      for (let i = 0; i < this.size; i++) {
        const j = k - i;
        if (j >= 0 && j < this.size) {
          line.push(board[i][j]);
        }
      }
      if (line.length >= 5) {
        score += this.evaluateLine(line, role);
        score -= this.evaluateLine(line, -role);
      }
    }

    // Evaluate all diagonal lines (top-right to bottom-left)
    for (let k = 0; k < this.size * 2 - 1; k++) {
      const line = [];
      for (let i = 0; i < this.size; i++) {
        const j = i - k + this.size - 1;
        if (j >= 0 && j < this.size) {
          line.push(board[i][j]);
        }
      }
      if (line.length >= 5) {
        score += this.evaluateLine(line, role);
        score -= this.evaluateLine(line, -role);
      }
    }

    return score;
  }

  // Check if there's a winner
  getWinner(board: number[][]): number {
    const directions = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ];

    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const piece = board[i][j];
        if (piece === 0) continue;

        for (const [dx, dy] of directions) {
          let count = 1;

          // Check positive direction
          let x = i + dx;
          let y = j + dy;
          while (
            x >= 0 &&
            x < this.size &&
            y >= 0 &&
            y < this.size &&
            board[x][y] === piece
          ) {
            count++;
            x += dx;
            y += dy;
          }

          // Check negative direction
          x = i - dx;
          y = j - dy;
          while (
            x >= 0 &&
            x < this.size &&
            y >= 0 &&
            y < this.size &&
            board[x][y] === piece
          ) {
            count++;
            x -= dx;
            y -= dy;
          }

          if (count >= 5) {
            return piece;
          }
        }
      }
    }

    return 0; // No winner
  }

  // Get valuable moves for pruning
  getValuableMoves(
    board: number[][],
    role: number,
    depth = 0,
    onlyThree = false,
    onlyFour = false
  ): Array<[number, number]> {
    const moves: Array<[number, number, number]> = [];

    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (board[i][j] === 0) {
          // Check if this position is near existing pieces
          if (this.hasNeighbor(board, i, j)) {
            board[i][j] = role;
            const score = this.evaluate(board, role);
            board[i][j] = 0;

            moves.push([i, j, score]);
          }
        }
      }
    }

    // Sort by score and return top moves
    moves.sort((a, b) => b[2] - a[2]);
    return moves.slice(0, Math.min(10, moves.length)).map(([i, j]) => [i, j]);
  }

  private hasNeighbor(board: number[][], row: number, col: number): boolean {
    const directions = [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ];

    for (const [dx, dy] of directions) {
      const newRow = row + dx;
      const newCol = col + dy;

      if (
        newRow >= 0 &&
        newRow < this.size &&
        newCol >= 0 &&
        newCol < this.size
      ) {
        if (board[newRow][newCol] !== 0) {
          return true;
        }
      }
    }

    return false;
  }
}

export default Evaluate;
