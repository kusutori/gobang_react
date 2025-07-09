import React, { useState, useEffect } from 'react';
import { socketService, SOCKET_EVENTS, RoomData } from '../services/SocketService';
import { themeService } from '../services/ThemeService';

interface OnlineGameProps {
  onBack: () => void;
  onGameStart?: (room: RoomData) => void;
}

export const OnlineGame: React.FC<OnlineGameProps> = ({ onBack, onGameStart }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [currentRoom, setCurrentRoom] = useState<RoomData | null>(null);
  const [roomList, setRoomList] = useState<Array<{id: string, playerCount: number, gameStarted: boolean}>>([]);
  const [error, setError] = useState<string>('');
  const [isReady, setIsReady] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(themeService.getCurrentTheme());

  useEffect(() => {
    // 设置Socket事件监听器
    socketService.on(SOCKET_EVENTS.ROOM_CREATED, (data: { roomId: string, room: RoomData }) => {
      setCurrentRoom(data.room);
      setRoomId(data.roomId);
      setError('');
    });

    socketService.on(SOCKET_EVENTS.ROOM_JOINED, (data: { roomId: string, room: RoomData }) => {
      setCurrentRoom(data.room);
      setError('');
    });

    socketService.on(SOCKET_EVENTS.PLAYER_JOINED, (data: { playerId: string, playerName: string, room: RoomData }) => {
      setCurrentRoom(data.room);
    });

    socketService.on(SOCKET_EVENTS.PLAYER_LEFT, (data: { playerId: string }) => {
      // 刷新房间状态
      if (currentRoom) {
        const updatedRoom = { ...currentRoom };
        delete updatedRoom.players[data.playerId];
        setCurrentRoom(updatedRoom);
      }
    });

    socketService.on(SOCKET_EVENTS.PLAYER_READY_UPDATE, (data: { playerId: string, ready: boolean, room: RoomData }) => {
      setCurrentRoom(data.room);
      console.log('Player ready update:', data.room.gameStarted);
    });

    socketService.on(SOCKET_EVENTS.GAME_STARTED, (data: { room: RoomData }) => {
      console.log('Game started event received:', data.room);
      setCurrentRoom(data.room);
      if (onGameStart) {
        onGameStart(data.room);
      }
    });

    socketService.on(SOCKET_EVENTS.ROOM_LIST, (data: { rooms: Array<{id: string, playerCount: number, gameStarted: boolean}> }) => {
      setRoomList(data.rooms);
    });

    socketService.on(SOCKET_EVENTS.ERROR, (data: { message: string }) => {
      setError(data.message);
    });

    // 组件卸载时清理监听器
    return () => {
      socketService.off(SOCKET_EVENTS.ROOM_CREATED);
      socketService.off(SOCKET_EVENTS.ROOM_JOINED);
      socketService.off(SOCKET_EVENTS.PLAYER_JOINED);
      socketService.off(SOCKET_EVENTS.PLAYER_LEFT);
      socketService.off(SOCKET_EVENTS.PLAYER_READY_UPDATE);
      socketService.off(SOCKET_EVENTS.GAME_STARTED);
      socketService.off(SOCKET_EVENTS.ROOM_LIST);
      socketService.off(SOCKET_EVENTS.ERROR);
    };
  }, [currentRoom, onGameStart]);

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

  const handleConnect = async () => {
    if (!playerName.trim()) {
      setError('请输入玩家名称');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      await socketService.connect();
      setIsConnected(true);
      socketService.getRoomList();
    } catch (error) {
      setError('连接服务器失败');
      console.error('连接失败:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      setError('请输入玩家名称');
      return;
    }
    socketService.createRoom(playerName);
  };

  const handleJoinRoom = (targetRoomId?: string) => {
    const finalRoomId = targetRoomId || roomId;
    if (!finalRoomId.trim()) {
      setError('请输入房间ID');
      return;
    }
    if (!playerName.trim()) {
      setError('请输入玩家名称');
      return;
    }
    socketService.joinRoom(finalRoomId, playerName);
  };

  const handleLeaveRoom = () => {
    socketService.leaveRoom();
    setCurrentRoom(null);
    setRoomId('');
    setIsReady(false);
    socketService.getRoomList();
  };

  const handleReadyToggle = () => {
    const newReady = !isReady;
    setIsReady(newReady);
    socketService.setPlayerReady(newReady);
  };

  const handleDisconnect = () => {
    socketService.disconnect();
    setIsConnected(false);
    setCurrentRoom(null);
    setRoomId('');
    setIsReady(false);
    setRoomList([]);
  };

  const refreshRoomList = () => {
    socketService.getRoomList();
  };

  // 如果还没连接到服务器
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center gap-6 p-8">
        <div className={`${currentTheme.uiBackgroundClass} rounded-2xl shadow-xl p-8 border-2 max-w-md w-full`}>
          <div className="text-center mb-6">
            <h2 className={`text-2xl font-bold ${currentTheme.headingColorClass} mb-2`}>联机对战</h2>
            <p className={`${currentTheme.accentColorClass}`}>连接到服务器开始联机游戏</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${currentTheme.textColorClass} mb-2`}>
                玩家名称
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className={`w-full px-4 py-2 border ${currentTheme.boardBorderColor} rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${currentTheme.isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-800'}`}
                placeholder="输入您的名称"
                maxLength={20}
              />
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg shadow-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isConnecting ? '连接中...' : '连接服务器'}
            </button>
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
    const mySocketId = socketService.getSocketId();
    const isMyTurn = currentRoom.gameStarted && currentRoom.players[mySocketId!]?.player === currentRoom.currentPlayer;
    const playerEntries = Object.entries(currentRoom.players);
    const myPlayer = mySocketId ? currentRoom.players[mySocketId] : null;

    return (
      <div className="flex flex-col items-center gap-6 p-8">
        <div className={`${currentTheme.uiBackgroundClass} rounded-2xl shadow-xl p-6 border-2 max-w-2xl w-full`}>
          <div className="text-center mb-6">
            <h2 className={`text-2xl font-bold ${currentTheme.headingColorClass} mb-2`}>
              房间: {currentRoom.id}
            </h2>
            <p className={`${currentTheme.accentColorClass}`}>
              {currentRoom.gameStarted ? '游戏进行中' : '等待玩家准备'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {playerEntries.map(([socketId, player]) => (
              <div
                key={socketId}
                className={`p-4 rounded-lg border-2 ${
                  socketId === mySocketId ? 'border-amber-500 bg-amber-50' : 'border-gray-300 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${
                      player.player === 1 ? 'bg-black' : 'bg-white border border-gray-400'
                    }`}></div>
                    <span className="font-medium">{player.name}</span>
                    {socketId === mySocketId && (
                      <span className="text-xs bg-amber-200 px-2 py-1 rounded">您</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      player.ready ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {player.ready ? '已准备' : '未准备'}
                    </span>
                    {currentRoom.gameStarted && currentRoom.currentPlayer === player.player && (
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
            {!currentRoom.gameStarted && myPlayer && (
              <button
                onClick={handleReadyToggle}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
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
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              离开房间
            </button>
          </div>

          {currentRoom.gameStarted && (
            <div className="mt-4 text-center">
              <p className="text-amber-700">
                游戏已开始！{isMyTurn ? '轮到您了' : '等待对手'}
              </p>
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
          <h2 className={`text-2xl font-bold ${currentTheme.headingColorClass} mb-2`}>联机大厅</h2>
          <p className={`${currentTheme.accentColorClass}`}>欢迎，{playerName}！</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <h3 className={`text-lg font-semibold ${currentTheme.headingColorClass} mb-3`}>创建房间</h3>
            <button
              onClick={handleCreateRoom}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-600 transition-all"
            >
              创建新房间
            </button>
          </div>

          <div>
            <h3 className={`text-lg font-semibold ${currentTheme.headingColorClass} mb-3`}>加入房间</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                className={`flex-1 px-3 py-2 border ${currentTheme.boardBorderColor} rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${currentTheme.isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-800'}`}
                placeholder="房间ID"
                maxLength={6}
              />
              <button
                onClick={() => handleJoinRoom()}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-lg shadow-lg hover:from-blue-600 hover:to-cyan-600 transition-all"
              >
                加入
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className={`text-lg font-semibold ${currentTheme.headingColorClass}`}>房间列表</h3>
            <button
              onClick={refreshRoomList}
              className="px-3 py-1 bg-amber-200 text-amber-800 rounded hover:bg-amber-300 transition-colors"
            >
              刷新
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {roomList.length === 0 ? (
              <div className={`text-center py-8 ${currentTheme.subTextColorClass}`}>
                暂无房间，创建一个新房间开始游戏吧！
              </div>
            ) : (
              roomList.map((room) => (
                <div
                  key={room.id}
                  className={`flex items-center justify-between p-3 ${currentTheme.isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg border`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-medium ${currentTheme.textColorClass}`}>房间 {room.id}</span>
                    <span className={`text-sm ${currentTheme.subTextColorClass}`}>
                      {room.playerCount}/2 玩家
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      room.gameStarted ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'
                    }`}>
                      {room.gameStarted ? '游戏中' : '等待中'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={room.playerCount >= 2 && !room.gameStarted}
                    className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {room.playerCount >= 2 ? '观战' : '加入'}
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

      <div className="flex gap-4">
        <button
          onClick={handleDisconnect}
          className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          断开连接
        </button>
        <button
          onClick={onBack}
          className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          返回
        </button>
      </div>
    </div>
  );
};
