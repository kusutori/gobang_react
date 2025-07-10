import { spawn } from "child_process";
import path from "path";

export interface YiXinMove {
  row: number;
  col: number;
  success: boolean;
  error?: string;
}

export class YiXinEngine {
  private pythonScriptPath: string;
  private isReady = false;

  constructor() {
    // Python脚本路径
    this.pythonScriptPath = path.join(
      process.cwd(),
      "..",
      "YiXin-Wuziqi-API",
      "yixin_bridge.py"
    );
  }

  /**
   * 启动YiXin引擎（通过Python桥接）
   */
  async start(): Promise<void> {
    try {
      const result = await this.callPython("init");
      if (result.success) {
        this.isReady = true;
        console.log("✅ YiXin engine initialized via Python bridge");
      } else {
        throw new Error(result.error || "Failed to initialize YiXin");
      }
    } catch (error) {
      throw new Error(`Failed to start YiXin engine: ${error}`);
    }
  }

  /**
   * 调用Python脚本
   */
  private async callPython(command: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      // 使用相对路径和简化的参数
      const args = ["yixin_bridge.py", command];
      if (data) {
        args.push(JSON.stringify(data));
      }

      console.log(`Calling Python: python ${args.join(" ")}`);
      console.log(
        `Working directory: ${path.join(
          process.cwd(),
          "..",
          "YiXin-Wuziqi-API"
        )}`
      );

      const pythonProcess = spawn("python", args, {
        cwd: path.join(process.cwd(), "..", "YiXin-Wuziqi-API"), // 设置正确的工作目录
        stdio: ["pipe", "pipe", "pipe"],
        shell: true, // 在Windows上使用shell
      });

      let output = "";
      let errorOutput = "";

      pythonProcess.stdout?.on("data", (data) => {
        output += data.toString();
      });

      pythonProcess.stderr?.on("data", (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on("close", (code) => {
        console.log(`Python process exited with code: ${code}`);
        console.log(`Python stdout: ${output}`);
        console.log(`Python stderr: ${errorOutput}`);

        if (code === 0) {
          try {
            // 解析Python脚本的JSON输出
            const lines = output.trim().split("\n");
            const lastLine = lines[lines.length - 1]; // 获取最后一行（JSON结果）
            console.log(`Parsing JSON from: ${lastLine}`);
            const result = JSON.parse(lastLine);
            resolve(result);
          } catch (parseError) {
            reject(new Error(`Failed to parse Python output: ${output}`));
          }
        } else {
          reject(
            new Error(
              `Python script failed with code ${code}: ${errorOutput || output}`
            )
          );
        }
      });

      pythonProcess.on("error", (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
  }

  /**
   * 获取AI下一步落子
   */
  async getMove(moves: Array<[number, number]>): Promise<YiXinMove> {
    if (!this.isReady) {
      throw new Error("YiXin engine is not ready");
    }

    try {
      const result = await this.callPython("move", { moves });

      if (result.success) {
        console.log(
          `🎯 YiXin suggests: [${result.row}, ${result.col}] (order: ${result.order})`
        );
        return {
          row: result.row,
          col: result.col,
          success: true,
        };
      } else {
        throw new Error(result.error || "Failed to get move from YiXin");
      }
    } catch (error) {
      console.error("Error getting move from YiXin:", error);
      return {
        row: -1,
        col: -1,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * 重新开始游戏
   */
  async restart(): Promise<void> {
    if (!this.isReady) {
      throw new Error("YiXin engine is not ready");
    }

    try {
      const result = await this.callPython("restart");
      if (result.success) {
        console.log("YiXin game restarted");
      } else {
        throw new Error(result.error || "Failed to restart game");
      }
    } catch (error) {
      throw new Error(`Failed to restart YiXin: ${error}`);
    }
  }

  /**
   * 停止引擎
   */
  stop(): void {
    this.isReady = false;
    console.log("YiXin engine stopped");
  }

  /**
   * 检查引擎是否就绪
   */
  isEngineReady(): boolean {
    return this.isReady;
  }

  /**
   * 获取引擎状态
   */
  async getStatus(): Promise<{ ready: boolean; message: string }> {
    try {
      const result = await this.callPython("status");
      return {
        ready: result.ready && this.isReady,
        message: result.message,
      };
    } catch (error) {
      return {
        ready: false,
        message: `Failed to get status: ${error}`,
      };
    }
  }
}
