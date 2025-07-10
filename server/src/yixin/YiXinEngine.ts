import { spawn, ChildProcess } from "child_process";
import path from "path";

export interface YiXinMove {
  row: number;
  col: number;
  success: boolean;
  error?: string;
}

export class YiXinEngine {
  private process: ChildProcess | null = null;
  private isReady = false;
  private pendingResponses: Array<{
    resolve: (value: string) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(private exePath: string) {}

  /**
   * 启动YiXin引擎
   */
  async start(): Promise<void> {
    if (this.process) {
      throw new Error("YiXin engine is already running");
    }

    return new Promise((resolve, reject) => {
      // 启动YiXin进程
      this.process = spawn(this.exePath, [], {
        stdio: ["pipe", "pipe", "pipe"],
        cwd: path.dirname(this.exePath),
      });

      if (!this.process.stdin || !this.process.stdout) {
        reject(new Error("Failed to create YiXin process streams"));
        return;
      }

      // 处理输出
      this.process.stdout.on("data", (data: Buffer) => {
        const output = data.toString().trim();
        console.log("YiXin output:", output);

        // 处理待处理的响应
        // YiXin可能返回多行，我们需要等待OK或ERROR
        if (this.pendingResponses.length > 0) {
          const lines = output
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line);

          // 查找OK或ERROR响应，或者坐标格式 "x,y"
          const hasOK = lines.some((line) => line === "OK");
          const hasError = lines.some((line) => line.startsWith("ERROR"));
          const hasCoordinate = lines.some((line) => /^\d+,\d+$/.test(line));

          if (hasOK || hasError || hasCoordinate) {
            const { resolve: responseResolve } = this.pendingResponses.shift()!;
            responseResolve(output);
          }
        }
      });

      // 处理错误
      this.process.stderr?.on("data", (data: Buffer) => {
        console.error("YiXin error:", data.toString());
      });

      // 处理进程退出
      this.process.on("exit", (code) => {
        console.log("YiXin process exited with code:", code);
        this.cleanup();
      });

      // 处理进程错误
      this.process.on("error", (error) => {
        console.error("YiXin process error:", error);
        reject(new Error(`Failed to start YiXin process: ${error.message}`));
      });

      // 初始化YiXin
      this.initializeEngine()
        .then(() => {
          this.isReady = true;
          console.log("✅ YiXin engine initialized successfully");
          resolve();
        })
        .catch((error) => {
          console.error("❌ YiXin engine initialization failed:", error);
          reject(error);
        });
    });
  }

  /**
   * 初始化引擎设置
   */
  private async initializeEngine(): Promise<void> {
    // 简化初始化，只发送START命令
    await this.sendCommand("START 15");
    // 移除可能不被支持的INFO命令，减少初始化复杂度
    console.log("YiXin engine initialized with START 15");
  }

  /**
   * 发送命令到YiXin
   */
  private async sendCommand(command: string): Promise<string> {
    if (!this.process || !this.process.stdin) {
      throw new Error("YiXin process is not running");
    }

    return new Promise((resolve, reject) => {
      this.pendingResponses.push({ resolve, reject });

      console.log("Sending to YiXin:", command);
      this.process!.stdin!.write(command + "\n");

      // 设置超时
      setTimeout(() => {
        const index = this.pendingResponses.findIndex(
          (r) => r.resolve === resolve
        );
        if (index !== -1) {
          this.pendingResponses.splice(index, 1);
          reject(new Error(`Command timeout: ${command}`));
        }
      }, 5000); // 减少超时时间到5秒
    });
  }

  /**
   * 更新棋盘并获取AI下一步
   */
  async getMove(moves: Array<[number, number]>): Promise<YiXinMove> {
    if (!this.isReady) {
      throw new Error("YiXin engine is not ready");
    }

    try {
      // 开始游戏
      await this.sendCommand("START 15");

      // 发送棋盘状态（BOARD命令可能没有响应，所以我们直接处理）
      this.process!.stdin!.write("BOARD\n");
      await new Promise((resolve) => setTimeout(resolve, 500)); // 等待500ms

      // 发送所有已下的棋子
      for (let i = 0; i < moves.length; i++) {
        const [row, col] = moves[i];
        const player = (i % 2) + 1; // 1 for first player, 2 for second
        const command = `${col + 1},${row + 1},${player}`;
        console.log(`Sending piece ${i + 1}: ${command}`);
        this.process!.stdin!.write(command + "\n");
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // 结束棋盘输入，触发AI计算
      const response = await this.sendCommand("DONE");
      console.log(`YiXin DONE response: "${response}"`);

      // 在响应中查找坐标 "x,y"
      const lines = response.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        const match = trimmed.match(/^(\d+),(\d+)$/);
        if (match) {
          const col = parseInt(match[1], 10) - 1; // 转换为0基索引
          const row = parseInt(match[2], 10) - 1; // 转换为0基索引

          if (row >= 0 && row < 15 && col >= 0 && col < 15) {
            console.log(`YiXin suggests: "${trimmed}" -> [${row}, ${col}]`);
            return { row, col, success: true };
          }
        }
      }

      // 如果DONE没有返回坐标，可能需要额外的请求
      // 对于有棋子的情况，尝试发送TURN或其他命令
      if (moves.length > 0) {
        try {
          // 尝试发送TURN命令让AI下棋
          const turnResponse = await this.sendCommand("TURN");
          console.log(`YiXin TURN response: "${turnResponse}"`);

          const turnLines = turnResponse.split("\n");
          for (const line of turnLines) {
            const trimmed = line.trim();
            const match = trimmed.match(/^(\d+),(\d+)$/);
            if (match) {
              const col = parseInt(match[1], 10) - 1;
              const row = parseInt(match[2], 10) - 1;

              if (row >= 0 && row < 15 && col >= 0 && col < 15) {
                console.log(
                  `YiXin TURN move: "${trimmed}" -> [${row}, ${col}]`
                );
                return { row, col, success: true };
              }
            }
          }
        } catch (turnError) {
          console.log("TURN command failed, trying alternative approach");
        }
      }

      throw new Error(
        `No valid coordinates found in YiXin response: "${response}"`
      );
    } catch (error) {
      console.error("Error getting move from YiXin:", error);

      // 使用备用AI逻辑
      return this.getFallbackMove(moves);
    }
  }

