import { CellState, Board } from "../../store/gameStore";

// 棋型评分表
const PATTERNS = {
  // 连五
  FIVE: 100000,
  // 活四
  LIVE_FOUR: 10000,
  // 冲四
  RUSH_FOUR: 1000,
  // 活三
  LIVE_THREE: 1000,
  // 冲三
  RUSH_THREE: 100,
  // 活二
  LIVE_TWO: 100,
  // 冲二
  RUSH_TWO: 10,
  // 活一
  LIVE_ONE: 10,
};

// 方向向量：横、竖、正斜、反斜
const DIRECTIONS = [
  [0, 1], // 水平
  [1, 0], // 垂直
  [1, 1], // 正斜
  [1, -1], // 反斜
];

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

/**
 * 根据连子数量和阻挡情况评估棋型分数
 */
function getPatternScore(
  count: number,
  leftBlocked: boolean,
  rightBlocked: boolean
): number {
  if (count >= 5) return PATTERNS.FIVE;

  const blocked = leftBlocked && rightBlocked;
  const halfBlocked = leftBlocked || rightBlocked;

  switch (count) {
    case 4:
      return blocked
        ? 0
        : halfBlocked
          ? PATTERNS.RUSH_FOUR
          : PATTERNS.LIVE_FOUR;
    case 3:
      return blocked
        ? 0
        : halfBlocked
          ? PATTERNS.RUSH_THREE
          : PATTERNS.LIVE_THREE;
    case 2:
      return blocked ? 0 : halfBlocked ? PATTERNS.RUSH_TWO : PATTERNS.LIVE_TWO;
    case 1:
      return blocked ? 0 : PATTERNS.LIVE_ONE;
    default:
      return 0;
  }
}

/**
 * 评估单个位置的分数
 */
function evaluatePosition(
  board: Board,
  row: number,
  col: number,
  player: CellState
): number {
  if (board[row][col] !== 0) return 0;

  // 临时放置棋子
  const tempBoard = board.map((r) => [...r]);
  tempBoard[row][col] = player;

  let score = 0;

  // 检查四个方向
  for (const direction of DIRECTIONS) {
    const lineInfo = getLineInfo(tempBoard, row, col, direction, player);
    score += getPatternScore(
      lineInfo.count,
      lineInfo.leftBlocked,
      lineInfo.rightBlocked
    );
  }

  return score;
}

/**
 * 评估整个棋盘的分数
 */
export function evaluateBoard(board: Board, player: CellState): number {
  let score = 0;
  const opponent = player === 1 ? 2 : 1;

  // 评估每个位置
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      if (board[row][col] === 0) {
        // 我方得分
        const myScore = evaluatePosition(board, row, col, player);
        score += myScore;

        // 对手得分（负分），提高防御系数使AI更重视防守
        const opponentScore = evaluatePosition(board, row, col, opponent);

        // 根据对手棋型的威胁程度增加防御系数
        // 如果对手在此位置能形成活三或更高的威胁，大幅提高防御权重
        if (opponentScore >= PATTERNS.LIVE_THREE) {
          score -= opponentScore * 1.5; // 提高活三或更高威胁的防御系数
        } else {
          score -= opponentScore * 1.2; // 普通威胁的防御系数
        }
      }
    }
  }

  return score;
}

/**
 * 获取可能的落子位置（启发式搜索）
 */
export function getPossibleMoves(
  board: Board,
  maxMoves: number = 15
): Array<[number, number]> {
  const moves: Array<[number, number, number]> = []; // [row, col, priority]
  const hasStone = new Set<string>();

  // 找出所有已有棋子的位置
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      if (board[row][col] !== 0) {
        hasStone.add(`${row},${col}`);
      }
    }
  }

  // 如果是空棋盘，返回中心位置
  if (hasStone.size === 0) {
    return [[7, 7]];
  }

  // 找出所有棋子周围的空位置，并根据距离给出优先级
  const candidates = new Map<string, number>();

  for (const posStr of hasStone) {
    const [row, col] = posStr.split(",").map(Number);

    // 检查周围位置，距离越近优先级越高
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        if (dr === 0 && dc === 0) continue;

        const newRow = row + dr;
        const newCol = col + dc;

        if (
          isValidPosition(newRow, newCol) &&
          board[newRow][newCol] === 0 &&
          !hasStone.has(`${newRow},${newCol}`)
        ) {
          const posKey = `${newRow},${newCol}`;
          const distance = Math.abs(dr) + Math.abs(dc);
          const priority = 5 - distance; // 距离越近优先级越高

          candidates.set(
            posKey,
            Math.max(candidates.get(posKey) || 0, priority)
          );
        }
      }
    }
  }

  // 将候选位置按优先级排序
  for (const [posStr, priority] of candidates) {
    const [row, col] = posStr.split(",").map(Number);
    moves.push([row, col, priority]);
  }

  // 按优先级排序并返回前N个
  moves.sort((a, b) => b[2] - a[2]);
  return moves.slice(0, maxMoves).map(([row, col]) => [row, col]);
}

/**
 * 检查是否是必胜/必败的位置
 */
export function isWinningMove(
  board: Board,
  row: number,
  col: number,
  player: CellState
): boolean {
  const tempBoard = board.map((r) => [...r]);
  tempBoard[row][col] = player;

  // 检查四个方向是否有五子连珠
  for (const direction of DIRECTIONS) {
    const lineInfo = getLineInfo(tempBoard, row, col, direction, player);
    if (lineInfo.count >= 5) {
      return true;
    }
  }

  return false;
}
