import { Board, CellState } from '../../store/gameStore';
import { evaluateBoard, getPossibleMoves, isWinningMove } from './evaluator';

export interface AIMove {
  row: number;
  col: number;
  score: number;
}

/**
 * 检查游戏是否结束
 */
function isGameOver(board: Board, lastMove?: [number, number]): boolean {
  if (!lastMove) return false;
  
  const [row, col] = lastMove;
  const player = board[row][col];
  
  // 检查四个方向是否有五子连珠
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  
  for (const [dx, dy] of directions) {
    let count = 1;
    
    // 正方向
    for (let i = 1; i < 5; i++) {
      const newRow = row + dx * i;
      const newCol = col + dy * i;
      if (newRow >= 0 && newRow < 15 && newCol >= 0 && newCol < 15 && 
          board[newRow][newCol] === player) {
        count++;
      } else {
        break;
      }
    }
    
    // 负方向
    for (let i = 1; i < 5; i++) {
      const newRow = row - dx * i;
      const newCol = col - dy * i;
      if (newRow >= 0 && newRow < 15 && newCol >= 0 && newCol < 15 && 
          board[newRow][newCol] === player) {
        count++;
      } else {
        break;
      }
    }
    
    if (count >= 5) return true;
  }
  
  return false;
}

/**
 * Minimax 算法 with Alpha-Beta 剪枝
 */
function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayer: CellState,
  lastMove?: [number, number],
  maxMoves: number = 15
): number {
  // 终止条件
  if (depth === 0 || isGameOver(board, lastMove)) {
    return evaluateBoard(board, aiPlayer);
  }
  
  const moves = getPossibleMoves(board, maxMoves);
  const currentPlayer = isMaximizing ? aiPlayer : (aiPlayer === 1 ? 2 : 1);
  
  if (isMaximizing) {
    let maxScore = -Infinity;
    
    for (const [row, col] of moves) {
      // 优先考虑必胜招法
      if (isWinningMove(board, row, col, currentPlayer)) {
        return 100000;
      }
      
      board[row][col] = currentPlayer;
      const score = minimax(board, depth - 1, alpha, beta, false, aiPlayer, [row, col], maxMoves);
      board[row][col] = 0;
      
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      
      if (beta <= alpha) {
        break; // Beta 剪枝
      }
    }
    
    return maxScore;
  } else {
    let minScore = Infinity;
    
    for (const [row, col] of moves) {
      // 优先阻止对手必胜
      if (isWinningMove(board, row, col, currentPlayer)) {
        return -100000;
      }
      
      board[row][col] = currentPlayer;
      const score = minimax(board, depth - 1, alpha, beta, true, aiPlayer, [row, col], maxMoves);
      board[row][col] = 0;
      
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      
      if (beta <= alpha) {
        break; // Alpha 剪枝
      }
    }
    
    return minScore;
  }
}

/**
 * 获取 AI 的最佳落子位置
 */
export function getBestMove(board: Board, aiPlayer: CellState, difficulty: number = 2): AIMove {
  const maxMoves = difficulty === 1 ? 8 : difficulty === 2 ? 12 : 15;
  const moves = getPossibleMoves(board, maxMoves);
  let bestMove: AIMove = { row: -1, col: -1, score: -Infinity };
  
  // 首先检查是否有必胜招法
  for (const [row, col] of moves) {
    if (isWinningMove(board, row, col, aiPlayer)) {
      return { row, col, score: 100000 };
    }
  }
  
  // 然后检查是否需要阻止对手必胜
  const opponent = aiPlayer === 1 ? 2 : 1;
  for (const [row, col] of moves) {
    if (isWinningMove(board, row, col, opponent)) {
      return { row, col, score: 50000 };
    }
  }
  
  // 根据难度调整搜索深度
  const searchDepth = Math.max(1, difficulty);
  
  // 使用 Minimax 算法寻找最佳落子位置
  for (const [row, col] of moves) {
    const tempBoard = board.map(r => [...r]);
    tempBoard[row][col] = aiPlayer;
    
    const score = minimax(
      tempBoard,
      searchDepth,
      -Infinity,
      Infinity,
      false,
      aiPlayer,
      [row, col],
      maxMoves
    );
    
    if (score > bestMove.score) {
      bestMove = { row, col, score };
    }
  }
  
  return bestMove;
}

/**
 * 异步获取 AI 落子位置（用于 Web Worker）
 */
export async function getAIMoveAsync(
  board: Board,
  aiPlayer: CellState,
  difficulty: number = 4
): Promise<AIMove> {
  return new Promise((resolve) => {
    // 使用 setTimeout 避免阻塞主线程
    setTimeout(() => {
      const move = getBestMove(board, aiPlayer, difficulty);
      resolve(move);
    }, 0);
  });
}
