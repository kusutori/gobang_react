import { create } from "zustand";
import { AIPlayer, createAIConfig } from "../game/ai/AIPlayer";
import { yiXinService } from "../services/YiXinService";
import { AdvancedAI, AdvancedAIConfig } from "../game/ai/AdvancedAI";

// 棋盘状态：0-空, 1-黑棋, 2-白棋
export type CellState = 0 | 1 | 2;
export type Board = CellState[][];

// 游戏模式
export type GameMode = "human" | "ai" | "llm" | "yixin" | "advanced";

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
  advancedAI: AdvancedAI | null;
  advancedAIConfig: AdvancedAIConfig | null;
  moveHistory: Array<[number, number]>; // 新增：记录落子历史

  // 操作方法
  makeMove: (row: number, col: number) => boolean;
  resetGame: () => void;
  setGameMode: (mode: GameMode) => void;
  setLLMConfig: (config: LLMConfig) => void;
  setAdvancedAIConfig: (config: AdvancedAIConfig) => void;
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
  advancedAI: null,
  advancedAIConfig: null,
  moveHistory: [], // 初始化落子历史

  makeMove: (row: number, col: number) => {
    const {
      board,
      currentPlayer,
      gameOver,
      gameMode,
      aiPlayer,
      llmConfig,
      moveHistory,
    } = get();

    if (gameOver || board[row][col] !== 0) {
      return false;
    }

    const newBoard = board.map((row) => [...row]);
    newBoard[row][col] = currentPlayer;

    const hasWon = checkWin(newBoard, row, col);
    const newMoveHistory = [...moveHistory, [row, col] as [number, number]];

    set({
      board: newBoard,
      currentPlayer: currentPlayer === 1 ? 2 : 1,
      winner: hasWon ? currentPlayer : 0,
      gameOver: hasWon,
      moveHistory: newMoveHistory,
    });

    // 如果是 AI/LLM/弈心/高级AI 模式且轮到 AI，让 AI 下棋
    if (
      (gameMode === "ai" ||
        gameMode === "llm" ||
        gameMode === "yixin" ||
        gameMode === "advanced") &&
      !hasWon &&
      (currentPlayer === 1 ? 2 : 1) === 2 // AI总是白棋(2)
    ) {
      set({ isAIThinking: true });

      let aiMovePromise: Promise<{ row: number; col: number; score?: number }>;

      if (gameMode === "yixin") {
        // 弈心模式：使用完整的落子历史
        aiMovePromise = yiXinService.getMove(newMoveHistory);
      } else if (gameMode === "advanced") {
        // 高级AI模式
        const { advancedAI } = get();
        if (advancedAI) {
          aiMovePromise = advancedAI.getMove(newBoard, 2).then((result) => ({
            row: result.row,
            col: result.col,
            score: result.confidence,
          }));
        } else {
          // 如果没有高级AI实例，创建一个
          const newAdvancedAI = new AdvancedAI();
          set({ advancedAI: newAdvancedAI });
          aiMovePromise = newAdvancedAI.getMove(newBoard, 2).then((result) => ({
            row: result.row,
            col: result.col,
            score: result.confidence,
          }));
        }
      } else if (gameMode === "llm" && llmConfig && aiPlayer) {
        // LLM模式
        aiMovePromise = aiPlayer.makeLLMMove(newBoard, llmConfig);
      } else if (aiPlayer) {
        // 传统AI模式
        aiMovePromise = aiPlayer.makeMove(newBoard);
      } else {
        // 没有可用的AI，结束思考状态
        set({ isAIThinking: false });
        return true;
      }

      aiMovePromise
        .then((aiMove) => {
          const {
            board: currentBoard,
            gameOver: isGameOver,
            gameMode: currentMode,
            moveHistory: currentHistory,
          } = get();

          if (!isGameOver && currentBoard[aiMove.row][aiMove.col] === 0) {
            const aiBoard = currentBoard.map((row) => [...row]);
            const aiPlayerNumber = 2; // AI总是白棋
            aiBoard[aiMove.row][aiMove.col] = aiPlayerNumber;

            const aiWon = checkWin(aiBoard, aiMove.row, aiMove.col);
            const updatedHistory = [
              ...currentHistory,
              [aiMove.row, aiMove.col] as [number, number],
            ];

            set({
              board: aiBoard,
              currentPlayer: 1, // 下一回合轮到玩家(黑棋)
              winner: aiWon ? aiPlayerNumber : 0,
              gameOver: aiWon,
              isAIThinking: false,
              moveHistory: updatedHistory,
            });
          } else {
            set({ isAIThinking: false });
          }
        })
        .catch((error: Error) => {
          console.error("AI move error:", error);
          set({ isAIThinking: false });

          // 显示错误通知
          const { gameMode: currentMode } = get();
          if (currentMode === "llm") {
            alert(
              `大模型API请求失败: ${error.message}\n请检查网络连接和API配置`
            );
          } else if (currentMode === "yixin") {
            alert(
              `弈心引擎错误: ${error.message}\n请确保服务器运行在 http://localhost:3001`
            );
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
      moveHistory: [], // 重置落子历史
    });
  },

  setGameMode: (mode: GameMode) => {
    let newAIPlayer: AIPlayer | null = null;

    if (mode === "ai" || mode === "llm") {
      newAIPlayer = new AIPlayer(createAIConfig("medium", 2)); // 默认中等难度，AI是白棋
    }
    // 弈心模式不需要AIPlayer实例，因为它通过API调用

    set({
      gameMode: mode,
      aiPlayer: newAIPlayer,
      board: createEmptyBoard(),
      currentPlayer: 1,
      winner: 0,
      gameOver: false,
      isAIThinking: false,
      moveHistory: [], // 重置落子历史
    });

    // 如果切换到弈心模式，确保引擎已初始化
    if (mode === "yixin") {
      yiXinService.testConnection().then((connectionResult) => {
        if (!connectionResult.success) {
          console.error("弈心引擎连接失败:", connectionResult.message);
          alert(
            `弈心引擎连接失败: ${connectionResult.message}\n请确保服务器运行在 http://localhost:3001`
          );
          return;
        }

        yiXinService.getStatus().then((status) => {
          if (!status.ready) {
            console.log("🎯 弈心引擎未就绪，将在首次对局时自动初始化");
          } else {
            console.log("✅ 弈心引擎已就绪");
          }
        });
      });
    }
  },

  setLLMConfig: (config: LLMConfig) => {
    set({ llmConfig: config });
  },

  setAdvancedAIConfig: (config: AdvancedAIConfig) => {
    set((state) => {
      // Update existing advanced AI or create new one
      if (state.advancedAI) {
        state.advancedAI.updateConfig(config);
      } else {
        const newAdvancedAI = new AdvancedAI(config);
        return {
          advancedAI: newAdvancedAI,
          advancedAIConfig: config,
        };
      }
      return { advancedAIConfig: config };
    });
  },

  checkWin,
}));
