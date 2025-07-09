import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from 'pixi.js';
import { useGameStore } from '../store/gameStore';
import { AISettings } from './AISettings';
import { ErrorBoundary } from './ErrorBoundary';
import { themeService } from '../services/ThemeService';
import { audioService } from '../services/AudioService';
import { updateGameStats } from './GameStatsPanel';

const BOARD_SIZE = 15;
const MIN_CELL_SIZE = 24;
const MAX_CELL_SIZE = 40;
const BOARD_PADDING = 20;

export const GameBoard: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const boardContainerRef = useRef<PIXI.Container | null>(null);
  const stonesContainerRef = useRef<PIXI.Container | null>(null);
  const [showAISettings, setShowAISettings] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(themeService.getCurrentTheme());
  const [cellSize, setCellSize] = useState(MIN_CELL_SIZE);
  const [boardWidth, setBoardWidth] = useState(0);
  const [boardHeight, setBoardHeight] = useState(0);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const [pixiError, setPixiError] = useState<string | null>(null);
  
  const { board, currentPlayer, winner, gameOver, gameMode, isAIThinking, makeMove, resetGame, setGameMode } = useGameStore();

  // 获取主题装饰角颜色
  const getThemeCornerColor = useCallback((theme: any) => {
    switch (theme.id) {
      case 'modern': return 'bg-gray-600';
      case 'jade': return 'bg-emerald-600';
      case 'ocean': return 'bg-blue-600';
      case 'sunset': return 'bg-orange-600';
      case 'purple': return 'bg-purple-600';
      default: return 'bg-amber-800';
    }
  }, []);

  // 计算棋盘尺寸
  const calculateBoardSize = useCallback(() => {
    if (!canvasRef.current) return;
    
    const container = canvasRef.current.parentElement;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const availableWidth = containerRect.width - 40; // 留出边距
    const availableHeight = containerRect.height - 40;
    const availableSize = Math.min(availableWidth, availableHeight);
    
    // 计算最适合的格子大小
    const maxBoardSize = availableSize - BOARD_PADDING * 2;
    const calculatedCellSize = Math.floor(maxBoardSize / (BOARD_SIZE - 1));
    const finalCellSize = Math.min(MAX_CELL_SIZE, Math.max(MIN_CELL_SIZE, calculatedCellSize));
    
    const newBoardWidth = (BOARD_SIZE - 1) * finalCellSize;
    const newBoardHeight = (BOARD_SIZE - 1) * finalCellSize;
    const newCanvasWidth = newBoardWidth + BOARD_PADDING * 2;
    const newCanvasHeight = newBoardHeight + BOARD_PADDING * 2;
    
    setCellSize(finalCellSize);
    setBoardWidth(newBoardWidth);
    setBoardHeight(newBoardHeight);
    setCanvasWidth(newCanvasWidth);
    setCanvasHeight(newCanvasHeight);
  }, []);

  // 窗口大小变化时重新计算
  useEffect(() => {
    calculateBoardSize();
    
    const handleResize = () => {
      calculateBoardSize();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateBoardSize]);

  // 监听主题变化
  useEffect(() => {
    const handleThemeChange = (theme: any) => {
      setCurrentTheme(theme);
    };

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

    themeService.addListener(handleThemeChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      themeService.removeListener(handleThemeChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 重绘棋盘的函数
  const redrawBoard = useCallback(() => {
    if (!boardContainerRef.current) return;
    
    boardContainerRef.current.removeChildren();
    
    // 重新绘制棋盘网格
    const graphics = new PIXI.Graphics();
    
    // 绘制网格线
    graphics.lineStyle(Math.max(1, cellSize / 24), currentTheme.gridColor, 0.8);
    
    // 绘制15x15的网格线
    for (let i = 0; i < BOARD_SIZE; i++) {
      const pos = i * cellSize;
      
      // 垂直线
      graphics.moveTo(pos, 0);
      graphics.lineTo(pos, boardHeight);
      
      // 水平线
      graphics.moveTo(0, pos);
      graphics.lineTo(boardWidth, pos);
    }

    // 绘制天元和星位
    const starPositions = [
      [3, 3], [3, 11], [11, 3], [11, 11], [7, 7]
    ];

    starPositions.forEach(([row, col]) => {
      graphics.beginFill(currentTheme.starColor, 0.8);
      graphics.drawCircle(col * cellSize, row * cellSize, Math.max(2, cellSize / 8));
      graphics.endFill();
    });

    boardContainerRef.current.addChild(graphics);
  }, [cellSize, boardHeight, boardWidth, currentTheme.gridColor, currentTheme.starColor]);

  // 初始化PixiJS应用
  const initializePixiApp = useCallback(async () => {
    if (!canvasRef.current || canvasWidth === 0 || canvasHeight === 0) return;

    try {
      setPixiError(null); // 清除之前的错误
      
      const app = new PIXI.Application();
      
      await app.init({
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: currentTheme.backgroundColor,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });

      appRef.current = app;
      
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
          destroyPixiApp();
          requestAnimationFrame(() => {
            if (canvasWidth > 0 && canvasHeight > 0) {
              initializePixiApp();
            }
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

      canvasRef.current.appendChild(app.canvas);

      // 设置canvas样式
      app.canvas.style.width = `${canvasWidth}px`;
      app.canvas.style.height = `${canvasHeight}px`;
      app.canvas.style.display = 'block';
      app.canvas.style.maxWidth = '100%';
      app.canvas.style.maxHeight = '100%';

      // 创建棋盘容器
      const boardContainer = new PIXI.Container();
      boardContainer.position.set(BOARD_PADDING, BOARD_PADDING);
      boardContainerRef.current = boardContainer;
      app.stage.addChild(boardContainer);

      // 创建棋子容器
      const stonesContainer = new PIXI.Container();
      stonesContainer.position.set(BOARD_PADDING, BOARD_PADDING);
      stonesContainerRef.current = stonesContainer;
      app.stage.addChild(stonesContainer);

      // 添加点击事件
      app.stage.interactive = true;
      app.stage.on('pointerdown', (event: any) => {
        if (gameOver || isAIThinking) return;
        
        if (gameMode === 'ai' && currentPlayer !== 1) return;

        const pos = event.data.getLocalPosition(app.stage);
        const boardX = pos.x - BOARD_PADDING;
        const boardY = pos.y - BOARD_PADDING;
        
        if (boardX < 0 || boardX > boardWidth || boardY < 0 || boardY > boardHeight) {
          return;
        }
        
        const col = Math.round(boardX / cellSize);
        const row = Math.round(boardY / cellSize);

        if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
          const success = makeMove(row, col);
          if (success) {
            audioService.playSound('place_stone');
          } else {
            audioService.playSound('error');
          }
        }
      });

      // 绘制棋盘
      redrawBoard();
      
      // 重新绘制棋子
      if (stonesContainerRef.current) {
        stonesContainerRef.current.removeChildren();
        for (let row = 0; row < BOARD_SIZE; row++) {
          for (let col = 0; col < BOARD_SIZE; col++) {
            const cell = board[row][col];
            if (cell !== 0) {
              const graphics = drawStone(col, row, cell);
              // 添加位置标记方便后续查找
              (graphics as any).row = row;
              (graphics as any).col = col;
              stonesContainerRef.current.addChild(graphics);
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Failed to initialize PixiJS:', error);
      setPixiError(error instanceof Error ? error.message : '初始化PixiJS失败');
    }
  }, [canvasWidth, canvasHeight, currentTheme, gameOver, isAIThinking, gameMode, currentPlayer, makeMove, boardWidth, boardHeight, cellSize, board, redrawBoard]);

  // 销毁PixiJS应用的函数
  const destroyPixiApp = useCallback(() => {
    if (appRef.current) {
      try {
        appRef.current.destroy(true, { children: true, texture: true });
      } catch (error) {
        console.warn('Error destroying PixiJS app:', error);
      }
      appRef.current = null;
    }
    
    boardContainerRef.current = null;
    stonesContainerRef.current = null;
    
    if (canvasRef.current) {
      canvasRef.current.innerHTML = '';
    }
  }, []);

  // 重建PixiJS应用的函数
  const rebuildPixiApp = useCallback(() => {
    destroyPixiApp();
    
    // 使用 requestAnimationFrame 确保DOM更新完成
    requestAnimationFrame(() => {
      if (canvasWidth > 0 && canvasHeight > 0) {
        initializePixiApp();
      }
    });
  }, [destroyPixiApp, canvasWidth, canvasHeight, initializePixiApp]);

  // 统一的PixiJS应用生命周期管理
  useEffect(() => {
    // 初始化条件：尺寸有效且应用不存在
    if (canvasWidth > 0 && canvasHeight > 0 && !appRef.current) {
      initializePixiApp();
    }

    return () => {
      destroyPixiApp();
    };
  }, [canvasWidth, canvasHeight, initializePixiApp, destroyPixiApp]);

  // 处理尺寸变化
  useEffect(() => {
    if (appRef.current && canvasWidth > 0 && canvasHeight > 0) {
      // 调整应用尺寸
      appRef.current.renderer.resize(canvasWidth, canvasHeight);
      
      // 更新canvas样式
      appRef.current.canvas.style.width = `${canvasWidth}px`;
      appRef.current.canvas.style.height = `${canvasHeight}px`;
      
      // 重绘棋盘
      redrawBoard();
    }
  }, [canvasWidth, canvasHeight, cellSize, boardWidth, boardHeight, redrawBoard]);

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
      redrawBoard();
    }
  }, [currentTheme.id, updateBackgroundColor, redrawBoard]);

  // 绘制棋盘网格
  const drawBoard = useCallback(() => {
    if (!boardContainerRef.current) return;

    const graphics = new PIXI.Graphics();
    
    // 绘制网格线
    graphics.lineStyle(Math.max(1, cellSize / 24), currentTheme.gridColor, 0.8);
    
    // 绘制15x15的网格线
    for (let i = 0; i < BOARD_SIZE; i++) {
      const pos = i * cellSize;
      
      // 垂直线
      graphics.moveTo(pos, 0);
      graphics.lineTo(pos, boardHeight);
      
      // 水平线
      graphics.moveTo(0, pos);
      graphics.lineTo(boardWidth, pos);
    }

    // 绘制天元和星位
    const starPositions = [
      [3, 3], [3, 11], [11, 3], [11, 11], [7, 7]
    ];

    starPositions.forEach(([row, col]) => {
      graphics.beginFill(currentTheme.starColor, 0.8);
      graphics.drawCircle(col * cellSize, row * cellSize, Math.max(2, cellSize / 8));
      graphics.endFill();
    });

    boardContainerRef.current.addChild(graphics);
  }, [cellSize, boardHeight, boardWidth, currentTheme.gridColor, currentTheme.starColor]);

  // 更新棋子显示 - 使用缓存优化性能
  const lastBoardRef = useRef<number[][]>([]);
  
  useEffect(() => {
    if (!stonesContainerRef.current) return;
    
    // 第一次渲染时绘制所有棋子
    if (lastBoardRef.current.length === 0) {
      for (let row = 0; row < BOARD_SIZE; row++) {
        lastBoardRef.current[row] = [];
        for (let col = 0; col < BOARD_SIZE; col++) {
          lastBoardRef.current[row][col] = 0;
        }
      }
      
      // 清除所有棋子
      stonesContainerRef.current.removeChildren();
      
      // 绘制所有棋子
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const cell = board[row][col];
          if (cell !== 0) {
            const graphics = drawStone(col, row, cell);
            // 添加位置标记方便后续查找
            (graphics as any).row = row;
            (graphics as any).col = col;
            stonesContainerRef.current.addChild(graphics);
            lastBoardRef.current[row][col] = cell;
          }
        }
      }
      return;
    }      // 后续渲染只更新变化的部分
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const newValue = board[row][col];
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
            
            // 添加位置标记方便后续查找
            (graphics as any).row = row;
            (graphics as any).col = col;
            
            // 添加落子动画效果
            graphics.scale.set(0.6);
            graphics.alpha = 0.7;
            
            stonesContainerRef.current.addChild(graphics);
            
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
  }, [board, cellSize]);
  
  // 绘制棋子的函数 - 在useEffect之前定义以解决循环依赖
  const drawStone = (col: number, row: number, type: number, cellSizeParam?: number) => {
    const size = cellSizeParam || cellSize;
    const graphics = new PIXI.Graphics();
    const radius = size / 2 - 2;
    
    if (type === 1) {
      // 黑棋
      graphics.beginFill(0x1a1a1a);
      graphics.drawCircle(col * size, row * size, radius);
      graphics.endFill();
      graphics.beginFill(0x404040, 0.6);
      graphics.drawCircle(col * size - radius/3, row * size - radius/3, radius/4);
      graphics.endFill();
      graphics.lineStyle(Math.max(1, size / 32), 0x000000, 0.8);
      graphics.drawCircle(col * size, row * size, radius);
    } else {
      // 白棋
      graphics.beginFill(0xffffff);
      graphics.drawCircle(col * size, row * size, radius);
      graphics.endFill();
      graphics.beginFill(0xe0e0e0, 0.4);
      graphics.drawCircle(col * size + radius/4, row * size + radius/4, radius/3);
      graphics.endFill();
      graphics.lineStyle(Math.max(1, size / 32), 0x666666, 0.8);
      graphics.drawCircle(col * size, row * size, radius);
    }
    
    return graphics;
  };

  // 检查游戏结果并播放音效
  useEffect(() => {
    if (gameOver) {
      console.log('游戏结束，获胜者:', winner, '游戏模式:', gameMode);
      
      if (winner) {
        audioService.playSound('win');
        
        // 更新统计数据
        if (gameMode === 'ai') {
          // AI模式下，玩家是黑棋(1)
          if (winner === 1) {
            console.log('玩家击败AI，更新胜利统计');
            updateGameStats('win');
          } else {
            console.log('AI击败玩家，更新失败统计');
            updateGameStats('lose');
          }
        } else if (gameMode === 'human') {
          // 双人模式下
          console.log('双人模式游戏结束，获胜者:', winner === 1 ? '黑棋' : '白棋');
          updateGameStats('win'); // 双人模式只记录游戏次数
        }
      } else {
        // 平局情况
        console.log('游戏平局');
        updateGameStats('draw');
      }
    }
  }, [gameOver, winner, gameMode]);



  return (
    <ErrorBoundary fallback={
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-red-50 border border-red-200 rounded-lg p-8">
        <div className="text-red-600 text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-red-800 mb-2">棋盘渲染错误</h2>
        <p className="text-red-600 text-center mb-4">
          棋盘组件遇到了问题，请刷新页面重试
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          刷新页面
        </button>
      </div>
    }>
      <div className="w-full h-full flex flex-col items-center justify-center gap-4">
        {/* 显示PixiJS错误信息 */}
        {pixiError && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg max-w-md">
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">⚠️</span>
              <span className="text-sm">{pixiError}</span>
            </div>
          </div>
        )}
        
        {/* 游戏模式选择 */}
      <div className={`${currentTheme.uiBackgroundClass} rounded-xl shadow-lg p-3 border-2 text-sm`}>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-800">模式:</span>
          <button
            onClick={() => {
              setGameMode('human');
              audioService.playSound('click');
            }}
            className={`px-3 py-1 rounded-md font-medium transition-all text-sm ${
              gameMode === 'human' 
                ? 'bg-amber-500 text-white shadow-md' 
                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
            }`}
          >
            双人
          </button>
          <button
            onClick={() => {
              setGameMode('ai');
              audioService.playSound('click');
            }}
            className={`px-3 py-1 rounded-md font-medium transition-all text-sm ${
              gameMode === 'ai' 
                ? 'bg-amber-500 text-white shadow-md' 
                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
            }`}
          >
            人机
          </button>
          {gameMode === 'ai' && (
            <button
              onClick={() => {
                setShowAISettings(true);
                audioService.playSound('click');
              }}
              className="px-2 py-1 bg-amber-200 text-amber-800 rounded-md hover:bg-amber-300 transition-colors text-sm"
              title="AI设置"
            >
              ⚙️
            </button>
          )}
        </div>
      </div>

      {/* 游戏状态面板 */}
      <div className={`${currentTheme.uiBackgroundClass} rounded-xl shadow-lg p-4 border-2 text-sm`}>
        <div className="flex items-center justify-between gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-800 mb-1">
              {gameOver ? (
                winner === 1 ? '🎉 黑棋获胜' : winner === 2 ? '🎉 白棋获胜' : '平局'
              ) : isAIThinking ? (
                '🤖 AI思考中'
              ) : (
                `当前回合`
              )}
            </div>
            {!gameOver && !isAIThinking && (
              <div className="flex items-center justify-center gap-2">
                <div className={`w-4 h-4 rounded-full border ${
                  currentPlayer === 1 ? 'bg-black border-gray-600' : 'bg-white border-gray-400'
                }`}></div>
                <span className="text-sm font-medium text-gray-700">
                  {gameMode === 'ai' ? 
                    (currentPlayer === 1 ? '玩家' : 'AI') : 
                    (currentPlayer === 1 ? '黑棋' : '白棋')
                  }
                </span>
              </div>
            )}
          </div>
          
          <button
            onClick={() => {
              resetGame();
              audioService.playSound('click');
            }}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white 
                     font-semibold rounded-lg shadow-md hover:from-amber-600 hover:to-orange-600 
                     transform hover:scale-105 transition-all duration-200 active:scale-95 text-sm"
          >
            重新开始
          </button>
        </div>
      </div>
      
      {/* 棋盘容器 */}
      <div className="relative flex-1 flex items-center justify-center max-w-full max-h-full">
        <div 
          ref={canvasRef}
          className={`${currentTheme.boardBorderColor} border-4 rounded-2xl shadow-2xl overflow-hidden ${
            isAIThinking ? 'opacity-75 cursor-wait' : ''
          }`}
          style={{ 
            width: `${canvasWidth}px`, 
            height: `${canvasHeight}px`,
            maxWidth: '100%',
            maxHeight: '100%'
          }}
        />
        
        {/* 棋盘装饰角 - 使用主题色 */}
        {[
          { position: 'absolute -top-1 -left-1' },
          { position: 'absolute -top-1 -right-1' },
          { position: 'absolute -bottom-1 -left-1' },
          { position: 'absolute -bottom-1 -right-1' }
        ].map((corner, index) => (
          <div 
            key={index}
            className={`${corner.position} w-3 h-3 rounded-full ${getThemeCornerColor(currentTheme)}`}
          />
        ))}
        
        {/* AI 思考动画 */}
        {isAIThinking && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-2xl">
            <div className="bg-white/90 px-3 py-2 rounded-lg shadow-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full"></div>
                <span className="text-amber-800 font-medium text-sm">AI思考中...</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 提示信息 */}
      <div className="text-center text-gray-700 bg-white/60 px-3 py-1 rounded-lg">
        <p className="text-xs font-medium">
          {gameMode === 'ai' ? 
            '💡 您执黑棋，点击交叉点落子' : 
            '💡 点击交叉点落子'
          }
        </p>
        {gameOver && (
          <p className="text-xs mt-1 text-gray-600">点击重新开始按钮开始新游戏</p>
        )}
      </div>
      
      {/* AI 设置弹窗 */}
      {showAISettings && (
        <AISettings onClose={() => setShowAISettings(false)} />
      )}
    </div>
    </ErrorBoundary>
  );
};
