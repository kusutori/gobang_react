import React, { useState, useEffect } from 'react';
import { GameBoard } from "./components/GameBoard";
import { OnlineGame } from "./components/OnlineGame";
import { OnlineGameBoard } from "./components/OnlineGameBoard";
import { SettingsPanel } from "./components/SettingsPanel";
import { ThemeSelector } from "./components/ThemeSelector";
import { FullscreenButton } from "./components/FullscreenButton";
import { AudioControls } from "./components/AudioControls";
import { GameStatsPanel } from "./components/GameStatsPanel";
import { QuickGuide } from "./components/QuickGuide";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthDialog } from "./components/AuthDialog";
import { UserProfile } from "./components/UserProfile";
import { useKeyboardShortcuts, globalShortcuts } from "./hooks/useKeyboardShortcuts";
import { RoomData, socketService, SOCKET_EVENTS } from "./services/SocketService";
import { themeService } from "./services/ThemeService";
import { audioService } from "./services/AudioService";
import { useAuthStore } from "./store/authStore";
import "./index.css";

type GameMode = 'menu' | 'local' | 'online' | 'online-playing';

export function App() {
  const [gameMode, setGameMode] = useState<GameMode>('menu');
  const [currentRoom, setCurrentRoom] = useState<RoomData | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(themeService.getCurrentTheme());

  // 认证相关
  const { initialize, isAuthenticated, user } = useAuthStore();

  // 检查是否需要显示快速入门指南
  useEffect(() => {
    const guideShown = localStorage.getItem('gobang_guide_shown');
    if (!guideShown) {
      setShowGuide(true);
    }
  }, []);

  // 初始化认证状态
  useEffect(() => {
    initialize();
  }, [initialize]);

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

  // 初始化音频上下文
  useEffect(() => {
    const initAudio = async () => {
      try {
        await audioService.resumeAudioContext();
      } catch (error) {
        console.warn('Audio initialization failed:', error);
      }
    };

    // 用户首次交互时初始化音频
    const handleUserInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    return () => {
      document.removeEventListener('click', handleUserInteraction);
    };
  }, []);

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
    audioService.playSound('click');
  };

  const handleBackToOnline = () => {
    setGameMode('online');
    socketService.leaveRoom();
    setCurrentRoom(null);
    audioService.playSound('click');
  };

  const handleSettingsClick = () => {
    setShowSettings(true);
    audioService.playSound('click');
  };

  const handleGuideClick = () => {
    setShowGuide(true);
    audioService.playSound('click');
  };

  // 键盘快捷键
  useKeyboardShortcuts([
    {
      key: globalShortcuts.SETTINGS,
      action: handleSettingsClick,
      description: '打开设置'
    },
    {
      key: globalShortcuts.GUIDE,
      action: handleGuideClick,
      description: '打开快速入门'
    },
    {
      key: globalShortcuts.ESCAPE,
      action: () => {
        if (showSettings) setShowSettings(false);
        if (showGuide) setShowGuide(false);
      },
      description: '关闭弹窗'
    }
  ]);

  if (gameMode === 'menu') {
    return (
      <div className={`min-h-screen ${currentTheme.boardBackgroundClass}`}>
        <div className="container mx-auto px-4 py-8">
          {/* 顶部导航 */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <div className="text-3xl">{currentTheme.icon}</div>
              <span className="text-sm text-gray-600">{currentTheme.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {/* 账户相关按钮 */}
              {isAuthenticated && user ? (
                <button
                  onClick={() => setShowUserProfile(true)}
                  className="flex items-center gap-2 p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                  title="用户资料"
                >
                  <span className="text-lg">👤</span>
                  <span className="text-sm hidden md:inline">{user.name || user.email.split('@')[0]}</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowAuthDialog(true)}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                  title="登录/注册"
                >
                  🔐
                </button>
              )}
              <AudioControls />
              <FullscreenButton />
              <button
                onClick={handleGuideClick}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                title="快速入门"
              >
                📖
              </button>
              <button
                onClick={handleSettingsClick}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                title="设置"
              >
                ⚙️
              </button>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className={`text-5xl font-bold ${currentTheme.headingColorClass} mb-2 drop-shadow-lg`}>
              五子棋
            </h1>
            <p className={`${currentTheme.accentColorClass} text-lg font-medium`}>
              连续五子获胜 · 选择游戏模式
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-6">
            <div className={`${currentTheme.uiBackgroundClass} rounded-2xl shadow-xl p-8 border-2`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  onClick={() => {
                    setGameMode('local');
                    audioService.playSound('click');
                  }}
                  className="group p-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white 
                           font-semibold rounded-xl shadow-lg hover:from-amber-600 hover:to-orange-600 
                           transform hover:scale-105 transition-all duration-200 active:scale-95"
                >
                  <div className="text-2xl mb-2">🎮</div>
                  <div className="text-lg">本地游戏</div>
                  <div className="text-sm opacity-90">双人对战 / 人机对战</div>
                </button>

                <button
                  onClick={() => {
                    setGameMode('online');
                    audioService.playSound('click');
                  }}
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
        
        {showSettings && (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        )}
        
        {showGuide && (
          <QuickGuide onClose={() => setShowGuide(false)} />
        )}

        {showAuthDialog && (
          <AuthDialog 
            isOpen={showAuthDialog} 
            onClose={() => setShowAuthDialog(false)} 
          />
        )}

        {showUserProfile && (
          <UserProfile 
            isOpen={showUserProfile} 
            onClose={() => setShowUserProfile(false)} 
          />
        )}
      </div>
    );
  }

  if (gameMode === 'local') {
    return (
      <div className={`min-h-screen ${currentTheme.boardBackgroundClass}`}>
        {/* 横屏布局 */}
        <div className="h-screen flex landscape-layout">
          {/* 左侧控制面板 */}
          <div className="w-80 p-6 flex flex-col sidebar">
            {/* 顶部标题和控制 */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className={`text-3xl font-bold ${currentTheme.headingColorClass}`}>五子棋</h1>
                <p className={`${currentTheme.accentColorClass} text-sm`}>本地游戏</p>
              </div>
              <div className="flex items-center gap-2">
                <AudioControls />
                <FullscreenButton />
                <button
                  onClick={handleGuideClick}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                  title="快速入门"
                >
                  📖
                </button>
                <button
                  onClick={handleSettingsClick}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                >
                  ⚙️
                </button>
              </div>
            </div>

            {/* 主题选择器 */}
            <ThemeSelector />

            {/* 游戏信息区域 */}
            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className={`${currentTheme.uiBackgroundClass} rounded-xl p-4 border-2`}>
                <div className="text-center mb-4">
                  <div className="text-2xl mb-2">🎮</div>
                  <div className={`text-lg font-semibold ${currentTheme.headingColorClass}`}>游戏信息</div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className={`${currentTheme.subTextColorClass}`}>游戏模式</span>
                    <span className={`font-medium ${currentTheme.textColorClass}`}>本地对战</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`${currentTheme.subTextColorClass}`}>棋盘大小</span>
                    <span className={`font-medium ${currentTheme.textColorClass}`}>15×15</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`${currentTheme.subTextColorClass}`}>获胜条件</span>
                    <span className={`font-medium ${currentTheme.textColorClass}`}>五子连珠</span>
                  </div>
                </div>
              </div>
              
              {/* 游戏统计 */}
              <GameStatsPanel />
            </div>

            {/* 底部按钮 */}
            <div className="mt-6">
              <button
                onClick={handleBackToMenu}
                className="w-full py-3 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                返回主菜单
              </button>
            </div>
          </div>

          {/* 右侧游戏区域 - 自适应棋盘大小 */}
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full h-full max-w-[600px] max-h-[600px] aspect-square">
              <ErrorBoundary>
                <GameBoard />
              </ErrorBoundary>
            </div>
          </div>
        </div>
        
        {showSettings && (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        )}
        
        {showGuide && (
          <QuickGuide onClose={() => setShowGuide(false)} />
        )}

        {showAuthDialog && (
          <AuthDialog 
            isOpen={showAuthDialog} 
            onClose={() => setShowAuthDialog(false)} 
          />
        )}

        {showUserProfile && (
          <UserProfile 
            isOpen={showUserProfile} 
            onClose={() => setShowUserProfile(false)} 
          />
        )}
      </div>
    );
  }

  if (gameMode === 'online') {
    return (
      <div className={`min-h-screen ${currentTheme.boardBackgroundClass}`}>
        <div className="container mx-auto px-4 py-8">            <div className="flex justify-between items-center mb-8">
              <div className="text-center">
                <h1 className={`text-5xl font-bold ${currentTheme.headingColorClass} mb-2 drop-shadow-lg`}>
                  五子棋
                </h1>
                <p className={`${currentTheme.accentColorClass} text-lg font-medium`}>
                  连续五子获胜 · 联机对战
                </p>
              </div>
              <div className="flex items-center gap-2">
                <AudioControls />
                <FullscreenButton />
                <button
                  onClick={handleSettingsClick}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                >
                  ⚙️
                </button>
              </div>
            </div>
          
          <OnlineGame 
            onBack={handleBackToMenu}
            onGameStart={(room) => {
              setCurrentRoom(room);
              setGameMode('online-playing');
            }}
          />
        </div>
        
        {showSettings && (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        )}
        
        {showGuide && (
          <QuickGuide onClose={() => setShowGuide(false)} />
        )}

        {showAuthDialog && (
          <AuthDialog 
            isOpen={showAuthDialog} 
            onClose={() => setShowAuthDialog(false)} 
          />
        )}

        {showUserProfile && (
          <UserProfile 
            isOpen={showUserProfile} 
            onClose={() => setShowUserProfile(false)} 
          />
        )}
      </div>
    );
  }

  if (gameMode === 'online-playing' && currentRoom) {
    return (
      <div className={`min-h-screen ${currentTheme.boardBackgroundClass}`}>
        <div className="h-screen flex landscape-layout">
          {/* 左侧控制面板 */}
          <div className="w-80 p-6 flex flex-col sidebar">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-amber-800">五子棋</h1>
                <p className="text-amber-700 text-sm">联机对战 · 房间 {currentRoom.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <AudioControls />
                <FullscreenButton />
                <button
                  onClick={handleGuideClick}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                  title="快速入门"
                >
                  📖
                </button>
                <button
                  onClick={handleSettingsClick}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                >
                  ⚙️
                </button>
              </div>
            </div>

            {/* 房间信息 */}
            <div className={`${currentTheme.uiBackgroundClass} rounded-xl p-4 mb-6 border-2`}>
              <h3 className={`text-lg font-semibold ${currentTheme.headingColorClass} mb-3`}>🏠 房间信息</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className={`${currentTheme.subTextColorClass}`}>房间号</span>
                  <span className={`font-medium ${currentTheme.textColorClass}`}>{currentRoom.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`${currentTheme.subTextColorClass}`}>玩家数</span>
                  <span className={`font-medium ${currentTheme.textColorClass}`}>{Object.keys(currentRoom.players).length}/2</span>
                </div>
                <div className="flex justify-between">
                  <span className={`${currentTheme.subTextColorClass}`}>游戏状态</span>
                  <span className={`font-medium ${currentTheme.textColorClass}`}>
                    {currentRoom.gameOver ? '已结束' : 
                     currentRoom.gameStarted ? '游戏中' : '等待中'}
                  </span>
                </div>
              </div>
            </div>

            {/* 玩家列表 */}
            <div className={`${currentTheme.uiBackgroundClass} rounded-xl p-4 mb-6 border-2`}>
              <h3 className={`text-lg font-semibold ${currentTheme.headingColorClass} mb-3`}>👥 玩家列表</h3>
              <div className="space-y-2">
                {Object.values(currentRoom.players).map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${index === 0 ? 'bg-black' : 'bg-white border'}`}></div>
                      <span className={`${currentTheme.textColorClass}`}>{player.name}</span>
                    </div>
                    <span className={`text-sm ${player.ready ? 'text-green-600' : currentTheme.subTextColorClass}`}>
                      {player.ready ? '准备' : '未准备'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1"></div>

            <button
              onClick={handleBackToOnline}
              className="w-full py-3 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              返回大厅
            </button>
          </div>

          {/* 右侧游戏区域 */}
          <div className="flex-1 flex items-center justify-center p-6 game-area">
            <OnlineGameBoard room={currentRoom} />
          </div>
        </div>
        
        {showSettings && (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        )}
        
        {showGuide && (
          <QuickGuide onClose={() => setShowGuide(false)} />
        )}

        {showAuthDialog && (
          <AuthDialog 
            isOpen={showAuthDialog} 
            onClose={() => setShowAuthDialog(false)} 
          />
        )}

        {showUserProfile && (
          <UserProfile 
            isOpen={showUserProfile} 
            onClose={() => setShowUserProfile(false)} 
          />
        )}
      </div>
    );
  }

  return null;
}

export default App;
