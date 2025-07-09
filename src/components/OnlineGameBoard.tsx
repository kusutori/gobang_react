import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from 'pixi.js';
import { socketService, SOCKET_EVENTS, RoomData } from '../services/SocketService';
import { themeService } from '../services/ThemeService';
import { audioService } from '../services/AudioService';

const BOARD_SIZE = 15;
const CELL_SIZE = 30;
const BOARD_WIDTH = BOARD_SIZE * CELL_SIZE;
const BOARD_HEIGHT = BOARD_SIZE * CELL_SIZE;
const BOARD_PADDING = 30; // 棋盘边距

interface OnlineGameBoardProps {
  room: RoomData;
}

export const OnlineGameBoard: React.FC<OnlineGameBoardProps> = ({ room }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const boardContainerRef = useRef<PIXI.Container | null>(null);
  const stonesContainerRef = useRef<PIXI.Container | null>(null);
  const [gameState, setGameState] = useState<RoomData>(room);
  const [currentTheme, setCurrentTheme] = useState(themeService.getCurrentTheme());
  const [pixiError, setPixiError] = useState<string | null>(null);
  
  // 使用 ref 来存储最新的回调，避免闭包问题
  const onBoardClickRef = useRef<((event: PIXI.FederatedPointerEvent) => void) | null>(null);

  const mySocketId = socketService.getSocketId();
  const myPlayer = mySocketId ? gameState.players[mySocketId] : null;
  const isMyTurn = gameState.gameStarted && !gameState.gameOver && myPlayer?.player === gameState.currentPlayer;

  // 监听主题变化
  useEffect(() => {
    const handleThemeChange = (theme: any) => {
      setCurrentTheme(theme);
      
      // 更新背景色和重绘棋盘
      if (appRef.current) {
        (appRef.current.renderer as any).backgroundColor = theme.backgroundColor;
        
        // 重绘棋盘以更新颜色
        if (boardContainerRef.current) {
          boardContainerRef.current.removeChildren();
          
          // 重新绘制棋盘网格
          const graphics = new PIXI.Graphics();
          
          // 绘制网格线
          graphics.lineStyle(Math.max(1, CELL_SIZE / 24), theme.gridColor, 0.8);
          
          for (let i = 0; i < BOARD_SIZE; i++) {
            // 垂直线
            graphics.moveTo(i * CELL_SIZE, 0);
            graphics.lineTo(i * CELL_SIZE, BOARD_HEIGHT - CELL_SIZE);
            
            // 水平线
            graphics.moveTo(0, i * CELL_SIZE);
            graphics.lineTo(BOARD_WIDTH - CELL_SIZE, i * CELL_SIZE);
          }

          // 绘制天元和星位
          const starPositions = [
            [3, 3], [3, 11], [11, 3], [11, 11], [7, 7]
          ];

          starPositions.forEach(([row, col]) => {
            graphics.beginFill(theme.starColor, 0.8);
            graphics.drawCircle(col * CELL_SIZE, row * CELL_SIZE, Math.max(2, CELL_SIZE / 8));
            graphics.endFill();
          });

          boardContainerRef.current.addChild(graphics);
        }
      }
    };

    themeService.addListener(handleThemeChange);
    
    // 监听页面可见性变化，防止后台标签页白屏
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏时暂停渲染
        if (appRef.current) {
          appRef.current.ticker.stop();
        }
      } else {
        // 页面显示时恢复渲染
        if (appRef.current) {
          appRef.current.ticker.start();
          // 强制重新渲染一次
          appRef.current.render();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      themeService.removeListener(handleThemeChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 监听游戏状态更新
  useEffect(() => {
    const handleMoveMade = (data: { room: RoomData }) => {
      setGameState(data.room);
    };

    const handleGameOver = (data: { room: RoomData }) => {
      setGameState(data.room);
    };

    const handleGameReset = (data: { room: RoomData }) => {
      setGameState(data.room);
    };

    socketService.on(SOCKET_EVENTS.MOVE_MADE, handleMoveMade);
    socketService.on(SOCKET_EVENTS.GAME_OVER, handleGameOver);
    socketService.on(SOCKET_EVENTS.GAME_RESET, handleGameReset);

    return () => {
      socketService.off(SOCKET_EVENTS.MOVE_MADE, handleMoveMade);
      socketService.off(SOCKET_EVENTS.GAME_OVER, handleGameOver);
      socketService.off(SOCKET_EVENTS.GAME_RESET, handleGameReset);
    };
  }, []);

  // 当外部传入的room更新时，同步到内部的gameState
  useEffect(() => {
    setGameState(room);
  }, [room]);

  // 将最新的 onBoardClick 回调存入 ref
  useEffect(() => {
    onBoardClickRef.current = (event: PIXI.FederatedPointerEvent) => {
      if (!isMyTurn) return;

      const pos = event.getLocalPosition(appRef.current!.stage);
      const col = Math.round((pos.x - 30) / CELL_SIZE);
      const row = Math.round((pos.y - 30) / CELL_SIZE);

      if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
        if (gameState.board[row][col] === 0) {
          socketService.makeMove(row, col);
        }
      }
    };
  }, [isMyTurn, gameState.board]);


  // 初始化 PixiJS，只运行一次
  useEffect(() => {
    if (!canvasRef.current || appRef.current) return;

    const app = new PIXI.Application();
    
    const initApp = async () => {
      try {
        setPixiError(null); // 清除之前的错误
        
        await app.init({
          width: BOARD_WIDTH + 60,
          height: BOARD_HEIGHT + 60,
          backgroundColor: currentTheme.backgroundColor,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
        });

        appRef.current = app;
        if (canvasRef.current) {
          canvasRef.current.innerHTML = ''; // 清空旧的canvas
          canvasRef.current.appendChild(app.canvas);
        }

        // 创建棋盘容器
        const boardContainer = new PIXI.Container();
        boardContainer.position.set(30, 30);
        boardContainerRef.current = boardContainer;
        app.stage.addChild(boardContainer);

        // 创建棋子容器
        const stonesContainer = new PIXI.Container();
        stonesContainer.position.set(30, 30);
        stonesContainerRef.current = stonesContainer;
        app.stage.addChild(stonesContainer);

        // 绘制棋盘
        drawBoard();

        // 设置一次性的事件监听器
        app.stage.interactive = true;
        app.stage.on('pointerdown', (event) => {
          if (onBoardClickRef.current) {
            onBoardClickRef.current(event);
          }
        });
        
        // 处理WebGL上下文丢失
        const canvas = app.canvas;
        const handleContextLost = (event: Event) => {
          event.preventDefault();
          console.warn('WebGL context lost, attempting to restore...');
          setPixiError('WebGL上下文丢失，正在尝试恢复...');
        };
        
        const handleContextRestored = () => {
          console.log('WebGL context restored');
          setPixiError(null);
          // 重建应用
          setTimeout(() => {
            if (appRef.current) {
              appRef.current.destroy(true);
              appRef.current = null;
            }
            requestAnimationFrame(() => {
              initApp();
            });
          }, 100);
        };
        
        canvas.addEventListener('webglcontextlost', handleContextLost);
        canvas.addEventListener('webglcontextrestored', handleContextRestored);
        
        // 在应用销毁时清理事件监听
        const originalDestroy = app.destroy;
        app.destroy = function(...args) {
          canvas.removeEventListener('webglcontextlost', handleContextLost);
          canvas.removeEventListener('webglcontextrestored', handleContextRestored);
          return originalDestroy.apply(this, args);
        };
      } catch (error) {
        console.error('Failed to initialize PixiJS:', error);
        setPixiError(error instanceof Error ? error.message : '初始化PixiJS失败');
      }
    };

    initApp();

    // 监听页面可见性变化，防止后台标签页白屏
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏时暂停渲染
        if (appRef.current) {
          appRef.current.ticker.stop();
        }
      } else {
        // 页面显示时恢复渲染
        if (appRef.current) {
          appRef.current.ticker.start();
          // 强制重新渲染一次
          appRef.current.render();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true });
        appRef.current = null;
      }
    };
  }, []);

  // 绘制棋盘网格
  const drawBoard = useCallback(() => {
    if (!boardContainerRef.current) return;

    boardContainerRef.current.removeChildren();
    
    const graphics = new PIXI.Graphics();
    
    // 绘制网格线
    graphics.lineStyle(Math.max(1, CELL_SIZE / 24), currentTheme.gridColor, 0.8);
    
    for (let i = 0; i < BOARD_SIZE; i++) {
      // 垂直线
      graphics.moveTo(i * CELL_SIZE, 0);
      graphics.lineTo(i * CELL_SIZE, BOARD_HEIGHT - CELL_SIZE);
      
      // 水平线
      graphics.moveTo(0, i * CELL_SIZE);
      graphics.lineTo(BOARD_WIDTH - CELL_SIZE, i * CELL_SIZE);
    }

    // 绘制天元和星位
    const starPositions = [
      [3, 3], [3, 11], [11, 3], [11, 11], [7, 7]
    ];

    starPositions.forEach(([row, col]) => {
      graphics.beginFill(currentTheme.starColor, 0.8);
      graphics.drawCircle(col * CELL_SIZE, row * CELL_SIZE, Math.max(2, CELL_SIZE / 8));
      graphics.endFill();
    });

    boardContainerRef.current.addChild(graphics);
  }, [currentTheme.gridColor, currentTheme.starColor]);
  
  // 更新背景色的函数
  const updateBackgroundColor = useCallback(() => {
    if (appRef.current) {
      // 使用类型断言来避免TypeScript错误
      (appRef.current.renderer as any).backgroundColor = currentTheme.backgroundColor;
    }
  }, [currentTheme.backgroundColor]);

  // 当主题变化时更新背景色而不重建应用
  useEffect(() => {
    if (appRef.current) {
      updateBackgroundColor();
      // 重绘棋盘以更新颜色
      drawBoard();
    }
  }, [currentTheme.id, updateBackgroundColor, drawBoard]);

  // 绘制棋子的函数
  const drawStone = useCallback((col: number, row: number, player: 1 | 2) => {
    if (!stonesContainerRef.current) return null;

    const graphics = new PIXI.Graphics();
    const radius = CELL_SIZE / 2 - 2;
    
    if (player === 1) {
      // 黑棋
      graphics.beginFill(0x1a1a1a);
      graphics.drawCircle(col * CELL_SIZE, row * CELL_SIZE, radius);
      graphics.endFill();
      
      // 高光效果
      graphics.beginFill(0x404040, 0.6);
      graphics.drawCircle(col * CELL_SIZE - radius/3, row * CELL_SIZE - radius/3, radius/4);
      graphics.endFill();
      
      // 外边框
      graphics.lineStyle(Math.max(1, CELL_SIZE / 32), 0x000000, 0.8);
      graphics.drawCircle(col * CELL_SIZE, row * CELL_SIZE, radius);
    } else {
      // 白棋
      graphics.beginFill(0xffffff);
      graphics.drawCircle(col * CELL_SIZE, row * CELL_SIZE, radius);
      graphics.endFill();
      
      // 阴影效果
      graphics.beginFill(0xe0e0e0, 0.4);
      graphics.drawCircle(col * CELL_SIZE + radius/4, row * CELL_SIZE + radius/4, radius/3);
      graphics.endFill();
      
      // 外边框
      graphics.lineStyle(Math.max(1, CELL_SIZE / 32), 0x666666, 0.8);
      graphics.drawCircle(col * CELL_SIZE, row * CELL_SIZE, radius);
    }

    // 添加位置标记方便后续查找
    (graphics as any).row = row;
    (graphics as any).col = col;
    
    return graphics;
  }, []);

  // 更新棋子显示 - 使用缓存优化性能
  const lastBoardRef = useRef<number[][]>([]);
  
  useEffect(() => {
    if (!stonesContainerRef.current || !appRef.current) return;
    
    // 第一次渲染时初始化lastBoardRef
    if (lastBoardRef.current.length === 0) {
      lastBoardRef.current = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));
      
      // 清除所有棋子
      stonesContainerRef.current.removeChildren();
      
      // 绘制所有棋子
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const cell = gameState.board[row][col];
          if (cell !== 0) {
            const graphics = drawStone(col, row, cell);
            if (graphics) {
              stonesContainerRef.current.addChild(graphics);
              lastBoardRef.current[row][col] = cell;
            }
          }
        }
      }
      return;
    }
    
    // 后续渲染只更新变化的部分
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const newValue = gameState.board[row][col];
        const oldValue = lastBoardRef.current[row][col];
        
        // 如果棋子状态有变化
        if (newValue !== oldValue) {
          // 记录新状态
          lastBoardRef.current[row][col] = newValue;
          
          // 找到此位置可能已有的棋子并移除
          const existingStones = stonesContainerRef.current.children.filter((child: any) => {
            return child.row === row && child.col === col;
          });
          
          existingStones.forEach(stone => {
            stonesContainerRef.current?.removeChild(stone);
          });
          
          // 如果新状态不为空，则添加新棋子
          if (newValue !== 0) {
            const graphics = drawStone(col, row, newValue);
            
            if (graphics) {
              // 添加落子动画效果
              graphics.scale.set(0.6);
              graphics.alpha = 0.7;
              
              stonesContainerRef.current.addChild(graphics);
              
              // 播放落子音效
              audioService.playSound('place_stone');
              
              // 使用PIXI.Ticker创建动画效果
              let animationProgress = 0;
              const animatePlacement = () => {
                animationProgress += 0.15;
                if (animationProgress >= 1) {
                  graphics.scale.set(1);
                  graphics.alpha = 1;
                  if (appRef.current) {
                    appRef.current.ticker.remove(animatePlacement);
                  }
                  return;
                }
                
                const easeOut = 1 - Math.pow(1 - animationProgress, 3); // 缓动函数
                graphics.scale.set(0.6 + 0.4 * easeOut);
                graphics.alpha = 0.7 + 0.3 * easeOut;
              };
              
              if (appRef.current) {
                appRef.current.ticker.add(animatePlacement);
              }
            }
          }
        }
      }
    }
  }, [gameState.board, drawStone]);

  const handleResetGame = () => {
    socketService.resetGame();
  };

  const getPlayerInfo = (playerNum: 1 | 2) => {
    const player = Object.values(gameState.players).find(p => p.player === playerNum);
    return player || null;
  };

  const player1 = getPlayerInfo(1);
  const player2 = getPlayerInfo(2);

  // 获取主题装饰角颜色
  const getThemeCornerColor = useCallback((theme: any) => {
    return theme.boardBorderColor.replace('border', 'bg');
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* 显示PixiJS错误信息 */}
      {pixiError && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg max-w-md">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600">⚠️</span>
            <span className="text-sm">{pixiError}</span>
          </div>
        </div>
      )}

      {/* 游戏状态面板 */}
      <div className={`${currentTheme.uiBackgroundClass} rounded-2xl shadow-xl p-6 border-2`}>
        <div className="flex items-center justify-between gap-8">
          <div className="text-center">
            <div className={`text-2xl font-bold ${currentTheme.headingColorClass} mb-2`}>
              {gameState.gameOver ? (
                gameState.winner === 1 ? `🎉 ${player1?.name || '黑棋'} 获胜！` : 
                gameState.winner === 2 ? `🎉 ${player2?.name || '白棋'} 获胜！` : '平局'
              ) : !gameState.gameStarted ? (
                '等待游戏开始'
              ) : (
                `当前回合`
              )}
            </div>
            {gameState.gameStarted && !gameState.gameOver && (
              <div className="flex items-center justify-center gap-2">
                <div className={`w-6 h-6 rounded-full border-2 ${
                  gameState.currentPlayer === 1 ? 'bg-black border-gray-600' : 'bg-white border-gray-400'
                }`}></div>
                <span className={`text-lg font-semibold ${currentTheme.textColorClass}`}>
                  {gameState.currentPlayer === 1 ? (player1?.name || '黑棋') : (player2?.name || '白棋')}
                </span>
                {isMyTurn && (
                  <span className="text-sm bg-green-200 text-green-800 px-2 py-1 rounded">
                    您的回合
                  </span>
                )}
              </div>
            )}
          </div>
          
          {gameState.gameOver && (
            <button
              onClick={handleResetGame}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white 
                       font-semibold rounded-xl shadow-lg hover:from-amber-600 hover:to-orange-600 
                       transform hover:scale-105 transition-all duration-200 active:scale-95"
            >
              重新开始
            </button>
          )}
        </div>
      </div>

      {/* 玩家信息面板 */}
      <div className="flex gap-4">
        <div className={`${currentTheme.uiBackgroundClass} rounded-lg shadow-lg p-4 border-2`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-black rounded-full border-2 border-gray-600"></div>
            <span className={`font-medium ${currentTheme.textColorClass}`}>
              {player1?.name || '等待玩家'}
            </span>
          </div>
          {player1 && (
            <div className={`text-sm ${currentTheme.subTextColorClass}`}>
              {gameState.gameStarted && gameState.currentPlayer === 1 && !gameState.gameOver && (
                <span className="text-blue-600 font-medium">当前回合</span>
              )}
              {myPlayer?.player === 1 && (
                <span className="text-green-600 font-medium">您</span>
              )}
            </div>
          )}
        </div>

        <div className={`${currentTheme.uiBackgroundClass} rounded-lg shadow-lg p-4 border-2`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-white rounded-full border-2 border-gray-400"></div>
            <span className={`font-medium ${currentTheme.textColorClass}`}>
              {player2?.name || '等待玩家'}
            </span>
          </div>
          {player2 && (
            <div className={`text-sm ${currentTheme.subTextColorClass}`}>
              {gameState.gameStarted && gameState.currentPlayer === 2 && !gameState.gameOver && (
                <span className="text-blue-600 font-medium">当前回合</span>
              )}
              {myPlayer?.player === 2 && (
                <span className="text-green-600 font-medium">您</span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* 棋盘容器 */}
      <div className="relative">
        <div 
          ref={canvasRef}
          className={`${currentTheme.boardBorderColor} border-4 rounded-2xl shadow-2xl ${
            !isMyTurn && gameState.gameStarted && !gameState.gameOver ? 'opacity-75' : ''
          }`}
          style={{ 
            width: BOARD_WIDTH + 60, 
            height: BOARD_HEIGHT + 60 
          }}
        />
        
        {/* 棋盘装饰角 */}
        {[
          { position: 'absolute -top-2 -left-2' },
          { position: 'absolute -top-2 -right-2' },
          { position: 'absolute -bottom-2 -left-2' },
          { position: 'absolute -bottom-2 -right-2' }
        ].map((corner, index) => (
          <div 
            key={index}
            className={`${corner.position} w-4 h-4 ${getThemeCornerColor(currentTheme)} rounded-full`}
          />
        ))}
      </div>
      
      {/* 提示信息 */}
      <div className={`text-center ${currentTheme.accentColorClass} ${currentTheme.isDark ? 'bg-gray-700/60' : 'bg-white/60'} px-4 py-2 rounded-lg`}>
        <p className="text-sm font-medium">
          {!gameState.gameStarted ? '等待所有玩家准备' :
           gameState.gameOver ? '游戏结束' :
           isMyTurn ? '💡 轮到您了，点击棋盘交叉点处落子' : 
           '⏳ 等待对手下棋'}
        </p>
      </div>
    </div>
  );
};
