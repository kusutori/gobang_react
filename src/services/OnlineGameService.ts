import { databases, DATABASE_ID, ID, Query } from './AppwriteService';
import { useAuthStore } from '../store/authStore';

// 房间状态枚举
export enum RoomStatus {
    WAITING = 'waiting',
    PLAYING = 'playing',
    FINISHED = 'finished'
}

// 玩家状态
export interface OnlinePlayer {
    user_id: string;
    username: string;
    color: 1 | 2; // 1=黑子, 2=白子
    ready: boolean;
    joined_at: string;
}

// 房间信息
export interface OnlineRoom {
    $id?: string;
    room_code: string;
    host_id: string;
    host_name: string;
    status: RoomStatus;
    current_player: 1 | 2;
    board: (0 | 1 | 2)[][];
    players: OnlinePlayer[];
    max_players: number;
    created_at: string;
    updated_at: string;
    game_started_at?: string;
    winner?: 1 | 2 | null;
}

// 游戏移动记录
export interface GameMove {
    $id?: string;
    room_id: string;
    player_id: string;
    row: number;
    col: number;
    move_number: number;
    timestamp: string;
}

const COLLECTIONS = {
    ONLINE_ROOMS: 'online_rooms',
    GAME_MOVES: 'game_moves'
};

class OnlineGameService {
    private currentRoom: OnlineRoom | null = null;
    private listeners: Map<string, ((data: any) => void)[]> = new Map();

    // 序列化棋盘数据
    private serializeBoard(board: (0 | 1 | 2)[][]): string {
        return JSON.stringify(board);
    }

    // 反序列化棋盘数据
    private deserializeBoard(boardStr: string): (0 | 1 | 2)[][] {
        try {
            return JSON.parse(boardStr);
        } catch {
            return this.createEmptyBoard();
        }
    }

    // 序列化玩家数据
    private serializePlayers(players: OnlinePlayer[]): string {
        return JSON.stringify(players);
    }

    // 反序列化玩家数据
    private deserializePlayers(playersStr: string): OnlinePlayer[] {
        try {
            return JSON.parse(playersStr);
        } catch {
            return [];
        }
    }

    // 将数据库文档转换为房间对象
    private documentToRoom(doc: any): OnlineRoom {
        return {
            ...doc,
            board: this.deserializeBoard(doc.board),
            players: this.deserializePlayers(doc.players)
        };
    }

    // 生成6位房间代码
    private generateRoomCode(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // 创建空棋盘
    private createEmptyBoard(): (0 | 1 | 2)[][] {
        return Array(15).fill(null).map(() => Array(15).fill(0));
    }

    // 添加事件监听器
    addEventListener(event: string, callback: (data: any) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)?.push(callback);
    }

    // 移除事件监听器
    removeEventListener(event: string, callback?: (data: any) => void): void {
        if (callback) {
            const callbacks = this.listeners.get(event) || [];
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        } else {
            this.listeners.delete(event);
        }
    }

    // 触发事件
    private emit(event: string, data: any): void {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(callback => callback(data));
    }

