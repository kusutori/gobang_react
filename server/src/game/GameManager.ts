// 游戏状态类型定义
export type CellState = 0 | 1 | 2;
export type Board = CellState[][];
export type Player = 1 | 2;

export interface GameRoom {
  id: string;
  players: {
    [socketId: string]: {
      id: string;
      name: string;
      player: Player;
      ready: boolean;
    };
  };
  board: Board;
  currentPlayer: Player;
  gameStarted: boolean;
  gameOver: boolean;
  winner: Player | null;
  spectators: string[];
  createdAt: Date;
  lastActivity: Date;
}

export interface MoveData {
  row: number;
  col: number;
  player: Player;
  roomId: string;
}

// 创建空棋盘
export function createEmptyBoard(): Board {
  return Array(15)
    .fill(null)
    .map(() => Array(15).fill(0));
}

// 检查胜利条件
export function checkWin(board: Board, row: number, col: number): boolean {
  const player = board[row][col];
  if (player === 0) return false;

  // 四个方向：水平、垂直、正斜、反斜
  const directions = [
    [0, 1], // 水平
    [1, 0], // 垂直
    [1, 1], // 正斜
    [1, -1], // 反斜
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

// 游戏管理器
export class GameManager {
  private rooms: Map<string, GameRoom> = new Map();
  private playerRooms: Map<string, string> = new Map(); // socketId -> roomId

  // 创建房间
  createRoom(playerId: string, playerName: string): GameRoom {
    const roomId = this.generateRoomId();
    const room: GameRoom = {
      id: roomId,
      players: {
        [playerId]: {
          id: playerId,
          name: playerName,
          player: 1, // 房主默认为黑棋
          ready: false,
        },
      },
      board: createEmptyBoard(),
      currentPlayer: 1,
      gameStarted: false,
      gameOver: false,
      winner: null,
      spectators: [],
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.rooms.set(roomId, room);
    this.playerRooms.set(playerId, roomId);

    return room;
  }

  // 加入房间
  joinRoom(
    roomId: string,
    playerId: string,
    playerName: string
  ): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const playerCount = Object.keys(room.players).length;

    if (playerCount >= 2) {
      // 作为观众加入
      room.spectators.push(playerId);
    } else {
      // 作为玩家加入
      room.players[playerId] = {
        id: playerId,
        name: playerName,
        player: 2, // 后加入的玩家为白棋
        ready: false,
      };
    }

    this.playerRooms.set(playerId, roomId);
    room.lastActivity = new Date();

    return room;
  }

  // 离开房间
  leaveRoom(playerId: string): void {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    // 从玩家中移除
    delete room.players[playerId];

    // 从观众中移除
    room.spectators = room.spectators.filter((id) => id !== playerId);

    // 清除玩家房间映射
    this.playerRooms.delete(playerId);

    // 如果房间没有玩家了，删除房间
    if (
      Object.keys(room.players).length === 0 &&
      room.spectators.length === 0
    ) {
      this.rooms.delete(roomId);
    }
  }

  // 设置玩家准备状态
  setPlayerReady(playerId: string, ready: boolean): GameRoom | null {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room || !room.players[playerId]) return null;

    room.players[playerId].ready = ready;
    room.lastActivity = new Date();

    // 检查是否可以开始游戏
    const playerIds = Object.keys(room.players);
    if (
      playerIds.length === 2 &&
      playerIds.every((id) => room.players[id].ready)
    ) {
      room.gameStarted = true;
    }

    return room;
  }

  // 执行移动
  makeMove(
    playerId: string,
    row: number,
    col: number
  ): { room: GameRoom | null; valid: boolean } {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return { room: null, valid: false };

    const room = this.rooms.get(roomId);
    if (!room || !room.gameStarted || room.gameOver) {
      return { room: null, valid: false };
    }

    const player = room.players[playerId];
    if (!player || player.player !== room.currentPlayer) {
      return { room: null, valid: false };
    }

    // 检查位置是否有效
    if (
      row < 0 ||
      row >= 15 ||
      col < 0 ||
      col >= 15 ||
      room.board[row][col] !== 0
    ) {
      return { room: null, valid: false };
    }

    // 执行移动
    room.board[row][col] = room.currentPlayer;
    room.lastActivity = new Date();

    // 检查胜利
    if (checkWin(room.board, row, col)) {
      room.gameOver = true;
      room.winner = room.currentPlayer;
    } else {
      // 切换玩家
      room.currentPlayer = room.currentPlayer === 1 ? 2 : 1;
    }

    return { room, valid: true };
  }

  // 重置游戏
  resetGame(roomId: string): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.board = createEmptyBoard();
    room.currentPlayer = 1;
    room.gameStarted = false;
    room.gameOver = false;
    room.winner = null;
    room.lastActivity = new Date();

    // 重置玩家准备状态
    Object.values(room.players).forEach((player) => {
      player.ready = false;
    });

    return room;
  }

  // 获取房间信息
  getRoom(roomId: string): GameRoom | null {
    return this.rooms.get(roomId) || null;
  }

  // 获取玩家所在房间
  getPlayerRoom(playerId: string): GameRoom | null {
    const roomId = this.playerRooms.get(playerId);
    return roomId ? this.rooms.get(roomId) || null : null;
  }

  // 获取所有房间列表
  getRoomList(): Array<{
    id: string;
    playerCount: number;
    gameStarted: boolean;
  }> {
    return Array.from(this.rooms.values()).map((room) => ({
      id: room.id,
      playerCount: Object.keys(room.players).length,
      gameStarted: room.gameStarted,
    }));
  }

  // 清理长时间无活动的房间
  cleanupInactiveRooms(): void {
    const now = new Date();
    const INACTIVE_TIMEOUT = 30 * 60 * 1000; // 30分钟

    for (const [roomId, room] of this.rooms.entries()) {
      if (now.getTime() - room.lastActivity.getTime() > INACTIVE_TIMEOUT) {
        // 清理所有玩家的房间映射
        Object.keys(room.players).forEach((playerId) => {
          this.playerRooms.delete(playerId);
        });
        room.spectators.forEach((playerId) => {
          this.playerRooms.delete(playerId);
        });

        this.rooms.delete(roomId);
      }
    }
  }

  // 生成房间ID
  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}
