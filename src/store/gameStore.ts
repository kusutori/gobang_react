import { create } from "zustand";
import { AIPlayer, createAIConfig } from "../game/ai/AIPlayer";

// 棋盘状态：0-空, 1-黑棋, 2-白棋
export type CellState = 0 | 1 | 2;
export type Board = CellState[][];

// 游戏模式
export type GameMode = "human" | "ai" | "llm";

// LLM配置
export interface LLMConfig {
  baseUrl: string;
  modelName: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
  useProxy?: boolean;
  proxyUrl?: string;
}

// 游戏状态
export interface GameState {
  board: Board;
  currentPlayer: 1 | 2; // 1-黑棋, 2-白棋
  winner: 0 | 1 | 2; // 0-无胜者, 1-黑棋胜, 2-白棋胜
  gameOver: boolean;
  gameMode: GameMode;
  aiPlayer: AIPlayer | null;
  isAIThinking: boolean;
  llmConfig: LLMConfig | null;

  // 操作方法
  makeMove: (row: number, col: number) => boolean;
  resetGame: () => void;
  setGameMode: (mode: GameMode) => void;
  setLLMConfig: (config: LLMConfig) => void;
  checkWin: (board: Board, row: number, col: number) => boolean;
}

// 创建空棋盘
const createEmptyBoard = (): Board => {
  return Array(15)
    .fill(null)
    .map(() => Array(15).fill(0));
};

// 检查胜利条件
const checkWin = (board: Board, row: number, col: number): boolean => {
  const player = board[row][col];
  if (player === 0) return false;

  // 四个方向：水平、垂直、正斜、反斜
  const directions = [
    [0, 1], // 水平
    [1, 0], // 垂直
    [1, 1], // 正斜
    [1, -1], // 反斜
  ];

  for (const [dx, dy] of directions) {
    let count = 1; // 包含当前位置

    // 正方向计数
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

    // 反方向计数
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

    if (count >= 5) {
      return true;
    }
  }

  return false;
};

export const useGameStore = create<GameState>((set, get) => ({
  board: createEmptyBoard(),
  currentPlayer: 1,
  winner: 0,
  gameOver: false,
  gameMode: "human",
  aiPlayer: null,
  isAIThinking: false,
  llmConfig: null,

  makeMove: (row: number, col: number) => {
    const { board, currentPlayer, gameOver, gameMode, aiPlayer, llmConfig } = get();

    if (gameOver || board[row][col] !== 0) {
      return false;
    }

    const newBoard = board.map((row) => [...row]);
    newBoard[row][col] = currentPlayer;

    const hasWon = checkWin(newBoard, row, col);

    set({
      board: newBoard,
      currentPlayer: currentPlayer === 1 ? 2 : 1,
      winner: hasWon ? currentPlayer : 0,
      gameOver: hasWon,
    });

    // 如果是 AI 模式且轮到 AI，让 AI 下棋
    if (
      (gameMode === "ai" || gameMode === "llm") &&
      !hasWon &&
      aiPlayer &&
      (currentPlayer === 1 ? 2 : 1) === aiPlayer.getConfig().player
    ) {
      set({ isAIThinking: true });

      // 不同模式的 AI 行为
      const aiMovePromise = gameMode === "llm" && llmConfig
        ? aiPlayer.makeLLMMove(newBoard, llmConfig)
        : aiPlayer.makeMove(newBoard);

      aiMovePromise
        .then((aiMove) => {
          const { board: currentBoard, gameOver: isGameOver } = get();

          if (!isGameOver && currentBoard[aiMove.row][aiMove.col] === 0) {
            const aiBoard = currentBoard.map((row) => [...row]);
            aiBoard[aiMove.row][aiMove.col] = aiPlayer.getConfig().player;

            const aiWon = checkWin(aiBoard, aiMove.row, aiMove.col);

            set({
              board: aiBoard,
              currentPlayer: aiPlayer.getConfig().player === 1 ? 2 : 1,
              winner: aiWon ? aiPlayer.getConfig().player : 0,
              gameOver: aiWon,
              isAIThinking: false,
            });
          } else {
            set({ isAIThinking: false });
          }
        })
        .catch((error: Error) => {
          console.error("AI move error:", error);
          set({ isAIThinking: false });

          // 显示错误通知
          if (gameMode === "llm") {
            alert(`大模型API请求失败: ${error.message}\n请检查网络连接和API配置`);
          }
        });
    }

    return true;
  },

  resetGame: () => {
    set({
      board: createEmptyBoard(),
      currentPlayer: 1,
      winner: 0,
      gameOver: false,
      isAIThinking: false,
    });
  },

  setGameMode: (mode: GameMode) => {
    let newAIPlayer: AIPlayer | null = null;

    if (mode === "ai" || mode === "llm") {
      newAIPlayer = new AIPlayer(createAIConfig("medium", 2)); // 默认中等难度
    }

    set({
      gameMode: mode,
      aiPlayer: newAIPlayer,
      board: createEmptyBoard(),
      currentPlayer: 1,
      winner: 0,
      gameOver: false,
      isAIThinking: false,
    });
  },

  setLLMConfig: (config: LLMConfig) => {
    set({ llmConfig: config });
  },

  checkWin,
}));
