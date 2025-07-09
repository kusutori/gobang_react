import { Server, Socket } from "socket.io";
import { GameManager } from "../game/GameManager.js";

// 事件名称常量
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

export class SocketHandler {
  private gameManager: GameManager;
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.gameManager = new GameManager();

    // 定期清理无效房间
    setInterval(() => {
      this.gameManager.cleanupInactiveRooms();
    }, 5 * 60 * 1000); // 5分钟清理一次
  }

  // 处理客户端连接
  handleConnection(socket: Socket): void {
    console.log(`客户端连接: ${socket.id}`);

    // 创建房间
    socket.on(SOCKET_EVENTS.CREATE_ROOM, (data: { playerName: string }) => {
      try {
        const room = this.gameManager.createRoom(socket.id, data.playerName);
        socket.join(room.id);

        socket.emit(SOCKET_EVENTS.ROOM_CREATED, {
          roomId: room.id,
          room: this.sanitizeRoom(room),
        });

        console.log(`玩家 ${data.playerName} 创建房间 ${room.id}`);
      } catch (error) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: "创建房间失败" });
      }
    });

    // 加入房间
    socket.on(
      SOCKET_EVENTS.JOIN_ROOM,
      (data: { roomId: string; playerName: string }) => {
        try {
          const room = this.gameManager.joinRoom(
            data.roomId,
            socket.id,
            data.playerName
          );

          if (!room) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: "房间不存在" });
            return;
          }

          socket.join(data.roomId);

          socket.emit(SOCKET_EVENTS.ROOM_JOINED, {
            roomId: data.roomId,
            room: this.sanitizeRoom(room),
          });

          // 通知房间内其他玩家
          socket.to(data.roomId).emit(SOCKET_EVENTS.PLAYER_JOINED, {
            playerId: socket.id,
            playerName: data.playerName,
            room: this.sanitizeRoom(room),
          });

          console.log(`玩家 ${data.playerName} 加入房间 ${data.roomId}`);
        } catch (error) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: "加入房间失败" });
        }
      }
    );

    // 离开房间
    socket.on(SOCKET_EVENTS.LEAVE_ROOM, () => {
      this.handlePlayerLeave(socket);
    });

    // 设置准备状态
    socket.on(SOCKET_EVENTS.PLAYER_READY, (data: { ready: boolean }) => {
      try {
        const room = this.gameManager.setPlayerReady(socket.id, data.ready);

        if (!room) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: "设置准备状态失败" });
          return;
        }

        // 通知房间内所有玩家
        this.io.to(room.id).emit(SOCKET_EVENTS.PLAYER_READY_UPDATE, {
          playerId: socket.id,
          ready: data.ready,
          room: this.sanitizeRoom(room),
        });

        // 如果游戏开始，通知所有玩家
        if (room.gameStarted) {
          this.io.to(room.id).emit(SOCKET_EVENTS.GAME_STARTED, {
            room: this.sanitizeRoom(room),
          });
        }

        console.log(`玩家 ${socket.id} 设置准备状态: ${data.ready}`);
      } catch (error) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: "设置准备状态失败" });
      }
    });

    // 执行移动
    socket.on(SOCKET_EVENTS.MAKE_MOVE, (data: { row: number; col: number }) => {
      try {
        const result = this.gameManager.makeMove(socket.id, data.row, data.col);

        if (!result.valid || !result.room) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: "无效的移动" });
          return;
        }

        const room = result.room;

        // 通知房间内所有玩家
        this.io.to(room.id).emit(SOCKET_EVENTS.MOVE_MADE, {
          row: data.row,
          col: data.col,
          player: room.board[data.row][data.col],
          room: this.sanitizeRoom(room),
        });

        // 如果游戏结束，发送游戏结束事件
        if (room.gameOver) {
          this.io.to(room.id).emit(SOCKET_EVENTS.GAME_OVER, {
            winner: room.winner,
            room: this.sanitizeRoom(room),
          });
        }

        console.log(`玩家 ${socket.id} 下棋: (${data.row}, ${data.col})`);
      } catch (error) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: "下棋失败" });
      }
    });

    // 重置游戏
    socket.on(SOCKET_EVENTS.RESET_GAME, () => {
      try {
        const playerRoom = this.gameManager.getPlayerRoom(socket.id);
        if (!playerRoom) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: "未找到房间" });
          return;
        }

        const room = this.gameManager.resetGame(playerRoom.id);
        if (!room) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: "重置游戏失败" });
          return;
        }

        // 通知房间内所有玩家
        this.io.to(room.id).emit(SOCKET_EVENTS.GAME_RESET, {
          room: this.sanitizeRoom(room),
        });

        console.log(`房间 ${room.id} 游戏重置`);
      } catch (error) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: "重置游戏失败" });
      }
    });

    // 获取房间列表
    socket.on(SOCKET_EVENTS.GET_ROOM_LIST, () => {
      try {
        const roomList = this.gameManager.getRoomList();
        socket.emit(SOCKET_EVENTS.ROOM_LIST, { rooms: roomList });
      } catch (error) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: "获取房间列表失败" });
      }
    });

    // 处理断开连接
    socket.on("disconnect", () => {
      console.log(`客户端断开连接: ${socket.id}`);
      this.handlePlayerLeave(socket);
    });
  }

  // 处理玩家离开
  private handlePlayerLeave(socket: Socket): void {
    try {
      const playerRoom = this.gameManager.getPlayerRoom(socket.id);

      if (playerRoom) {
        socket.leave(playerRoom.id);

        // 通知房间内其他玩家
        socket.to(playerRoom.id).emit(SOCKET_EVENTS.PLAYER_LEFT, {
          playerId: socket.id,
        });

        this.gameManager.leaveRoom(socket.id);
        console.log(`玩家 ${socket.id} 离开房间 ${playerRoom.id}`);
      }
    } catch (error) {
      console.error("处理玩家离开时出错:", error);
    }
  }

  // 清理房间数据，移除敏感信息
  private sanitizeRoom(room: any) {
    return {
      id: room.id,
      players: Object.fromEntries(
        Object.entries(room.players).map(([id, player]: [string, any]) => [
          id,
          {
            id: player.id,
            name: player.name,
            player: player.player,
            ready: player.ready,
          },
        ])
      ),
      board: room.board,
      currentPlayer: room.currentPlayer,
      gameStarted: room.gameStarted,
      gameOver: room.gameOver,
      winner: room.winner,
      spectators: room.spectators,
    };
  }
}
