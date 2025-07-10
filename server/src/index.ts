import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { SocketHandler } from "./socket/SocketHandler.js";
import { yiXinRouter } from "./yixin/yiXinRouter.js";

const app = express();
const server = createServer(app);

// 配置CORS
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  })
);

app.use(express.json());

// YiXin AI 路由
app.use("/api/yixin", yiXinRouter);

// 创建Socket.IO服务器
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  },
});

// 创建Socket处理器
const socketHandler = new SocketHandler(io);

// 处理Socket连接
io.on("connection", (socket) => {
  socketHandler.handleConnection(socket);
});

// 基本路由
app.get("/", (req, res) => {
  res.json({
    message: "Gobang Game Server",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

// 健康检查
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// 启动服务器
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 五子棋服务器启动成功！`);
  console.log(`📡 HTTP服务器运行在: http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO服务器运行在: ws://localhost:${PORT}`);
  console.log(`🎮 准备接受客户端连接...`);
});

// 优雅关闭
process.on("SIGINT", () => {
  console.log("\n🛑 正在关闭服务器...");
  server.close(() => {
    console.log("✅ 服务器已关闭");
    process.exit(0);
  });
});

export default app;
