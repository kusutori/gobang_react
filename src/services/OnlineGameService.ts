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
        console.log('🔍 原始文档数据:', {
            boardStr: doc.board,
            boardType: typeof doc.board,
            playersStr: doc.players,
            playersType: typeof doc.players
        });

        const board = this.deserializeBoard(doc.board);
        const players = this.deserializePlayers(doc.players);

        console.log('🔍 反序列化结果:', {
            board,
            boardHasData: board.some(row => row.some(cell => cell !== 0)),
            players,
            playersLength: players.length
        });

        return {
            ...doc,
            board,
            players
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
                console.log('🗑️ 房间无玩家，删除房间:', this.currentRoom.room_code);
                await databases.deleteDocument(
                    DATABASE_ID,
                    COLLECTIONS.ONLINE_ROOMS,
                    this.currentRoom.$id!
                );
            } else {
                // 如果剩下的玩家数量不足且游戏正在进行中，结束游戏
                if (updatedPlayers.length === 1 && this.currentRoom.status === RoomStatus.PLAYING) {
                    console.log('🏆 玩家离开，剩余玩家获胜');
                    const remainingPlayer = updatedPlayers[0];
                    await databases.updateDocument(
                        DATABASE_ID,
                        COLLECTIONS.ONLINE_ROOMS,
                        this.currentRoom.$id!,
                        {
                            players: this.serializePlayers(updatedPlayers),
                            status: RoomStatus.FINISHED,
                            winner: remainingPlayer.color,
                            updated_at: new Date().toISOString()
                        }
                    );
                } else {
                    // 正常更新房间
                    await databases.updateDocument(
                        DATABASE_ID,
                        COLLECTIONS.ONLINE_ROOMS,
                        this.currentRoom.$id!,
                        {
                            players: this.serializePlayers(updatedPlayers),
                            // 如果房间回到等待状态（玩家不足），重置状态
                            status: updatedPlayers.length < 2 ? RoomStatus.WAITING : this.currentRoom.status,
                            updated_at: new Date().toISOString()
                        }
                    );
                }
            }

            this.currentRoom = null;
            this.emit('room-left', {});
        } catch (error) {
            console.error('离开房间失败:', error);
            // 即使出错也要清理本地状态
            this.currentRoom = null;
            this.emit('room-left', {});
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

            console.log('🎯 准备更新房间状态:', {
                roomId: this.currentRoom.$id,
                updateData,
                newBoard,
                winner,
                newStatus
            });

            await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.ONLINE_ROOMS,
                this.currentRoom.$id!,
                updateData
            );

            console.log('✅ 房间状态更新成功');

            // 立即更新本地状态
            this.currentRoom = {
                ...this.currentRoom,
                board: newBoard,
                current_player: newStatus === RoomStatus.FINISHED ? this.currentRoom.current_player : nextPlayer,
                status: newStatus,
                winner: winner || this.currentRoom.winner,
                updated_at: updateData.updated_at
            };

            console.log('🔄 本地房间状态已更新:', {
                boardHasData: this.currentRoom.board.some(row => row.some(cell => cell !== 0)),
                currentPlayer: this.currentRoom.current_player,
                status: this.currentRoom.status
            });

            // 立即触发房间更新事件，让UI能立即响应
            this.emit('room-updated', this.currentRoom);

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
        console.log('🔔 开始订阅房间:', roomId);

        // 使用轮询作为实时更新的替代方案
        const pollInterval = setInterval(async () => {
            if (!this.currentRoom || this.currentRoom.$id !== roomId) {
                console.log('⏹️ 轮询停止 - 房间不匹配:', {
                    hasCurrentRoom: !!this.currentRoom,
                    currentRoomId: this.currentRoom?.$id,
                    targetRoomId: roomId
                });
                clearInterval(pollInterval);
                return;
            }

            try {
                console.log('🔄 轮询房间数据...', roomId);
                const response = await databases.getDocument(
                    DATABASE_ID,
                    COLLECTIONS.ONLINE_ROOMS,
                    roomId
                );

                const updatedRoom = this.documentToRoom(response);
                console.log('📊 轮询获取房间状态:', {
                    roomId,
                    oldStatus: this.currentRoom.status,
                    newStatus: updatedRoom.status,
                    oldUpdatedAt: this.currentRoom.updated_at,
                    newUpdatedAt: updatedRoom.updated_at,
                    boardHasData: updatedRoom.board.some(row => row.some(cell => cell !== 0)),
                    shouldUpdate: new Date(updatedRoom.updated_at) > new Date(this.currentRoom.updated_at)
                });

                // 只有当服务器数据确实更新时才覆盖本地状态
                if (new Date(updatedRoom.updated_at) > new Date(this.currentRoom.updated_at)) {
                    const oldStatus = this.currentRoom.status;
                    this.currentRoom = updatedRoom;

                    console.log('🔄 房间状态更新 (通过轮询):', {
                        status: updatedRoom.status,
                        currentPlayer: updatedRoom.current_player,
                        boardHasData: updatedRoom.board.some(row => row.some(cell => cell !== 0))
                    });

                    // 触发房间更新事件
                    this.emit('room-updated', updatedRoom);

                    // 检查游戏是否刚开始
                    if (oldStatus === RoomStatus.WAITING && updatedRoom.status === RoomStatus.PLAYING) {
                        this.emit('game-started', updatedRoom);
                    }

                    // 检查游戏是否结束
                    if (updatedRoom.status === RoomStatus.FINISHED && oldStatus !== RoomStatus.FINISHED) {
                        this.emit('game-over', { room: updatedRoom, winner: updatedRoom.winner });
                    }
                }
            } catch (error) {
                console.error('轮询房间状态失败:', error);
            }
        }, 2000); // 每2秒轮询一次

        // 返回清理函数
        return () => {
            console.log('🧹 清理轮询:', roomId);
            clearInterval(pollInterval);
        };
    }

    // 清理资源
    cleanup(): void {
        this.currentRoom = null;
        this.listeners.clear();
    }

    // 清理过期房间
    async cleanupExpiredRooms(maxAgeHours: number = 2): Promise<number> {
        try {
            const cutoffTime = new Date();
            cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours);
            const cutoffISOString = cutoffTime.toISOString();

            console.log('🧹 开始清理过期房间，截止时间:', cutoffISOString);

            // 获取所有可能过期的房间
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.ONLINE_ROOMS,
                [
                    Query.lessThan('updated_at', cutoffISOString),
                    Query.limit(100)
                ]
            );

            console.log(`🔍 找到 ${response.documents.length} 个可能过期的房间`);

            let deletedCount = 0;
            for (const doc of response.documents) {
                try {
                    await databases.deleteDocument(
                        DATABASE_ID,
                        COLLECTIONS.ONLINE_ROOMS,
                        doc.$id
                    );
                    deletedCount++;
                    console.log(`🗑️ 已删除过期房间: ${doc.room_code} (${doc.$id})`);
                } catch (error) {
                    console.error(`删除房间 ${doc.room_code} 失败:`, error);
                }
            }

            console.log(`✅ 清理完成，共删除 ${deletedCount} 个过期房间`);
            return deletedCount;
        } catch (error) {
            console.error('清理过期房间失败:', error);
            return 0;
        }
    }

    // 清理僵尸房间（状态为游戏中但长时间无更新的房间）
    async cleanupZombieRooms(maxInactiveMinutes: number = 30): Promise<number> {
        try {
            const cutoffTime = new Date();
            cutoffTime.setMinutes(cutoffTime.getMinutes() - maxInactiveMinutes);
            const cutoffISOString = cutoffTime.toISOString();

            console.log('🧟 开始清理僵尸房间，截止时间:', cutoffISOString);

            // 获取游戏中但长时间无更新的房间
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.ONLINE_ROOMS,
                [
                    Query.equal('status', RoomStatus.PLAYING),
                    Query.lessThan('updated_at', cutoffISOString),
                    Query.limit(50)
                ]
            );

            console.log(`🔍 找到 ${response.documents.length} 个僵尸房间`);

            let deletedCount = 0;
            for (const doc of response.documents) {
                try {
                    await databases.deleteDocument(
                        DATABASE_ID,
                        COLLECTIONS.ONLINE_ROOMS,
                        doc.$id
                    );
                    deletedCount++;
                    console.log(`🗑️ 已删除僵尸房间: ${doc.room_code} (${doc.$id})`);
                } catch (error) {
                    console.error(`删除僵尸房间 ${doc.room_code} 失败:`, error);
                }
            }

            console.log(`✅ 僵尸房间清理完成，共删除 ${deletedCount} 个房间`);
            return deletedCount;
        } catch (error) {
            console.error('清理僵尸房间失败:', error);
            return 0;
        }
    }

    // 强制清理所有房间（危险操作，仅用于开发调试）
    async forceCleanupAllRooms(): Promise<number> {
        try {
            console.log('⚠️ 警告：执行强制清理所有房间');

            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.ONLINE_ROOMS,
                [Query.limit(100)]
            );

            console.log(`🔍 找到 ${response.documents.length} 个房间需要清理`);

            let deletedCount = 0;
            for (const doc of response.documents) {
                try {
                    await databases.deleteDocument(
                        DATABASE_ID,
                        COLLECTIONS.ONLINE_ROOMS,
                        doc.$id
                    );
                    deletedCount++;
                    console.log(`🗑️ 已删除房间: ${doc.room_code} (${doc.$id})`);
                } catch (error) {
                    console.error(`删除房间 ${doc.room_code} 失败:`, error);
                }
            }

            console.log(`✅ 强制清理完成，共删除 ${deletedCount} 个房间`);
            return deletedCount;
        } catch (error) {
            console.error('强制清理房间失败:', error);
            return 0;
        }
    }

    // 自动房间维护（定期清理）
    startAutoMaintenance(intervalMinutes: number = 10): (() => void) {
        console.log(`🔧 启动自动房间维护，间隔: ${intervalMinutes} 分钟`);

        const maintenanceInterval = setInterval(async () => {
            console.log('🔧 执行定期房间维护...');
            try {
                const zombieCount = await this.cleanupZombieRooms(30);
                const expiredCount = await this.cleanupExpiredRooms(2);
                console.log(`🔧 维护完成: 清理僵尸房间 ${zombieCount} 个，过期房间 ${expiredCount} 个`);
            } catch (error) {
                console.error('自动维护失败:', error);
            }
        }, intervalMinutes * 60 * 1000);

        // 返回停止函数
        return () => {
            console.log('🛑 停止自动房间维护');
            clearInterval(maintenanceInterval);
        };
    }
}

export const onlineGameService = new OnlineGameService();