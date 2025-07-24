import React, { useState, useEffect } from 'react';
import { onlineGameService, OnlineRoom, RoomStatus, OnlinePlayer } from '../services/OnlineGameService';
import { useAuthStore } from '../store/authStore';
import { themeService } from '../services/ThemeService';
import { RoomMaintenancePanel } from './RoomMaintenancePanel';

interface AppwriteOnlineGameProps {
  onBack: () => void;
  onGameStart?: (room: OnlineRoom) => void;
}

export const AppwriteOnlineGame: React.FC<AppwriteOnlineGameProps> = ({ onBack, onGameStart }) => {
  const { user, isAuthenticated } = useAuthStore();
  const [currentRoom, setCurrentRoom] = useState<OnlineRoom | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [roomList, setRoomList] = useState<OnlineRoom[]>([]);
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(themeService.getCurrentTheme());
  const [showMaintenance, setShowMaintenance] = useState(false);

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

  // 初始化时加载房间列表
  useEffect(() => {
    if (isAuthenticated) {
      loadRoomList();
    }
  }, [isAuthenticated]);

  // 设置事件监听器
  useEffect(() => {
    const handleRoomCreated = (room: OnlineRoom) => {
      setCurrentRoom(room);
      setCurrentRoomId(room.$id || null);
      setError('');
    };

    const handleRoomJoined = (room: OnlineRoom) => {
      setCurrentRoom(room);
      setCurrentRoomId(room.$id || null);
      setError('');
    };

    const handleRoomLeft = () => {
      setCurrentRoom(null);
      setCurrentRoomId(null);
      setIsReady(false);
      loadRoomList();
    };

    const handlePlayerReadyUpdate = (room: OnlineRoom) => {
      setCurrentRoom(room);
      // roomId 不变，只更新房间内容
    };

    const handleGameStarted = (room: OnlineRoom) => {
      console.log('🎮 游戏开始事件触发:', room);
      setCurrentRoom(room);
      // roomId 不变，只更新房间内容
      if (onGameStart) {
        onGameStart(room);
      }
    };

    const handleRoomUpdated = (room: OnlineRoom) => {
      console.log('🔄 房间状态更新:', room.status, room);
      setCurrentRoom(room);
      // roomId 不变，只更新房间内容
    };

    onlineGameService.addEventListener('room-created', handleRoomCreated);
    onlineGameService.addEventListener('room-joined', handleRoomJoined);
    onlineGameService.addEventListener('room-left', handleRoomLeft);
    onlineGameService.addEventListener('player-ready-update', handlePlayerReadyUpdate);
    onlineGameService.addEventListener('game-started', handleGameStarted);
    onlineGameService.addEventListener('room-updated', handleRoomUpdated);

    return () => {
      onlineGameService.removeEventListener('room-created', handleRoomCreated);
      onlineGameService.removeEventListener('room-joined', handleRoomJoined);
      onlineGameService.removeEventListener('room-left', handleRoomLeft);
      onlineGameService.removeEventListener('player-ready-update', handlePlayerReadyUpdate);
      onlineGameService.removeEventListener('game-started', handleGameStarted);
      onlineGameService.removeEventListener('room-updated', handleRoomUpdated);
    };
  }, [onGameStart]);

  // 订阅房间更新 - 使用独立的 roomId 状态避免因 room 对象更新而重新订阅
  useEffect(() => {
    if (currentRoomId) {
      console.log('🔔 创建新的房间轮询:', currentRoomId);
      const unsubscribe = onlineGameService.subscribeToRoom(currentRoomId);
      return () => {
        console.log('🧹 清理房间轮询:', currentRoomId);
        unsubscribe();
      };
    }
  }, [currentRoomId]); // 只有当房间ID真正改变时才重新创建轮询

  const loadRoomList = async () => {
    try {
      const rooms = await onlineGameService.getRoomList();
      setRoomList(rooms);
    } catch (error: any) {
      console.error('加载房间列表失败:', error);
      setError(error.message || '加载房间列表失败');
    }
  };

  const handleCreateRoom = async () => {
    setIsLoading(true);
    setError('');
    try {
      await onlineGameService.createRoom();
    } catch (error: any) {
      setError(error.message || '创建房间失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (targetRoomCode?: string) => {
    const finalRoomCode = targetRoomCode || roomCode;
    if (!finalRoomCode.trim()) {
      setError('请输入房间代码');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await onlineGameService.joinRoom(finalRoomCode);
    } catch (error: any) {
      setError(error.message || '加入房间失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    setIsLoading(true);
    try {
      await onlineGameService.leaveRoom();
    } catch (error: any) {
      console.error('离开房间失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReadyToggle = async () => {
    const newReady = !isReady;
    setIsLoading(true);
    try {
      await onlineGameService.setReady(newReady);
      setIsReady(newReady);
    } catch (error: any) {
      setError(error.message || '设置准备状态失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 如果用户未登录
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center gap-6 p-8">
        <div className={`${currentTheme.uiBackgroundClass} rounded-2xl shadow-xl p-8 border-2 max-w-md w-full`}>
          <div className="text-center mb-6">
            <h2 className={`text-2xl font-bold ${currentTheme.headingColorClass} mb-2`}>在线联机</h2>
            <p className={`${currentTheme.accentColorClass}`}>请先登录以使用在线联机功能</p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          返回
        </button>
      </div>
    );
  }

  // 如果已经在房间中
  if (currentRoom) {
    const myPlayer = currentRoom.players.find(p => p.user_id === user?.$id);
    const isMyTurn = currentRoom.status === RoomStatus.PLAYING && 
                     myPlayer?.color === currentRoom.current_player;

    return (
      <div className="flex flex-col items-center gap-6 p-8">
        <div className={`${currentTheme.uiBackgroundClass} rounded-2xl shadow-xl p-6 border-2 max-w-2xl w-full`}>
          <div className="text-center mb-6">
            <h2 className={`text-2xl font-bold ${currentTheme.headingColorClass} mb-2`}>
              房间: {currentRoom.room_code}
            </h2>
            <p className={`${currentTheme.accentColorClass}`}>
              {currentRoom.status === RoomStatus.WAITING && '等待玩家准备'}
              {currentRoom.status === RoomStatus.PLAYING && '游戏进行中'}
              {currentRoom.status === RoomStatus.FINISHED && '游戏已结束'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {currentRoom.players.map((player) => (
              <div
                key={player.user_id}
                className={`p-4 rounded-lg border-2 ${
                  player.user_id === user?.$id 
                    ? 'border-amber-500 bg-amber-50' 
                    : 'border-gray-300 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${
                      player.color === 1 ? 'bg-black' : 'bg-white border border-gray-400'
                    }`}></div>
                    <span className="font-medium">{player.username}</span>
                    {player.user_id === user?.$id && (
                      <span className="text-xs bg-amber-200 px-2 py-1 rounded">您</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      player.ready ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {player.ready ? '已准备' : '未准备'}
                    </span>
                    {currentRoom.status === RoomStatus.PLAYING && 
                     currentRoom.current_player === player.color && (
                      <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                        当前回合
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-4">
            {currentRoom.status === RoomStatus.WAITING && myPlayer && (
              <button
                onClick={handleReadyToggle}
                disabled={isLoading}
                className={`px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  isReady
                    ? 'bg-gray-500 text-white hover:bg-gray-600'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {isReady ? '取消准备' : '准备'}
              </button>
            )}
            
            <button
              onClick={handleLeaveRoom}
              disabled={isLoading}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              离开房间
            </button>
          </div>

          {currentRoom.status === RoomStatus.PLAYING && (
            <div className="mt-4 text-center">
              <p className="text-amber-700">
                游戏已开始！{isMyTurn ? '轮到您了' : '等待对手'}
              </p>
            </div>
          )}

          {currentRoom.status === RoomStatus.FINISHED && (
            <div className="mt-4 text-center">
              <p className="text-lg font-semibold">
                {currentRoom.winner 
                  ? `${currentRoom.winner === 1 ? '黑子' : '白子'}获胜！`
                  : '平局！'
                }
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 房间列表界面
  return (
    <div className="flex flex-col items-center gap-6 p-8">
      <div className={`${currentTheme.uiBackgroundClass} rounded-2xl shadow-xl p-6 border-2 max-w-2xl w-full`}>
        <div className="text-center mb-6">
          <h2 className={`text-2xl font-bold ${currentTheme.headingColorClass} mb-2`}>在线联机</h2>
          <p className={`${currentTheme.accentColorClass}`}>欢迎，{user?.name || user?.email}！</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <h3 className={`text-lg font-semibold ${currentTheme.headingColorClass} mb-3`}>创建房间</h3>
            <button
              onClick={handleCreateRoom}
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50"
            >
              {isLoading ? '创建中...' : '创建新房间'}
            </button>
          </div>

          <div>
            <h3 className={`text-lg font-semibold ${currentTheme.headingColorClass} mb-3`}>加入房间</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className={`flex-1 px-3 py-2 border ${currentTheme.boardBorderColor} rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${currentTheme.isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-800'}`}
                placeholder="房间代码"
                maxLength={6}
                disabled={isLoading}
              />
              <button
                onClick={() => handleJoinRoom()}
                disabled={isLoading}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-lg shadow-lg hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50"
              >
                加入
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className={`text-lg font-semibold ${currentTheme.headingColorClass}`}>房间列表</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowMaintenance(true)}
                className="px-3 py-1 bg-orange-200 text-orange-800 rounded hover:bg-orange-300 transition-colors"
                title="房间维护"
              >
                🔧 维护
              </button>
              <button
                onClick={loadRoomList}
                disabled={isLoading}
                className="px-3 py-1 bg-amber-200 text-amber-800 rounded hover:bg-amber-300 transition-colors disabled:opacity-50"
              >
                刷新
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {roomList.length === 0 ? (
              <div className={`text-center py-8 ${currentTheme.subTextColorClass}`}>
                暂无房间，创建一个新房间开始游戏吧！
              </div>
            ) : (
              roomList.map((room) => (
                <div
                  key={room.$id}
                  className={`flex items-center justify-between p-3 ${currentTheme.isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg border`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-medium ${currentTheme.textColorClass}`}>
                      房间 {room.room_code}
                    </span>
                    <span className={`text-sm ${currentTheme.subTextColorClass}`}>
                      {room.players.length}/{room.max_players} 玩家
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      room.status === RoomStatus.PLAYING ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'
                    }`}>
                      {room.status === RoomStatus.PLAYING ? '游戏中' : '等待中'}
                    </span>
                    <span className={`text-xs ${currentTheme.subTextColorClass}`}>
                      主机: {room.host_name}
                    </span>
                  </div>
                  <button
                    onClick={() => handleJoinRoom(room.room_code)}
                    disabled={isLoading || room.players.length >= room.max_players}
                    className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {room.players.length >= room.max_players ? '已满' : '加入'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
      </div>

      <button
        onClick={onBack}
        className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
      >
        返回
      </button>
      
      {showMaintenance && (
        <RoomMaintenancePanel onClose={() => setShowMaintenance(false)} />
      )}
    </div>
  );
};
