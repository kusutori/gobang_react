export interface YiXinMove {
  row: number;
  col: number;
  success: boolean;
  error?: string;
}

export interface YiXinStatus {
  ready: boolean;
  message: string;
}

export class YiXinService {
  private static instance: YiXinService;
  private baseUrl: string;
  private isInitialized = false;

  private constructor() {
    this.baseUrl = "http://localhost:3001/api/yixin";
  }

  static getInstance(): YiXinService {
    if (!YiXinService.instance) {
      YiXinService.instance = new YiXinService();
    }
    return YiXinService.instance;
  }

  /**
   * 初始化YiXin引擎
   */
  async initialize(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (result.success) {
        this.isInitialized = true;
        console.log("🎯 弈心引擎启动成功");
      } else {
        console.error("弈心引擎启动失败:", result.error);
      }

      return result;
    } catch (error) {
      console.error("弈心引擎初始化错误:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "网络连接失败",
      };
    }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/test`);
      const result = await response.json();
      return {
        success: true,
        message: `连接成功: ${result.message}`,
      };
    } catch (error) {
      console.error("弈心连接测试失败:", error);
      return {
        success: false,
        message: `连接失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`,
      };
    }
  }

  /**
   * 获取引擎状态
   */
  async getStatus(): Promise<YiXinStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/status`);
      const result = await response.json();
      this.isInitialized = result.ready;
      return result;
    } catch (error) {
      console.error("获取弈心状态失败:", error);
      return {
        ready: false,
        message: "无法连接到弈心引擎",
      };
    }
  }

  /**
   * 获取AI下一步落子
   */
  async getMove(moves: Array<[number, number]>): Promise<YiXinMove> {
    if (!this.isInitialized) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        return {
          row: -1,
          col: -1,
          success: false,
          error: "弈心引擎未就绪",
        };
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ moves }),
      });

      const result = await response.json();

      if (!result.success) {
        console.error("弈心落子失败:", result.error);
      } else {
        console.log(`🎯 弈心选择: [${result.row}, ${result.col}]`);
      }

      return result;
    } catch (error) {
      console.error("弈心API调用失败:", error);
      return {
        row: -1,
        col: -1,
        success: false,
        error: error instanceof Error ? error.message : "网络请求失败",
      };
    }
  }

  /**
   * 重新开始游戏
   */
  async restart(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/restart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (result.success) {
        console.log("🎯 弈心游戏重新开始");
      } else {
        console.error("弈心重启失败:", result.error);
      }

      return result;
    } catch (error) {
      console.error("弈心重启错误:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "网络请求失败",
      };
    }
  }

  /**
   * 停止引擎
   */
  async stop(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/stop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (result.success) {
        this.isInitialized = false;
        console.log("🎯 弈心引擎已停止");
      }

      return result;
    } catch (error) {
      console.error("弈心停止错误:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "网络请求失败",
      };
    }
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// 导出单例实例
export const yiXinService = YiXinService.getInstance();
