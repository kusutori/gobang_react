/**
 * YiXin Engine HTTP Client
 * 通过HTTP请求与Python YiXin服务通信
 */

export interface MoveResult {
  success: boolean;
  row?: number;
  col?: number;
  order?: string;
  error?: string;
}

export interface StatusResult {
  ready: boolean;
  message: string;
}

export class YiXinEngine {
  private baseUrl: string;
  private ready: boolean = false;

  constructor(baseUrl: string = "http://localhost:5000") {
    this.baseUrl = baseUrl;
  }

  /**
   * 启动引擎（初始化）
   */
  async start(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to initialize YiXin engine");
      }

      this.ready = true;
      console.log("✅ YiXin HTTP engine initialized successfully");
    } catch (error) {
      this.ready = false;
      console.error("❌ Failed to initialize YiXin HTTP engine:", error);
      throw error;
    }
  }

  /**
   * 获取AI下一步落子
   */
  async getMove(moves: Array<[number, number]>): Promise<MoveResult> {
    try {
      if (!this.ready) {
        await this.start();
      }

      const response = await fetch(`${this.baseUrl}/move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ moves }),
      });

      const result = await response.json();

      if (!result.success) {
        return {
          success: false,
          error: result.error || "Failed to get move from YiXin",
        };
      }

      return {
        success: true,
        row: result.row,
        col: result.col,
        order: result.order,
      };
    } catch (error) {
      console.error("❌ Error getting move from YiXin HTTP service:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * 重新开始游戏
   */
  async restart(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/restart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to restart game");
      }

      console.log("✅ YiXin game restarted successfully");
    } catch (error) {
      console.error("❌ Failed to restart YiXin game:", error);
      throw error;
    }
  }

  /**
   * 检查引擎状态
   */
  async getStatus(): Promise<StatusResult> {
    try {
      const response = await fetch(`${this.baseUrl}/status`);
      const result = await response.json();

      this.ready = result.ready;
      return result;
    } catch (error) {
      console.error("❌ Failed to get YiXin status:", error);
      this.ready = false;
      return {
        ready: false,
        message: "Failed to connect to YiXin service",
      };
    }
  }

  /**
   * 检查引擎是否准备就绪
   */
  isEngineReady(): boolean {
    return this.ready;
  }

  /**
   * 停止引擎
   */
  stop(): void {
    this.ready = false;
    console.log("🔴 YiXin HTTP engine stopped");
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/test`);
      const result = await response.json();
      return result.success === true;
    } catch (error) {
      console.error("❌ YiXin HTTP service connection test failed:", error);
      return false;
    }
  }
}
