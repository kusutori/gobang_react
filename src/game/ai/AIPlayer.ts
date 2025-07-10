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
            content: `你是一个专业的五子棋AI大师，拥有丰富的对弈经验。

【棋盘规则】
- 棋盘是15x15网格，坐标从(0,0)到(14,14)
- 左上角是(0,0)，向右为列(x轴)增加，向下为行(y轴)增加
- 黑棋用●表示，白棋用○表示，空位用□表示
- 棋子放在网格线交叉点上

【五子棋基本规则】
- 双方轮流落子，黑棋先手
- 在空位落子，已有棋子的位置不能再次落子
- 横、竖、斜任意方向连成5子即获胜
- 超过5子（如六连、七连等）也算获胜
- 禁手规则：本局不考虑禁手，双方都可自由落子

【经典棋型定义】
★ 五连：五子连珠，直接获胜
★ 活四：两端都能成五的四子连珠，如"□●●●●□"，下一手必胜
★ 冲四：一端被堵的四子连珠，如"X●●●●□"，需要对手应对
★ 活三：两端都能成活四的三子连珠，如"□●●●□"，威胁很大
★ 眠三：一端被堵的三子连珠，如"X●●●□"
★ 活二：两端都能发展的二子连珠，如"□●●□"
★ 眠二：一端被堵的二子连珠

【核心战略优先级】
1. 【获胜】：如果能连成5子，立即获胜
2. 【防守必胜】：如果对手下一步能连成5子，必须阻挡
3. 【活四攻击】：形成活四（两端开放的四子），创造必胜
4. 【活四防守】：阻挡对手的活四
5. 【冲四攻击】：形成冲四，增加威胁
6. 【多重威胁】：创建双活三、活三+冲四等多重威胁
7. 【活三发展】：形成活三，为下一步活四做准备
8. 【活三防守】：防止对手形成活三
9. 【二子连接】：连接己方散子，形成潜在威胁
10. 【中心控制】：占据棋盘中心区域，控制局面

【高级战术】
- 先手优势：充分利用先手，积极进攻
- 连续威胁：创造连续的攻击威胁，让对手疲于防守
- 诱敌深入：故意留出破绽，引诱对手走入陷阱
- 两头威胁：同时在两个方向发展，增加对手防守难度
- 弃子战术：必要时放弃部分棋子，换取更大优势

【关键位置】
- 天元：(7,7) 棋盘正中心，控制力强
- 星位：(3,3)、(3,11)、(11,3)、(11,11) 等关键点
- 三三点：角落附近的重要发展点

【输出要求】
1. 仔细分析当前局面
2. 识别所有威胁和机会
3. 按优先级选择最佳策略
4. 确保坐标在范围内(0-14)且位置为空
5. 必须严格按照格式输出：[行,列]

注意：你的回答必须以坐标结束，格式如：[7,8]`,
          },
          {
            role: "user",
            content: `当前棋盘状态：
${boardStr}

【局面分析】
- 我方棋子：${playerSymbol}
- 对方棋子：${opponentSymbol}

【分析步骤】
请严格按照以下优先级顺序分析：

1. 【胜利检查】扫描棋盘，检查我方是否有连成5子的机会
2. 【防守检查】扫描棋盘，检查对方是否有连成5子的威胁，必须阻挡
3. 【活四攻击】寻找能形成活四的位置（如●●●□●的中间位置）
4. 【活四防守】防止对方形成活四
5. 【冲四机会】寻找能形成冲四的位置
6. 【多重威胁】寻找能同时创造多个威胁的位置
7. 【活三发展】寻找能形成活三的位置
8. 【活三阻挡】防止对方形成威胁性活三
9. 【连子发展】连接散落的己方棋子
10. 【占据要点】选择战略要地（中心、星位等）

【输出格式】
请简要说明选择理由，然后在最后一行严格按照以下格式输出坐标：
[行,列]

例如：
分析：形成活四威胁，下一步可获胜
[7,8]`,
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
          baseUrl: llmConfig.baseUrl,
        });

        response = await fetch(`${llmConfig.proxyUrl}?${params.toString()}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });
      } else {
        // 直接发送请求到LLM API
        response = await fetch(llmConfig.baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${llmConfig.apiKey}`,
          },
          body: JSON.stringify(requestBody),
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
          additionalInfo =
            "网络请求失败，可能是浏览器阻止了跨域请求，建议启用代理选项。";
        }

        throw new Error(
          `LLM API请求失败: ${response.status} ${response.statusText}. ${additionalInfo} ${errorText}`
        );
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
        console.log("未识别的API响应格式:", JSON.stringify(data, null, 2));
      }

      if (!content) {
        console.warn("无法从API响应中提取内容:", JSON.stringify(data, null, 2));
      }

      console.log("LLM完整响应内容:", content);

      // 解析坐标，支持多种格式：[行,列]、(行,列)、行,列
      const coordinatePatterns = [
        /\[(\d+),\s*(\d+)\]/, // [行,列]
        /\((\d+),\s*(\d+)\)/, // (行,列)
        /(\d+),\s*(\d+)/, // 行,列
        /行\s*[：:]\s*(\d+).*列\s*[：:]\s*(\d+)/, // 行：X 列：Y
        /坐标\s*[：:]?\s*\[?(\d+),\s*(\d+)\]?/, // 坐标：[X,Y] 或 坐标X,Y
      ];

      let match = null;
      for (const pattern of coordinatePatterns) {
        match = content.match(pattern);
        if (match) {
          console.log(
            `使用模式匹配到坐标: ${pattern.source} -> [${match[1]}, ${match[2]}]`
          );
          break;
        }
      }

      if (!match) {
        console.warn("无法从LLM响应中解析坐标，尝试了多种模式:");
        console.warn("响应内容:", content);
        console.warn("期望格式: [行,列] 或 (行,列) 或 行,列 等");
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
        console.warn(`LLM返回的坐标无效: [${row},${col}]`, {
          reason:
            row < 0 || row >= 15 || col < 0 || col >= 15
              ? "坐标超出棋盘范围(0-14)"
              : "目标位置已有棋子",
          boardState:
            board[row] && board[row][col] !== undefined
              ? board[row][col]
              : "越界",
          fullResponse: content.substring(0, 200) + "...", // 显示更多上下文
        });
        // 失败时回退到minimax算法
        return await getAIMoveAsync(
          board,
          this.config.player,
          this.config.difficulty
        );
      }

      console.log(`✅ LLM选择有效坐标: [${row},${col}]`);

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