  /**
   * 备用AI逻辑：简单但智能的五子棋策略
   */
  private getFallbackMove(moves: Array<[number, number]>): YiXinMove {
    console.log("Using fallback AI logic with smart strategy");

    const board = Array(15)
      .fill(null)
      .map(() => Array(15).fill(0));

    // 标记已占用的位置
    moves.forEach(([row, col], index) => {
      board[row][col] = (index % 2) + 1;
    });

    // 如果是第一步，选择中心位置
    if (moves.length === 0) {
      return { row: 7, col: 7, success: true };
    }

    // AI是第二个玩家（白棋），玩家数量为偶数时轮到AI
    const isAITurn = moves.length % 2 === 1;
    const aiPlayer = 2; // AI是白棋
    const humanPlayer = 1; // 人类是黑棋

    // 检查是否可以获胜（AI的连四）
    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 15; col++) {
        if (board[row][col] === 0) {
          board[row][col] = aiPlayer;
          if (this.checkWinCondition(board, row, col, aiPlayer)) {
            console.log(`AI can win at [${row}, ${col}]`);
            return { row, col, success: true };
          }
          board[row][col] = 0; // 恢复
        }
      }
    }

    // 检查是否需要阻挡人类获胜（人类的连四）
    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 15; col++) {
        if (board[row][col] === 0) {
          board[row][col] = humanPlayer;
          if (this.checkWinCondition(board, row, col, humanPlayer)) {
            console.log(`Must block human win at [${row}, ${col}]`);
            board[row][col] = 0; // 恢复
            return { row, col, success: true };
          }
          board[row][col] = 0; // 恢复
        }
      }
    }

    // 寻找最佳位置：在已有棋子附近，优先考虑能形成连子的位置
    const lastMove = moves[moves.length - 1];
    const [lastRow, lastCol] = lastMove;

    // 评估每个可能的位置
    let bestScore = -1;
    let bestMove: [number, number] = [7, 7];

    for (
      let row = Math.max(0, lastRow - 2);
      row <= Math.min(14, lastRow + 2);
      row++
    ) {
      for (
        let col = Math.max(0, lastCol - 2);
        col <= Math.min(14, lastCol + 2);
        col++
      ) {
        if (board[row][col] === 0) {
          const score = this.evaluatePosition(board, row, col, aiPlayer);
          if (score > bestScore) {
            bestScore = score;
            bestMove = [row, col];
          }
        }
      }
    }

    console.log(
      `Best move found: [${bestMove[0]}, ${bestMove[1]}] with score ${bestScore}`
    );
    return { row: bestMove[0], col: bestMove[1], success: true };
  }

  /**
   * 检查获胜条件
   */
  private checkWinCondition(
    board: number[][],
    row: number,
    col: number,
    player: number
  ): boolean {
    const directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1], // 水平、垂直、正斜、反斜
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
  }

  /**
   * 评估位置得分
   */
  private evaluatePosition(
    board: number[][],
    row: number,
    col: number,
    player: number
  ): number {
    let score = 0;
    const directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];

    for (const [dx, dy] of directions) {
      // 计算这个方向上的连子数和空位数
      let consecutiveCount = 0;
      let openEnds = 0;

      // 检查正方向
      for (let i = 1; i < 5; i++) {
        const newRow = row + dx * i;
        const newCol = col + dy * i;
        if (newRow >= 0 && newRow < 15 && newCol >= 0 && newCol < 15) {
          if (board[newRow][newCol] === player) {
            consecutiveCount++;
          } else if (board[newRow][newCol] === 0) {
            openEnds++;
            break;
          } else {
            break; // 对手棋子，阻断
          }
        }
      }

      // 检查反方向
      for (let i = 1; i < 5; i++) {
        const newRow = row - dx * i;
        const newCol = col - dy * i;
        if (newRow >= 0 && newRow < 15 && newCol >= 0 && newCol < 15) {
          if (board[newRow][newCol] === player) {
            consecutiveCount++;
          } else if (board[newRow][newCol] === 0) {
            openEnds++;
            break;
          } else {
            break; // 对手棋子，阻断
          }
        }
      }

      // 根据连子数和开放端计算得分
      if (consecutiveCount >= 3) {
        score += consecutiveCount * 10 + openEnds * 5;
      } else if (consecutiveCount >= 2) {
        score += consecutiveCount * 3 + openEnds * 2;
      } else {
        score += consecutiveCount + openEnds;
      }
    }

    return score;
  }

  /**
   * 重新开始游戏
   */
  async restart(): Promise<void> {
    if (!this.isReady) {
      throw new Error("YiXin engine is not ready");
    }

    await this.sendCommand("RESTART 15");
    console.log("YiXin game restarted");
  }

  /**
   * 停止引擎
   */
  stop(): void {
    this.cleanup();
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.isReady = false;

    // 拒绝所有待处理的响应
    this.pendingResponses.forEach(({ reject }) => {
      reject(new Error("YiXin process was terminated"));
    });
    this.pendingResponses = [];
  }

  /**
   * 检查引擎是否就绪
   */
  isEngineReady(): boolean {
    return this.isReady;
  }
}
