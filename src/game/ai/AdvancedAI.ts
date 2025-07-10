import AdvancedMinmax from "./advanced/minimax";

export interface AdvancedAIConfig {
  difficulty: "easy" | "medium" | "hard" | "expert";
  depth: number;
  timeout: number; // milliseconds
}

export interface AdvancedAIResult {
  row: number;
  col: number;
  confidence: number;
  searchDepth: number;
  nodesSearched: number;
  timeUsed: number;
}

export class AdvancedAI {
  private minimax: AdvancedMinmax;
  private config: AdvancedAIConfig;
  private isThinking: boolean = false;

  constructor(config: Partial<AdvancedAIConfig> = {}) {
    this.minimax = new AdvancedMinmax();
    this.config = {
      difficulty: config.difficulty || "medium",
      depth:
        config.depth ||
        this.getDepthForDifficulty(config.difficulty || "medium"),
      timeout: config.timeout || 5000,
    };
  }

  private getDepthForDifficulty(difficulty: string): number {
    switch (difficulty) {
      case "easy":
        return 4;
      case "medium":
        return 6;
      case "hard":
        return 8;
      case "expert":
        return 10;
      default:
        return 6;
    }
  }

  async getMove(
    board: number[][],
    currentPlayer: number
  ): Promise<AdvancedAIResult> {
    if (this.isThinking) {
      throw new Error("AI is already thinking");
    }

    this.isThinking = true;
    const startTime = Date.now();

    try {
      // Convert our board format (1 for black, 2 for white) to minimax format (1 for current player, -1 for opponent)
      const minimaxBoard = this.convertBoardFormat(board, currentPlayer);

      // Use Web Worker for heavy computation to avoid blocking UI
      const result = await this.runInWorker(
        minimaxBoard,
        this.config.depth,
        this.config.timeout
      );

      const timeUsed = Date.now() - startTime;

      // Convert result back to our coordinate system
      return {
        row: result.row,
        col: result.col,
        confidence: this.calculateConfidence(result.score),
        searchDepth: result.depth,
        nodesSearched: result.nodesSearched,
        timeUsed,
      };
    } finally {
      this.isThinking = false;
    }
  }

  private convertBoardFormat(
    board: number[][],
    currentPlayer: number
  ): number[][] {
    const converted: number[][] = [];
    for (let i = 0; i < board.length; i++) {
      converted[i] = [];
      for (let j = 0; j < board[i].length; j++) {
        if (board[i][j] === 0) {
          converted[i][j] = 0;
        } else if (board[i][j] === currentPlayer) {
          converted[i][j] = 1; // Current player
        } else {
          converted[i][j] = -1; // Opponent
        }
      }
    }
    return converted;
  }

  private async runInWorker(
    board: number[][],
    depth: number,
    timeout: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      // For now, run synchronously since setting up Web Workers in Bun might be complex
      // In a real implementation, this would be in a Web Worker
      try {
        console.log("高级AI开始计算，深度:", depth);
        const move = this.minimax.getBestMove(board, 1, depth);
        const stats = this.minimax.getCacheStats();

        if (!move) {
          console.error("高级AI无法找到有效落子");
          reject(new Error("No valid move found"));
          return;
        }

        console.log("高级AI计算完成，落子位置:", move);
        resolve({
          row: move[0],
          col: move[1],
          score: 1000, // Placeholder score
          depth: depth,
          nodesSearched: stats.hits.search,
        });
      } catch (error) {
        console.error("高级AI计算错误:", error);
        reject(error);
      }
    });
  }

  private calculateConfidence(score: number): number {
    // Convert score to confidence percentage
    const maxScore = 100000; // FIVE value
    const normalizedScore = Math.abs(score) / maxScore;
    return Math.min(100, Math.max(0, normalizedScore * 100));
  }

  updateConfig(newConfig: Partial<AdvancedAIConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.difficulty && !newConfig.depth) {
      this.config.depth = this.getDepthForDifficulty(newConfig.difficulty);
    }
  }

  getConfig(): AdvancedAIConfig {
    return { ...this.config };
  }

  isCurrentlyThinking(): boolean {
    return this.isThinking;
  }

  clearCache(): void {
    this.minimax.clearCache();
  }

  getStats(): any {
    return this.minimax.getCacheStats();
  }
}

export default AdvancedAI;
