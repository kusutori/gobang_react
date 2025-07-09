import React, { useState, useEffect } from 'react';
import { GameBoard } from "./components/GameBoard";
import { OnlineGame } from "./components/OnlineGame";
import { OnlineGameBoard } from "./components/OnlineGameBoard";
import { RoomData, socketService, SOCKET_EVENTS } from "./services/SocketService";
import "./index.css";

type GameMode = 'menu' | 'local' | 'online' | 'online-playing';

export function App() {
  const [gameMode, setGameMode] = useState<GameMode>('menu');
  const [currentRoom, setCurrentRoom] = useState<RoomData | null>(null);

  // 监听房间状态更新
  useEffect(() => {
    const handleRoomJoined = (data: { roomId: string, room: RoomData }) => {
      setCurrentRoom(data.room);
    };

    const handleRoomCreated = (data: { roomId: string, room: RoomData }) => {
      setCurrentRoom(data.room);
    };

    const handlePlayerJoined = (data: { playerId: string, playerName: string, room: RoomData }) => {
      setCurrentRoom(data.room);
    };

    const handlePlayerReadyUpdate = (data: { playerId: string, ready: boolean, room: RoomData }) => {
      setCurrentRoom(data.room);
    };

    const handleGameStarted = (data: { room: RoomData }) => {
      setCurrentRoom(data.room);
      if (gameMode === 'online') {
        setGameMode('online-playing');
      }
    };

    const handleMoveMade = (data: { row: number, col: number, player: 1 | 2, room: RoomData }) => {
      setCurrentRoom(data.room);
    };

    const handleGameOver = (data: { winner: 1 | 2 | null, room: RoomData }) => {
      setCurrentRoom(data.room);
    };

    const handleGameReset = (data: { room: RoomData }) => {
      setCurrentRoom(data.room);
    };

    const handlePlayerLeft = () => {
      // 当有玩家离开时，可能需要返回到在线大厅
      if (gameMode === 'online-playing') {
        setGameMode('online');
      }
    };

    // 注册事件监听器
    socketService.on(SOCKET_EVENTS.ROOM_JOINED, handleRoomJoined);
    socketService.on(SOCKET_EVENTS.ROOM_CREATED, handleRoomCreated);
    socketService.on(SOCKET_EVENTS.PLAYER_JOINED, handlePlayerJoined);
    socketService.on(SOCKET_EVENTS.PLAYER_READY_UPDATE, handlePlayerReadyUpdate);
    socketService.on(SOCKET_EVENTS.GAME_STARTED, handleGameStarted);
    socketService.on(SOCKET_EVENTS.MOVE_MADE, handleMoveMade);
    socketService.on(SOCKET_EVENTS.GAME_OVER, handleGameOver);
    socketService.on(SOCKET_EVENTS.GAME_RESET, handleGameReset);
    socketService.on(SOCKET_EVENTS.PLAYER_LEFT, handlePlayerLeft);

    return () => {
      // 清理事件监听器
      socketService.off(SOCKET_EVENTS.ROOM_JOINED, handleRoomJoined);
      socketService.off(SOCKET_EVENTS.ROOM_CREATED, handleRoomCreated);
      socketService.off(SOCKET_EVENTS.PLAYER_JOINED, handlePlayerJoined);
      socketService.off(SOCKET_EVENTS.PLAYER_READY_UPDATE, handlePlayerReadyUpdate);
      socketService.off(SOCKET_EVENTS.GAME_STARTED, handleGameStarted);
      socketService.off(SOCKET_EVENTS.MOVE_MADE, handleMoveMade);
      socketService.off(SOCKET_EVENTS.GAME_OVER, handleGameOver);
      socketService.off(SOCKET_EVENTS.GAME_RESET, handleGameReset);
      socketService.off(SOCKET_EVENTS.PLAYER_LEFT, handlePlayerLeft);
    };
  }, [gameMode]);

  const handleBackToMenu = () => {
    setGameMode('menu');
    setCurrentRoom(null);
    socketService.disconnect();
  };

  const handleBackToOnline = () => {
    setGameMode('online');
    socketService.leaveRoom();
    setCurrentRoom(null);
  };

  if (gameMode === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-amber-800 mb-2 drop-shadow-lg">
              五子棋
            </h1>
            <p className="text-amber-700 text-lg font-medium">
              连续五子获胜 · 选择游戏模式
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border-2 border-amber-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  onClick={() => setGameMode('local')}
                  className="group p-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white 
                           font-semibold rounded-xl shadow-lg hover:from-amber-600 hover:to-orange-600 
                           transform hover:scale-105 transition-all duration-200 active:scale-95"
                >
                  <div className="text-2xl mb-2">🎮</div>
                  <div className="text-lg">本地游戏</div>
                  <div className="text-sm opacity-90">双人对战 / 人机对战</div>
                </button>

                <button
                  onClick={() => setGameMode('online')}
                  className="group p-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white 
                           font-semibold rounded-xl shadow-lg hover:from-blue-600 hover:to-cyan-600 
                           transform hover:scale-105 transition-all duration-200 active:scale-95"
                >
                  <div className="text-2xl mb-2">🌐</div>
                  <div className="text-lg">联机对战</div>
                  <div className="text-sm opacity-90">局域网多人游戏</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameMode === 'local') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-amber-800 mb-2 drop-shadow-lg">
              五子棋
            </h1>
            <p className="text-amber-700 text-lg font-medium">
              连续五子获胜 · 本地游戏
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-6">
            <GameBoard />
            <button
              onClick={handleBackToMenu}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              返回主菜单
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameMode === 'online') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-amber-800 mb-2 drop-shadow-lg">
              五子棋
            </h1>
            <p className="text-amber-700 text-lg font-medium">
              连续五子获胜 · 联机对战
            </p>
          </div>
          
          <OnlineGame 
            onBack={handleBackToMenu}
            onGameStart={(room) => {
              setCurrentRoom(room);
              setGameMode('online-playing');
            }}
          />
        </div>
      </div>
    );
  }

  if (gameMode === 'online-playing' && currentRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-amber-800 mb-2 drop-shadow-lg">
              五子棋
            </h1>
            <p className="text-amber-700 text-lg font-medium">
              连续五子获胜 · 联机对战 · 房间 {currentRoom.id}
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-6">
            <OnlineGameBoard room={currentRoom} />
            <button
              onClick={handleBackToOnline}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              返回大厅
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default App;
