import React, { useEffect, useState, useCallback } from 'react';
import { OnlineRoom, onlineGameService } from '../services/OnlineGameService';
import { useAuthStore } from '../store/authStore';
import { themeService } from '../services/ThemeService';
import { audioService } from '../services/AudioService';
import { BoardCanvas } from './BoardCanvas';

const BOARD_SIZE = 15;

interface AppwriteOnlineGameBoardProps {
  room: OnlineRoom;
  onGameEnd?: (winner: 1 | 2 | null) => void;
}

export const AppwriteOnlineGameBoard: React.FC<AppwriteOnlineGameBoardProps> = ({ 
  room, 
  onGameEnd 
}) => {
  const [currentTheme, setCurrentTheme] = useState(themeService.getCurrentTheme());
  const [previewPosition, setPreviewPosition] = useState<{row: number, col: number} | null>(null);
  const [currentRoom, setCurrentRoom] = useState<OnlineRoom>(room);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuthStore();

  // 获取当前玩家的颜色
  const myPlayer = currentRoom?.players?.find(p => p.user_id === user?.$id);
  const myColor = myPlayer?.color;
  const isMyTurn = currentRoom?.current_player === myColor && currentRoom?.status === 'playing';

  // 监听主题变化
  useEffect(() => {
    const handleThemeChange = (theme: any) => {
      setCurrentTheme(theme);
    };

    themeService.addListener(handleThemeChange);
    
    return () => {
      themeService.removeListener(handleThemeChange);
    };
  }, []);

  // 监听房间状态更新
  useEffect(() => {
    // 当 room prop 发生变化时，更新内部状态
    console.log('📋 AppwriteOnlineGameBoard room prop 更新:', {
      roomCode: room?.room_code,
      status: room?.status,
      currentPlayer: room?.current_player,
      boardHasData: room?.board?.some(row => row.some(cell => cell !== 0)) || false
    });
    setCurrentRoom(room);
  }, [room]);

  useEffect(() => {
    const handleRoomUpdated = (updatedRoom: OnlineRoom) => {
      console.log('📋 AppwriteOnlineGameBoard 收到房间更新:', {
        status: updatedRoom.status,
        currentPlayer: updatedRoom.current_player,
        boardHasData: updatedRoom.board?.some(row => row.some(cell => cell !== 0)) || false,
        winner: updatedRoom.winner,
        boardExists: !!updatedRoom.board
      });
      
      setCurrentRoom(updatedRoom);
      
      // 检查游戏是否结束 - 只有当winner不是null且不是undefined时才触发
      if (updatedRoom.winner && onGameEnd) {
        onGameEnd(updatedRoom.winner);
      }
    };

    const handleMoveEvent = (eventData: { room: OnlineRoom; row: number; col: number; player: number }) => {
      console.log('📋 AppwriteOnlineGameBoard 收到棋子移动:', {
        status: eventData.room.status,
        currentPlayer: eventData.room.current_player,
        boardHasData: eventData.room.board?.some(row => row.some(cell => cell !== 0)) || false,
        winner: eventData.room.winner,
        move: { row: eventData.row, col: eventData.col, player: eventData.player }
      });
      
      setCurrentRoom(eventData.room);
      
      // 检查游戏是否结束
      if (eventData.room.winner && onGameEnd) {
        onGameEnd(eventData.room.winner);
      }
    };

    onlineGameService.addEventListener('room-updated', handleRoomUpdated);
    onlineGameService.addEventListener('game-started', handleRoomUpdated);
    onlineGameService.addEventListener('move-made', handleMoveEvent);

    return () => {
      onlineGameService.removeEventListener('room-updated', handleRoomUpdated);
      onlineGameService.removeEventListener('game-started', handleRoomUpdated);
      onlineGameService.removeEventListener('move-made', handleMoveEvent);
    };
  }, [onGameEnd]);

  // 处理棋盘点击
  const handleCellClick = useCallback(async (row: number, col: number) => {
    if (!isMyTurn || currentRoom?.status !== 'playing' || isLoading) {
      return;
    }

    if (currentRoom?.board?.[row]?.[col] === 0) {
      try {
        setIsLoading(true);
        setError(null);
        await onlineGameService.makeMove(row, col);
        audioService.playSound('place-stone');
      } catch (error) {
        console.error('下棋失败:', error);
        setError(error instanceof Error ? error.message : '下棋失败');
      } finally {
        setIsLoading(false);
      }
    }
  }, [isMyTurn, currentRoom, isLoading]);

  // 处理棋盘悬停
  const handleCellHover = useCallback((row: number, col: number) => {
    if (isMyTurn && currentRoom?.status === 'playing' && currentRoom?.board?.[row]?.[col] === 0) {
      setPreviewPosition({ row, col });
    }
  }, [isMyTurn, currentRoom]);

  // 处理鼠标离开
  const handleCellLeave = useCallback(() => {
    setPreviewPosition(null);
  }, []);

  // 安全获取棋盘数据
  const safeBoard = currentRoom?.board || Array(15).fill(null).map(() => Array(15).fill(0));
  const safeBoardHasData = safeBoard.some(row => row.some(cell => cell !== 0));

  return (
    <div className="w-full h-full flex flex-col items-center gap-4 p-4">
      {/* 错误提示 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* 游戏状态信息 */}
      <div className={`${currentTheme.uiBackgroundClass} rounded-lg px-6 py-3 border-2 shadow-lg`}>
        <div className="text-center">
          {currentRoom?.status === 'playing' ? (
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${currentRoom.current_player === 1 ? 'bg-black' : 'bg-white border border-gray-400'}`}></div>
              <span className={`font-semibold ${currentTheme.textColorClass} text-lg`}>
                {isLoading ? '⏳ 下棋中...' : (isMyTurn ? '🎯 轮到您了！' : '⏱️ 等待对手...')}
              </span>
            </div>
          ) : currentRoom?.status === 'finished' ? (
            <span className={`font-semibold ${currentTheme.textColorClass} text-lg`}>
              🎉 {currentRoom.winner 
                ? `${currentRoom.winner === 1 ? '黑子' : '白子'}获胜！`
                : '平局！'
              }
            </span>
          ) : (
            <span className={`font-medium ${currentTheme.textColorClass}`}>
              ⏳ {currentRoom ? '等待游戏开始...' : '连接中...'}
            </span>
          )}
        </div>
      </div>

      {/* 棋盘容器 */}
      <div className="flex-1 flex items-center justify-center w-full">
        <BoardCanvas
          board={safeBoard}
          onCellClick={handleCellClick}
          onCellHover={handleCellHover}
          onCellLeave={handleCellLeave}
          previewPosition={previewPosition}
          previewStoneType={myColor}
          disabled={!isMyTurn || currentRoom?.status !== 'playing' || isLoading}
          className="bg-white rounded-lg shadow-lg"
          style={{ 
            minWidth: '500px',
            minHeight: '500px',
            maxWidth: '80vw',
            maxHeight: '70vh',
            aspectRatio: '1 / 1'
          }}
        />
      </div>

      {/* 游戏提示 */}
      {!isMyTurn && currentRoom?.status === 'playing' && !isLoading && (
        <div className={`${currentTheme.uiBackgroundClass} rounded-lg px-4 py-2 border shadow`}>
          <p className={`text-sm ${currentTheme.subTextColorClass} flex items-center gap-2`}>
            <span className="animate-pulse">⏳</span>
            等待对手下棋...
          </p>
        </div>
      )}

      {/* 调试信息 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 mt-2">
          房间状态: {currentRoom?.status || 'undefined'} | 
          棋盘数据: {safeBoardHasData ? '有数据' : '空白'} | 
          我的回合: {isMyTurn ? '是' : '否'} | 
          加载中: {isLoading ? '是' : '否'}
        </div>
      )}
    </div>
  );
};
