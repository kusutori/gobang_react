import { io, Socket } from "socket.io-client";

// 事件名称常量（与服务器保持一致）
export const SOCKET_EVENTS = {
  // 客户端发送的事件
  CREATE_ROOM: "create-room",
  JOIN_ROOM: "join-room",
  LEAVE_ROOM: "leave-room",
  PLAYER_READY: "player-ready",
  MAKE_MOVE: "make-move",
  RESET_GAME: "reset-game",
  GET_ROOM_LIST: "get-room-list",

  // 服务器发送的事件
  ROOM_CREATED: "room-created",
  ROOM_JOINED: "room-joined",
  ROOM_LEFT: "room-left",
  PLAYER_JOINED: "player-joined",
  PLAYER_LEFT: "player-left",
  PLAYER_READY_UPDATE: "player-ready-update",
  GAME_STARTED: "game-started",
  MOVE_MADE: "move-made",
  GAME_OVER: "game-over",
  GAME_RESET: "game-reset",
  ROOM_LIST: "room-list",
  ERROR: "error",
};

// 房间数据类型
export interface RoomData {
  id: string;
  players: {
    [socketId: string]: {
      id: string;
      name: string;
      player: 1 | 2;
      ready: boolean;
    };
  };
  board: (0 | 1 | 2)[][];
  currentPlayer: 1 | 2;
  gameStarted: boolean;
  gameOver: boolean;
  winner: 1 | 2 | null;
  spectators: string[];
}

// Socket.IO 客户端管理器
export class SocketService {
  private socket: Socket | null = null;
  private serverUrl: string;
  private listeners: Map<string, ((...args: any[]) => void)[]> = new Map();

  constructor(serverUrl: string = "http://localhost:3001") {
    this.serverUrl = serverUrl;
  }

  // 连接到服务器
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io(this.serverUrl, {
        transports: ["websocket", "polling"],
        upgrade: true,
        rememberUpgrade: true,
      });

      this.socket.on("connect", () => {
        console.log("Socket.IO 连接成功:", this.socket?.id);
        resolve();
      });

      this.socket.on("connect_error", (error: any) => {
        console.error("Socket.IO 连接错误:", error);
        reject(error);
      });

      this.socket.on("disconnect", (reason: any) => {
        console.log("Socket.IO 断开连接:", reason);
      });

      // 重新注册所有监听器
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach((callback) => {
          this.socket?.on(event, callback);
        });
      });
    });
  }

  // 断开连接
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // 检查连接状态
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // 获取Socket ID
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // 添加事件监听器
  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // 移除事件监听器
  off(event: string, callback?: (...args: any[]) => void): void {
    if (callback) {
      const callbacks = this.listeners.get(event) || [];
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
      this.socket?.off(event, callback);
    } else {
      this.listeners.delete(event);
      this.socket?.off(event);
    }
  }

  // 发送事件
  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn("Socket未连接，无法发送事件:", event);
    }
  }

  // 创建房间
  createRoom(playerName: string): void {
    this.emit(SOCKET_EVENTS.CREATE_ROOM, { playerName });
  }

  // 加入房间
  joinRoom(roomId: string, playerName: string): void {
    this.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, playerName });
  }

  // 离开房间
  leaveRoom(): void {
    this.emit(SOCKET_EVENTS.LEAVE_ROOM);
  }

  // 设置准备状态
  setPlayerReady(ready: boolean): void {
    this.emit(SOCKET_EVENTS.PLAYER_READY, { ready });
  }

  // 下棋
  makeMove(row: number, col: number): void {
    this.emit(SOCKET_EVENTS.MAKE_MOVE, { row, col });
  }

  // 重置游戏
  resetGame(): void {
    this.emit(SOCKET_EVENTS.RESET_GAME);
  }

  // 获取房间列表
  getRoomList(): void {
    this.emit(SOCKET_EVENTS.GET_ROOM_LIST);
  }
}

// 单例模式
export const socketService = new SocketService();
