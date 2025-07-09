import { Board, CellState } from "../../store/gameStore";
import { evaluateBoard, getPossibleMoves, isWinningMove } from "./evaluator";

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
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  for (const [dx, dy] of directions) {
    let count = 1;

    // 正方向
    for (let i = 1; i < 5; i++) {
      const newRow = row + dx * i;
      const newCol = col + dy * i;
      if (
        newRow >= 0 &&
        newRow < 15 &&
        newCol >= 0 &&
        newCol < 15 &&
        board[newRow][newCol] === player
      ) {
        count++;
      } else {
        break;
      }
    }

    // 负方向
    for (let i = 1; i < 5; i++) {
      const newRow = row - dx * i;
      const newCol = col - dy * i;
      if (
        newRow >= 0 &&
        newRow < 15 &&
        newCol >= 0 &&
        newCol < 15 &&
        board[newRow][newCol] === player
      ) {
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

  const opponent = aiPlayer === 1 ? 2 : 1;
  const currentPlayer = isMaximizing ? aiPlayer : opponent;

  // 首先检查是否有立即获胜或必须防守的招法
  if (isMaximizing) {
    // 检查AI是否有获胜招法
    const winningMoves = [];
    const moves = getPossibleMoves(board, maxMoves);

    for (const [row, col] of moves) {
      if (isWinningMove(board, row, col, aiPlayer)) {
        return 100000; // 发现必胜招法，立即返回高分
      }

      // 检查对手的威胁，识别需要防守的位置
      if (isWinningMove(board, row, col, opponent)) {
        winningMoves.push([row, col]);
      }
    }

    // 如果发现对手有威胁，优先考虑防守
    if (winningMoves.length > 0) {
      for (const [row, col] of winningMoves) {
        board[row][col] = aiPlayer;
        const score = minimax(board, depth - 1, alpha, beta, false, aiPlayer, [row, col], maxMoves);
        board[row][col] = 0;

        if (score > alpha) {
          alpha = score;
        }

        if (beta <= alpha) {
          break; // Beta 剪枝
        }
      }
      return alpha;
    }
  } else {
    // 检查对手是否有获胜招法
    const moves = getPossibleMoves(board, maxMoves);

    for (const [row, col] of moves) {
      if (isWinningMove(board, row, col, opponent)) {
        return -100000; // 发现对手必胜招法，立即返回低分
      }
    }
  }

  // 正常的minimax搜索
  const moves = getPossibleMoves(board, maxMoves);

  if (isMaximizing) {
    let maxScore = -Infinity;

    for (const [row, col] of moves) {
      board[row][col] = currentPlayer;
      const score = minimax(
        board,
        depth - 1,
        alpha,
        beta,
        false,
        aiPlayer,
        [row, col],
        maxMoves
      );
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
      board[row][col] = currentPlayer;
      const score = minimax(
        board,
        depth - 1,
        alpha,
        beta,
        true,
        aiPlayer,
        [row, col],
        maxMoves
      );
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
export function getBestMove(
  board: Board,
  aiPlayer: CellState,
  difficulty: number = 2
): AIMove {
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

  // 识别并阻止对手的高威胁棋型 (如活三)
  const threatMoves = identifyThreatMoves(board, opponent);
  if (threatMoves.length > 0) {
    // 从威胁招法中选择最佳防守位置
    const bestDefense = findBestDefense(board, threatMoves, aiPlayer, opponent);
    if (bestDefense) {
      return bestDefense;
    }
  }

  // 根据难度调整搜索深度
  const searchDepth = Math.max(1, difficulty);

  // 使用 Minimax 算法寻找最佳落子位置
  for (const [row, col] of moves) {
    const tempBoard = board.map((r) => [...r]);
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

/**
 * 识别对手的威胁招法（如活三）
 */
function identifyThreatMoves(board: Board, player: CellState): Array<[number, number, number]> {
  const threatMoves: Array<[number, number, number]> = []; // [row, col, threatLevel]

  // 遍历所有空位
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      if (board[row][col] === 0) {
        // 临时落子
        const tempBoard = board.map((r) => [...r]);
        tempBoard[row][col] = player;

        // 检查该位置形成的威胁级别
        let threatLevel = 0;

        // 检查四个方向
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

        for (const [dx, dy] of directions) {
          const lineInfo = getLineInfo(tempBoard, row, col, [dx, dy], player);

          // 评估威胁级别
          if (lineInfo.count >= 5) {
            // 连五，最高威胁
            threatLevel = 5;
            break;
          } else if (lineInfo.count === 4 && !lineInfo.leftBlocked && !lineInfo.rightBlocked) {
            // 活四，高威胁
            threatLevel = Math.max(threatLevel, 4);
          } else if (lineInfo.count === 4 && (!lineInfo.leftBlocked || !lineInfo.rightBlocked)) {
            // 冲四，中高威胁
            threatLevel = Math.max(threatLevel, 3);
          } else if (lineInfo.count === 3 && !lineInfo.leftBlocked && !lineInfo.rightBlocked) {
            // 活三，中威胁
            threatLevel = Math.max(threatLevel, 2);
          } else if (lineInfo.count === 3 && (!lineInfo.leftBlocked || !lineInfo.rightBlocked)) {
            // 冲三，低中威胁
            threatLevel = Math.max(threatLevel, 1);
          }
        }

        // 如果有威胁，加入列表
        if (threatLevel > 0) {
          threatMoves.push([row, col, threatLevel]);
        }
      }
    }
  }

  // 按威胁级别排序，最高威胁在前
  threatMoves.sort((a, b) => b[2] - a[2]);

  return threatMoves;
}

/**
 * 从威胁招法中找出最佳防守位置
 */
function findBestDefense(
  board: Board,
  threatMoves: Array<[number, number, number]>,
  aiPlayer: CellState,
  opponent: CellState
): AIMove | null {
  // 如果没有威胁，返回null
  if (threatMoves.length === 0) return null;

  // 先检查最高级别的威胁
  const highestThreat = threatMoves[0][2];

  // 如果是连五或活四，必须阻止
  if (highestThreat >= 4) {
    const [row, col] = threatMoves[0];
    return { row, col, score: 40000 };
  }

  // 如果是活三，也应该阻止，但可以评估一下最佳防守位置
  if (highestThreat >= 2) {
    // 收集所有活三位置
    const highThreats = threatMoves.filter(([, , level]) => level >= 2);

    // 如果有多个活三威胁，找出最佳防守位置
    if (highThreats.length > 1) {
      // 优先选择能同时防守多个威胁的位置
      const bestDefensePositions = findMultiDefensePosition(board, highThreats, opponent);
      if (bestDefensePositions.length > 0) {
        const [row, col] = bestDefensePositions[0];
        return { row, col, score: 30000 };
      }
    }

    // 如果没有多重防守位置，选择防守最高威胁
    const [row, col] = highThreats[0];
    return { row, col, score: 25000 };
  }

  // 对于较低级别的威胁，可以根据自己的攻击机会和防守需求权衡
  // 在这里，我们简单地返回最高威胁的防守位置
  const [row, col] = threatMoves[0];
  return { row, col, score: 20000 };
}

/**
 * 找出能同时防守多个威胁的位置
 */
function findMultiDefensePosition(
  board: Board,
  threats: Array<[number, number, number]>,
  player: CellState
): Array<[number, number]> {
  // 构建一个计数器，记录每个位置能防守的威胁数
  const defenseCounter = new Map<string, number>();

  // 对每个威胁位置，检查它周围的防守位置
  for (const [threatRow, threatCol] of threats) {
    // 模拟对手在此位置落子
    const tempBoard = board.map(r => [...r]);
    tempBoard[threatRow][threatCol] = player;

    // 检查四个方向
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

    for (const [dx, dy] of directions) {
      // 检查该方向上可能的防守位置
      for (let offset = -4; offset <= 4; offset++) {
        if (offset === 0) continue; // 跳过威胁位置本身

        const defRow = threatRow + dx * offset;
        const defCol = threatCol + dy * offset;

        // 检查位置是否有效且为空
        if (defRow >= 0 && defRow < 15 && defCol >= 0 && defCol < 15 && tempBoard[defRow][defCol] === 0) {
          // 检查此位置是否能有效防守
          tempBoard[defRow][defCol] = player === 1 ? 2 : 1; // 使用AI的棋子

          // 如果在这个位置放置棋子后，原威胁不再是威胁，则记为有效防守
          const newLineInfo = getLineInfo(tempBoard, threatRow, threatCol, [dx, dy], player);
          if (newLineInfo.count < 3 || (newLineInfo.leftBlocked && newLineInfo.rightBlocked)) {
            const key = `${defRow},${defCol}`;
            defenseCounter.set(key, (defenseCounter.get(key) || 0) + 1);
          }

          // 恢复棋盘
          tempBoard[defRow][defCol] = 0;
        }
      }
    }
  }

  // 将防守位置按能防守的威胁数排序
  const defenseMoves: Array<[number, number, number]> = [];
  for (const [key, count] of defenseCounter.entries()) {
    const [row, col] = key.split(',').map(Number);
    defenseMoves.push([row, col, count]);
  }

  defenseMoves.sort((a, b) => b[2] - a[2]);

  // 返回能防守最多威胁的位置
  return defenseMoves.map(([row, col]) => [row, col]);
}

/**
 * 检查位置是否在棋盘内
 */
function isValidPosition(row: number, col: number): boolean {
  return row >= 0 && row < 15 && col >= 0 && col < 15;
}

/**
 * 获取某个方向上的连续棋子信息
 */
function getLineInfo(
  board: Board,
  row: number,
  col: number,
  direction: number[],
  player: CellState
): { count: number; leftBlocked: boolean; rightBlocked: boolean } {
  const [dx, dy] = direction;
  let count = 1; // 包含当前位置
  let leftBlocked = false;
  let rightBlocked = false;

  // 正方向搜索
  let i = 1;
  while (isValidPosition(row + dx * i, col + dy * i)) {
    if (board[row + dx * i][col + dy * i] === player) {
      count++;
      i++;
    } else {
      rightBlocked = board[row + dx * i][col + dy * i] !== 0;
      break;
    }
  }
  if (!isValidPosition(row + dx * i, col + dy * i)) {
    rightBlocked = true;
  }

  // 负方向搜索
  i = 1;
  while (isValidPosition(row - dx * i, col - dy * i)) {
    if (board[row - dx * i][col - dy * i] === player) {
      count++;
      i++;
    } else {
      leftBlocked = board[row - dx * i][col - dy * i] !== 0;
      break;
    }
  }
  if (!isValidPosition(row - dx * i, col - dy * i)) {
    leftBlocked = true;
  }

  return { count, leftBlocked, rightBlocked };
}
