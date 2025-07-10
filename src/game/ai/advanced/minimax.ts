import Cache from "./cache";
import Evaluate, { FIVE } from "./evaluate";

const MAX = 1000000000;

export interface CacheHits {
  search: number;
  total: number;
  hit: number;
}

export const cacheHits: CacheHits = {
  search: 0,
  total: 0,
  hit: 0,
};

const onlyThreeThreshold = 6;
const cache = new Cache();

class AdvancedMinmax {
  private evaluator: Evaluate;
  private size: number;

  constructor(size = 15) {
    this.size = size;
    this.evaluator = new Evaluate(size);
  }

  // Main minimax function with alpha-beta pruning
  minimax(
    board: number[][],
    role: number,
    depth: number,
    currentDepth = 0,
    path: Array<[number, number]> = [],
    alpha = -MAX,
    beta = MAX,
    onlyThree = false,
    onlyFour = false
  ): [number, [number, number] | null, Array<[number, number]>] {
    cacheHits.search++;

    if (currentDepth >= depth || this.isGameOver(board)) {
      return [this.evaluator.evaluate(board, role), null, [...path]];
    }

    // Cache lookup
    const hash = this.hashBoard(board);
    const cached = cache.get(hash);
    if (cached && cached.role === role) {
      if (
        (Math.abs(cached.value) >= FIVE ||
          cached.depth >= depth - currentDepth) &&
        cached.onlyThree === onlyThree &&
        cached.onlyFour === onlyFour
      ) {
        cacheHits.hit++;
        return [cached.value, cached.move, [...path, ...cached.path]];
      }
    }

    let bestValue = -MAX;
    let bestMove: [number, number] | null = null;
    let bestPath = [...path];

    const moves = this.evaluator.getValuableMoves(
      board,
      role,
      currentDepth,
      onlyThree || currentDepth > onlyThreeThreshold,
      onlyFour
    );

    if (currentDepth === 0) {
      console.log("Advanced AI considering moves:", moves);
    }

    if (!moves.length) {
      return [this.evaluator.evaluate(board, role), null, [...path]];
    }

    // Iterative deepening for better move ordering
    for (let d = currentDepth + 1; d <= depth; d += 1) {
      if (d % 2 !== 0) continue; // Only search even depths for efficiency

      let breakAll = false;
      for (const [i, j] of moves) {
        // Make move
        board[i][j] = role;

        const [value] = this.minimax(
          board,
          -role,
          d,
          currentDepth + 1,
          [...path, [i, j]],
          -beta,
          -Math.max(alpha, bestValue),
          onlyThree,
          onlyFour
        );

        // Undo move
        board[i][j] = 0;

        const actualValue = -value;

        if (actualValue > bestValue) {
          bestValue = actualValue;
          bestMove = [i, j];
          bestPath = [...path, [i, j]];
        }

        // Alpha-beta pruning
        if (bestValue >= beta) {
          breakAll = true;
          break;
        }

        alpha = Math.max(alpha, bestValue);
      }

      if (breakAll) break;

      // Early termination if we found a winning move
      if (Math.abs(bestValue) >= FIVE) {
        break;
      }
    }

    // Cache the result
    if (bestMove) {
      cache.put(hash, {
        depth: depth - currentDepth,
        value: bestValue,
        move: bestMove,
        path: bestPath.slice(path.length),
        role,
        onlyThree,
        onlyFour,
      });
    }

    return [bestValue, bestMove, bestPath];
  }

  // Simplified interface for getting the best move
  getBestMove(
    board: number[][],
    role: number,
    depth = 6
  ): [number, number] | null {
    const [, move] = this.minimax(board, role, depth);
    return move;
  }

  private isGameOver(board: number[][]): boolean {
    // Check if someone has won
    if (this.evaluator.getWinner(board) !== 0) {
      return true;
    }

    // Check if board is full
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (board[i][j] === 0) {
          return false;
        }
      }
    }

    return true;
  }

  private hashBoard(board: number[][]): number {
    let hash = 0;
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        if (board[i][j] !== 0) {
          hash ^= (board[i][j] === 1 ? 1 : 2) * (i * this.size + j + 1);
        }
      }
    }
    return hash;
  }

  // Clear cache
  clearCache(): void {
    cache.clear();
  }

  // Get cache statistics
  getCacheStats(): { size: number; hits: CacheHits } {
    return {
      size: cache.size(),
      hits: { ...cacheHits },
    };
  }
}

export { AdvancedMinmax };
export default AdvancedMinmax;
