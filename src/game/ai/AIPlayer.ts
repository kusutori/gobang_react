import { Board, CellState, LLMConfig } from "../../store/gameStore";
import { getAIMoveAsync, AIMove } from "./minimax";

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
      throw new Error("AI is already thinking");
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
        await new Promise((resolve) => setTimeout(resolve, remainingTime));
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

  /**
   * 将棋盘转换为易于理解的字符串表示
   */
  private boardToString(board: Board): string {
    return board
      .map((row) =>
        row
          .map((cell) => {
            if (cell === 0) return "□"; // 空格
            if (cell === 1) return "●"; // 黑棋
            if (cell === 2) return "○"; // 白棋
            return "?";
          })
          .join("")
      )
      .join("\n");
  }

  /**
   * 通过大语言模型获取落子位置
   */
  async makeLLMMove(board: Board, llmConfig: LLMConfig): Promise<AIMove> {
    if (this.isThinking) {
      throw new Error("AI is already thinking");
    }

    this.isThinking = true;
    const startTime = Date.now();

    try {
      // 格式化棋盘状态
      const boardStr = this.boardToString(board);
      const playerSymbol = this.config.player === 1 ? "●" : "○";
      const opponentSymbol = this.config.player === 1 ? "○" : "●";

      // 构建请求体
      const requestBody = {
        model: llmConfig.modelName,
        messages: [
          {
            role: "system",
            content: `你是一个五子棋AI。
棋盘是15x15的，从左上角开始是坐标(0,0)，向右是x轴增加，向下是y轴增加。
黑棋用●表示，白棋用○表示，空位用□表示。
你需要分析当前棋局并选择一个最佳落子位置。
你只需要返回坐标，格式为：[行,列]
例如：[7,7]表示中心位置`,
          },
          {
            role: "user",
            content: `当前棋盘状态：
${boardStr}

我是${playerSymbol}，请思考并给出你的下一步落子位置，只需返回坐标，格式为[行,列]。`,
          },
        ],
        temperature: llmConfig.temperature || 0.7,
        max_tokens: llmConfig.maxTokens || 100,
      };

      let response;

      // 使用代理服务器或直接请求
      if (llmConfig.useProxy && llmConfig.proxyUrl) {
        // 通过代理服务器发送请求
        const params = new URLSearchParams({
          apiKey: llmConfig.apiKey,
          baseUrl: llmConfig.baseUrl
        });

        response = await fetch(`${llmConfig.proxyUrl}?${params.toString()}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        });
      } else {
        // 直接发送请求到LLM API
        response = await fetch(llmConfig.baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${llmConfig.apiKey}`
          },
          body: JSON.stringify(requestBody)
        });
      }

      if (!response.ok) {
        let errorText;
        try {
          const errorData = await response.json();
          errorText = errorData.error || JSON.stringify(errorData);
        } catch (e) {
          errorText = await response.text();
        }

        // 根据状态码提供更具体的错误信息
        let additionalInfo = "";
        if (response.status === 404) {
          additionalInfo = llmConfig.useProxy
            ? "代理服务器未找到，请确保代理服务器已启动 (bun run proxy) 且代理URL配置正确。"
            : "API端点不存在，请检查baseUrl配置。";
        } else if (response.status === 401) {
          additionalInfo = "API密钥验证失败，请检查apiKey是否正确。";
        } else if (response.status === 0) {
          additionalInfo = "网络请求失败，可能是浏览器阻止了跨域请求，建议启用代理选项。";
        }

        throw new Error(`LLM API请求失败: ${response.status} ${response.statusText}. ${additionalInfo} ${errorText}`);
      }

      const data = await response.json();

      // 解析响应内容，支持多种LLM的响应格式
      let content = "";

      // 处理 OpenAI 格式
      if (data.choices?.[0]?.message?.content) {
        content = data.choices[0].message.content;
      }
      // 处理 DeepSeek 格式 (可能会有细微差别)
      else if (data.choices?.[0]?.content) {
        content = data.choices[0].content;
      }
      // 处理通用JSON格式
      else if (data.response || data.result || data.output) {
        content = data.response || data.result || data.output;
      } else {
        console.log("未识别的API响应格式:", JSON.stringify(data).substring(0, 500));
      }

      if (!content) {
        console.warn("无法从API响应中提取内容:", JSON.stringify(data).substring(0, 500));
      }

      console.log("LLM响应内容:", content);

      // 解析坐标 [行,列] 格式
      const match = content.match(/\[(\d+),\s*(\d+)\]/);

      if (!match) {
        console.warn("无法从LLM响应中解析坐标:", content);
        // 失败时回退到minimax算法
        return await getAIMoveAsync(
          board,
          this.config.player,
          this.config.difficulty
        );
      }

      const row = parseInt(match[1], 10);
      const col = parseInt(match[2], 10);

      // 验证坐标有效性
      if (
        row < 0 ||
        row >= 15 ||
        col < 0 ||
        col >= 15 ||
        board[row][col] !== 0
      ) {
        console.warn("LLM返回的坐标无效:", row, col);
        // 失败时回退到minimax算法
        return await getAIMoveAsync(
          board,
          this.config.player,
          this.config.difficulty
        );
      }

      // 确保至少有最小思考时间
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, this.config.thinkingTime - elapsedTime);

      if (remainingTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingTime));
      }

      return { row, col, score: 0 };
    } catch (error) {
      console.error("LLM API请求出错:", error);
      // 出错时回退到minimax算法
      return await getAIMoveAsync(
        board,
        this.config.player,
        this.config.difficulty
      );
    } finally {
      this.isThinking = false;
    }
  }
}

/**
 * 创建不同难度的 AI 配置
 */
export function createAIConfig(
  difficulty: "easy" | "medium" | "hard",
  player: CellState
): AIConfig {
  const configs = {
    easy: {
      difficulty: 1, // 搜索深度低，较少考虑防御
      thinkingTime: 300,
      player,
    },
    medium: {
      difficulty: 2, // 中等搜索深度和防御能力
      thinkingTime: 800,
      player,
    },
    hard: {
      difficulty: 3, // 更高搜索深度，更强防御能力
      thinkingTime: 1200,
      player,
    },
  };

  return configs[difficulty];
}