    // 创建房间
    async createRoom(): Promise<OnlineRoom> {
        const { user } = useAuthStore.getState();
        if (!user) throw new Error('用户未登录');

        const roomCode = this.generateRoomCode();
        const now = new Date().toISOString();
        const board = this.createEmptyBoard();
        const players: OnlinePlayer[] = [{
            user_id: user.$id,
            username: user.name || user.email,
            color: 1,
            ready: false,
            joined_at: now
        }];

        const roomData = {
            room_code: roomCode,
            host_id: user.$id,
            host_name: user.name || user.email,
            status: RoomStatus.WAITING,
            current_player: 1,
            board: this.serializeBoard(board),
            players: this.serializePlayers(players),
            max_players: 2,
            created_at: now,
            updated_at: now
        };

        try {
            const response = await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.ONLINE_ROOMS,
                ID.unique(),
                roomData
            );

            this.currentRoom = this.documentToRoom(response);
            this.emit('room-created', this.currentRoom);
            return this.currentRoom;
        } catch (error) {
            console.error('创建房间失败:', error);
            throw error;
        }
    }

    // 加入房间
    async joinRoom(roomCode: string): Promise<OnlineRoom> {
        const { user } = useAuthStore.getState();
        if (!user) throw new Error('用户未登录');

        try {
            // 查找房间
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.ONLINE_ROOMS,
                [Query.equal('room_code', roomCode)]
            );

            if (response.documents.length === 0) {
                throw new Error('房间不存在');
            }

            const roomDoc = response.documents[0];
            const room = this.documentToRoom(roomDoc);

            // 检查房间状态
            if (room.status === RoomStatus.FINISHED) {
                throw new Error('房间已结束');
            }

            if (room.players.length >= room.max_players) {
                throw new Error('房间已满');
            }

            // 检查是否已在房间中
            const existingPlayer = room.players.find(p => p.user_id === user.$id);
            if (existingPlayer) {
                this.currentRoom = room;
                this.emit('room-joined', this.currentRoom);
                return this.currentRoom;
            }

            // 添加玩家
            const newPlayer: OnlinePlayer = {
                user_id: user.$id,
                username: user.name || user.email,
                color: room.players.length === 0 ? 1 : 2,
                ready: false,
                joined_at: new Date().toISOString()
            };

            const updatedPlayers = [...room.players, newPlayer];

            await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.ONLINE_ROOMS,
                room.$id!,
                {
                    players: this.serializePlayers(updatedPlayers),
                    updated_at: new Date().toISOString()
                }
            );

            this.currentRoom = { ...room, players: updatedPlayers };
            this.emit('room-joined', this.currentRoom);
            return this.currentRoom;
        } catch (error) {
            console.error('加入房间失败:', error);
            throw error;
        }
    }

    // 离开房间
    async leaveRoom(): Promise<void> {
        if (!this.currentRoom) return;

        const { user } = useAuthStore.getState();
        if (!user) return;

        try {
            const updatedPlayers = this.currentRoom.players.filter(p => p.user_id !== user.$id);

            if (updatedPlayers.length === 0) {
                // 如果没有玩家了，删除房间
                await databases.deleteDocument(
                    DATABASE_ID,
                    COLLECTIONS.ONLINE_ROOMS,
                    this.currentRoom.$id!
                );
            } else {
                // 更新房间
                await databases.updateDocument(
                    DATABASE_ID,
                    COLLECTIONS.ONLINE_ROOMS,
                    this.currentRoom.$id!,
                    {
                        players: this.serializePlayers(updatedPlayers),
                        updated_at: new Date().toISOString()
                    }
                );
            }

            this.currentRoom = null;
            this.emit('room-left', {});
        } catch (error) {
            console.error('离开房间失败:', error);
            throw error;
        }
    }

    // 设置准备状态
    async setReady(ready: boolean): Promise<void> {
        if (!this.currentRoom) throw new Error('未在房间中');

        const { user } = useAuthStore.getState();
        if (!user) throw new Error('用户未登录');

        const updatedPlayers = this.currentRoom.players.map(p =>
            p.user_id === user.$id ? { ...p, ready } : p
        );

        // 检查是否所有玩家都准备好了
        const allReady = updatedPlayers.length === 2 && updatedPlayers.every(p => p.ready);
        const newStatus = allReady ? RoomStatus.PLAYING : RoomStatus.WAITING;

        try {
            const updateData: any = {
                players: this.serializePlayers(updatedPlayers),
                status: newStatus,
                updated_at: new Date().toISOString()
            };

            if (allReady) {
                updateData.game_started_at = new Date().toISOString();
            }

            await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.ONLINE_ROOMS,
                this.currentRoom.$id!,
                updateData
            );

            this.currentRoom = {
                ...this.currentRoom,
                players: updatedPlayers,
                status: newStatus
            };

            this.emit('player-ready-update', this.currentRoom);

            if (allReady) {
                this.emit('game-started', this.currentRoom);
            }
        } catch (error) {
            console.error('设置准备状态失败:', error);
            throw error;
        }
    }

    // 下棋
    async makeMove(row: number, col: number): Promise<void> {
        if (!this.currentRoom) throw new Error('未在房间中');
        if (this.currentRoom.status !== RoomStatus.PLAYING) throw new Error('游戏未开始');

        const { user } = useAuthStore.getState();
        if (!user) throw new Error('用户未登录');

        const currentPlayer = this.currentRoom.players.find(p => p.user_id === user.$id);
        if (!currentPlayer) throw new Error('不在游戏中');

        if (currentPlayer.color !== this.currentRoom.current_player) {
            throw new Error('不是你的回合');
        }

        if (this.currentRoom.board[row][col] !== 0) {
            throw new Error('此位置已有棋子');
        }

        // 更新棋盘
        const newBoard = this.currentRoom.board.map(r => [...r]);
        newBoard[row][col] = currentPlayer.color;

        // 检查游戏是否结束
        const winner = this.checkWinner(newBoard, row, col, currentPlayer.color);
        const isBoardFull = newBoard.every(row => row.every(cell => cell !== 0));

        const nextPlayer = this.currentRoom.current_player === 1 ? 2 : 1;
        const newStatus = winner || isBoardFull ? RoomStatus.FINISHED : RoomStatus.PLAYING;

        try {
            // 记录移动
            await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.GAME_MOVES,
                ID.unique(),
                {
                    room_id: this.currentRoom.$id!,
                    player_id: user.$id,
                    row,
                    col,
                    move_number: this.currentRoom.board.flat().filter(cell => cell !== 0).length + 1,
                    timestamp: new Date().toISOString()
                }
            );

            // 更新房间状态
            const updateData: any = {
                board: this.serializeBoard(newBoard),
                current_player: newStatus === RoomStatus.FINISHED ? this.currentRoom.current_player : nextPlayer,
                status: newStatus,
                updated_at: new Date().toISOString()
            };

            if (winner) {
                updateData.winner = winner;
            }

            await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.ONLINE_ROOMS,
                this.currentRoom.$id!,
                updateData
            );

            this.currentRoom = {
                ...this.currentRoom,
                board: newBoard,
                current_player: newStatus === RoomStatus.FINISHED ? this.currentRoom.current_player : nextPlayer,
                status: newStatus,
                winner: winner || this.currentRoom.winner
            };

            this.emit('move-made', {
                room: this.currentRoom,
                row,
                col,
                player: currentPlayer.color
            });

            if (winner || isBoardFull) {
                this.emit('game-over', {
                    room: this.currentRoom,
                    winner,
                    isDraw: !winner && isBoardFull
                });
            }
        } catch (error) {
            console.error('下棋失败:', error);
            throw error;
        }
    }

    // 检查胜利条件
    private checkWinner(board: (0 | 1 | 2)[][], row: number, col: number, player: 1 | 2): 1 | 2 | null {
        const directions = [
            [0, 1],   // 水平
            [1, 0],   // 垂直
            [1, 1],   // 对角线 \
            [1, -1]   // 对角线 /
        ];

        for (const [dx, dy] of directions) {
            let count = 1;

            // 向正方向查找
            for (let i = 1; i < 5; i++) {
                const newRow = row + dx * i;
                const newCol = col + dy * i;
                if (newRow < 0 || newRow >= 15 || newCol < 0 || newCol >= 15) break;
                if (board[newRow][newCol] === player) {
                    count++;
                } else {
                    break;
                }
            }

            // 向负方向查找
            for (let i = 1; i < 5; i++) {
                const newRow = row - dx * i;
                const newCol = col - dy * i;
                if (newRow < 0 || newRow >= 15 || newCol < 0 || newCol >= 15) break;
                if (board[newRow][newCol] === player) {
                    count++;
                } else {
                    break;
                }
            }

            if (count >= 5) {
                return player;
            }
        }

        return null;
    }

    // 获取房间列表
    async getRoomList(): Promise<OnlineRoom[]> {
        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.ONLINE_ROOMS,
                [
                    Query.equal('status', [RoomStatus.WAITING, RoomStatus.PLAYING]),
                    Query.orderDesc('created_at'),
                    Query.limit(20)
                ]
            );

            return response.documents.map(doc => this.documentToRoom(doc));
        } catch (error) {
            console.error('获取房间列表失败:', error);
            throw error;
        }
    }

    // 获取当前房间
    getCurrentRoom(): OnlineRoom | null {
        return this.currentRoom;
    }

    // 订阅房间更新
    subscribeToRoom(roomId: string): (() => void) {
        // 使用轮询作为实时更新的替代方案
        const pollInterval = setInterval(async () => {
            if (!this.currentRoom || this.currentRoom.$id !== roomId) {
                clearInterval(pollInterval);
                return;
            }

            try {
                const response = await databases.getDocument(
                    DATABASE_ID,
                    COLLECTIONS.ONLINE_ROOMS,
                    roomId
                );

                const updatedRoom = this.documentToRoom(response);
                if (updatedRoom.updated_at !== this.currentRoom.updated_at) {
                    this.currentRoom = updatedRoom;
                    this.emit('room-updated', updatedRoom);
                }
            } catch (error) {
                console.error('轮询房间状态失败:', error);
            }
        }, 2000); // 每2秒轮询一次

        // 返回清理函数
        return () => clearInterval(pollInterval);
    }

    // 清理资源
    cleanup(): void {
        this.currentRoom = null;
        this.listeners.clear();
    }
}

export const onlineGameService = new OnlineGameService();