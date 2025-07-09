import { Board, CellState } from '../../store/gameStore';
import { getAIMoveAsync, AIMove } from './minimax';

export interface AIConfig {
  difficulty: number; // 1-5, 影响搜索深度
  thinkingTime: number; // 思考时间（毫秒）
  player: CellState; // AI 的棋子颜色
}

export class AIPlayer {
  private config: AIConfig;
  private isThinking: boolean = false;

  constructor(config: AIConfig) {
    this.config = config;
  }

  /**
   * 获取 AI 的落子位置
   */
  async makeMove(board: Board): Promise<AIMove> {
    if (this.isThinking) {
      throw new Error('AI is already thinking');
    }

    this.isThinking = true;
    
    try {
      // 添加思考时间
      const startTime = Date.now();
      
      const move = await getAIMoveAsync(
        board,
        this.config.player,
        this.config.difficulty
      );
      
      // 确保至少有最小思考时间
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, this.config.thinkingTime - elapsedTime);
      
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      return move;
    } finally {
      this.isThinking = false;
    }
  }

  /**
   * 更新 AI 配置
   */
  updateConfig(config: Partial<AIConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): AIConfig {
    return { ...this.config };
  }

  /**
   * 检查 AI 是否正在思考
   */
  isAIThinking(): boolean {
    return this.isThinking;
  }
}

/**
 * 创建不同难度的 AI 配置
 */
export function createAIConfig(difficulty: 'easy' | 'medium' | 'hard', player: CellState): AIConfig {
  const configs = {
    easy: {
      difficulty: 1,
      thinkingTime: 300,
      player
    },
    medium: {
      difficulty: 2,
      thinkingTime: 800,
      player
    },
    hard: {
      difficulty: 3,
      thinkingTime: 1200,
      player
    }
  };

  return configs[difficulty];
}
