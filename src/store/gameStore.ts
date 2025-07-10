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
  aiFirst: boolean; // 新增：AI是否先手

  // 操作方法
  makeMove: (row: number, col: number) => boolean;
  resetGame: () => void;
  setGameMode: (mode: GameMode) => void;
  setLLMConfig: (config: LLMConfig) => void;
  setAdvancedAIConfig: (config: AdvancedAIConfig) => void;
  checkWin: (board: Board, row: number, col: number) => boolean;
  undoMove: () => boolean; // 新增：悔棋功能
  setAIFirst: (aiFirst: boolean) => void; // 新增：设置AI先手
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
  aiFirst: false, // 初始化：默认玩家先手

  makeMove: (row: number, col: number) => {
    const {
      board,
      currentPlayer,
      gameOver,
      gameMode,
      aiPlayer: aiPlayerInstance,
      llmConfig,
      moveHistory,
      aiFirst,
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
    const aiPlayerNumber = aiFirst ? 1 : 2; // AI先手时AI是黑棋(1)，否则是白棋(2)
    const nextPlayer = currentPlayer === 1 ? 2 : 1;

    if (
      (gameMode === "ai" ||
        gameMode === "llm" ||
        gameMode === "yixin" ||
        gameMode === "advanced") &&
      !hasWon &&
      nextPlayer === aiPlayerNumber
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
      } else if (gameMode === "llm" && llmConfig && aiPlayerInstance) {
        // LLM模式
        aiMovePromise = aiPlayerInstance.makeLLMMove(newBoard, llmConfig);
      } else if (aiPlayerInstance) {
        // 传统AI模式
        aiMovePromise = aiPlayerInstance.makeMove(newBoard);
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
            aiFirst,
          } = get();

          if (!isGameOver && currentBoard[aiMove.row][aiMove.col] === 0) {
            const aiBoard = currentBoard.map((row) => [...row]);
            const currentAIPlayer = aiFirst ? 1 : 2; // AI先手时是黑棋(1)，否则是白棋(2)
            aiBoard[aiMove.row][aiMove.col] = currentAIPlayer;

            const aiWon = checkWin(aiBoard, aiMove.row, aiMove.col);
            const updatedHistory = [
              ...currentHistory,
              [aiMove.row, aiMove.col] as [number, number],
            ];

            set({
              board: aiBoard,
              currentPlayer: aiFirst ? 2 : 1, // 下一回合轮到对方玩家
              winner: aiWon ? currentAIPlayer : 0,
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

  undoMove: () => {
    const { moveHistory, gameMode, isAIThinking, gameOver } = get();

    // 如果AI正在思考或游戏已结束，不允许悔棋
    if (isAIThinking) {
      return false;
    }

    // 计算需要撤销的步数
    let stepsToUndo = 1;
    if (gameMode === 'ai' || gameMode === 'llm' || gameMode === 'yixin' || gameMode === 'advanced') {
      // 在AI模式下，需要撤销玩家和AI的两步棋
      stepsToUndo = Math.min(2, moveHistory.length);
    }

    // 检查是否有足够的历史记录可以撤销
    if (moveHistory.length < stepsToUndo) {
      return false;
    }

    // 创建新的棋盘和历史记录
    const newBoard = createEmptyBoard();
    const newMoveHistory = moveHistory.slice(0, -stepsToUndo);

    // 重新应用剩余的落子历史
    for (let i = 0; i < newMoveHistory.length; i++) {
      const [row, col] = newMoveHistory[i];
      const player = (i % 2) + 1; // 黑棋(1)和白棋(2)交替
      newBoard[row][col] = player as CellState;
    }

    // 确定当前应该轮到哪个玩家
    const newCurrentPlayer = (newMoveHistory.length % 2 + 1) as 1 | 2;

    set({
      board: newBoard,
      currentPlayer: newCurrentPlayer,
      winner: 0,
      gameOver: false,
      moveHistory: newMoveHistory,
    });

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
      aiFirst: false, // 重置AI先手设置，默认玩家先手
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

  setAIFirst: (aiFirst: boolean) => {
    set({ aiFirst });

    // 如果是AI模式，重新开始游戏以应用新的先手设置
    const { gameMode } = get();
    if (gameMode === 'ai' || gameMode === 'llm' || gameMode === 'yixin' || gameMode === 'advanced') {
      set({
        board: createEmptyBoard(),
        currentPlayer: 1, // 总是从黑棋开始
        winner: 0,
        gameOver: false,
        isAIThinking: false,
        moveHistory: [],
      });

      // 如果AI先手，立即让AI下第一步（黑棋）
      if (aiFirst) {
        setTimeout(() => {
          const state = get();
          set({ isAIThinking: true });

          // 模拟AI在天元落第一子
          const newBoard = state.board.map(row => [...row]);
          newBoard[7][7] = 1; // AI下黑棋在天元

          set({
            board: newBoard,
            currentPlayer: 2, // 下一回合轮到玩家（白棋）
            moveHistory: [[7, 7]],
            isAIThinking: false,
          });
        }, 100);
      }
    }
  },

  checkWin,
}));
