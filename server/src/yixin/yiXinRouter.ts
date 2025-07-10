import { Router, Request, Response } from "express";
import { YiXinEngine } from "./YiXinEngine_HTTP.js";

const yiXinRouter = Router();

// YiXin引擎实例（使用HTTP服务）
let yiXinEngine: YiXinEngine | null = null;

/**
 * 初始化YiXin引擎
 */
yiXinRouter.post("/init", async (req: Request, res: Response) => {
  try {
    if (yiXinEngine && yiXinEngine.isEngineReady()) {
      return res.json({
        success: true,
        message: "YiXin engine is already running",
      });
    }

    console.log("🎯 Initializing YiXin engine via HTTP service...");

    yiXinEngine = new YiXinEngine();
    await yiXinEngine.start();

    res.json({
      success: true,
      message: "YiXin engine started successfully",
    });
  } catch (error) {
    console.error("Failed to start YiXin engine:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * 获取YiXin的下一步落子
 */
yiXinRouter.post("/move", async (req: Request, res: Response) => {
  try {
    if (!yiXinEngine || !yiXinEngine.isEngineReady()) {
      return res.status(400).json({
        success: false,
        error: "YiXin engine is not ready. Please initialize first.",
      });
    }

    const { moves } = req.body;

    if (!Array.isArray(moves)) {
      return res.status(400).json({
        success: false,
        error: "Invalid moves format. Expected array of [row, col] pairs.",
      });
    }

    const result = await yiXinEngine.getMove(moves);
    res.json(result);
  } catch (error) {
    console.error("Error getting YiXin move:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * 重新开始游戏
 */
yiXinRouter.post("/restart", async (req: Request, res: Response) => {
  try {
    if (!yiXinEngine || !yiXinEngine.isEngineReady()) {
      return res.status(400).json({
        success: false,
        error: "YiXin engine is not ready",
      });
    }

    await yiXinEngine.restart();
    res.json({
      success: true,
      message: "Game restarted successfully",
    });
  } catch (error) {
    console.error("Error restarting YiXin game:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * 检查引擎状态
 */
yiXinRouter.get("/status", (req: Request, res: Response) => {
  const isReady = yiXinEngine && yiXinEngine.isEngineReady();
  res.json({
    ready: isReady,
    message: isReady ? "YiXin engine is ready" : "YiXin engine is not running",
  });
});

/**
 * 测试连接
 */
yiXinRouter.get("/test", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "YiXin API is working",
    timestamp: new Date().toISOString(),
  });
});

/**
 * 停止引擎
 */
yiXinRouter.post("/stop", (req: Request, res: Response) => {
  try {
    if (yiXinEngine) {
      yiXinEngine.stop();
      yiXinEngine = null;
    }

    res.json({
      success: true,
      message: "YiXin engine stopped",
    });
  } catch (error) {
    console.error("Error stopping YiXin engine:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export { yiXinRouter };
