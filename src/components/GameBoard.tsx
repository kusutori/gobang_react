import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from 'pixi.js';
import { useGameStore } from '../store/gameStore';
import { AISettings } from './AISettings';
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
  
  const { board, currentPlayer, winner, gameOver, gameMode, isAIThinking, makeMove, resetGame, setGameMode } = useGameStore();

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
      // 重新绘制棋盘
      if (appRef.current) {
        appRef.current.renderer.background.color = theme.backgroundColor;
        redrawBoard();
      }
    };

    themeService.addListener(handleThemeChange);
    return () => {
      themeService.removeListener(handleThemeChange);
    };
  }, []);

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

  // 初始化 PixiJS
  useEffect(() => {
    if (!canvasRef.current || canvasWidth === 0 || canvasHeight === 0) return;

    const app = new PIXI.Application();
    
    // 异步初始化应用
    const initApp = async () => {
      await app.init({
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: currentTheme.backgroundColor,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      appRef.current = app;
      canvasRef.current!.appendChild(app.canvas);

      // 设置canvas样式确保不会溢出
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

      // 绘制棋盘
      drawBoard();

      // 添加点击事件
      app.stage.interactive = true;
      app.stage.on('pointerdown', onBoardClick);
    };

    initApp();

    return () => {
      if (appRef.current) {
        appRef.current.destroy();
      }
    };
  }, [canvasWidth, canvasHeight, currentTheme.backgroundColor]);

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

  // 处理棋盘点击
  const onBoardClick = useCallback((event: any) => {
    if (gameOver || isAIThinking) return;
    
    // 在 AI 模式下，只允许玩家（黑棋）下棋
    if (gameMode === 'ai' && currentPlayer !== 1) return;

    const pos = event.data.getLocalPosition(appRef.current!.stage);
    
    // 计算点击的网格位置
    const boardX = pos.x - BOARD_PADDING;
    const boardY = pos.y - BOARD_PADDING;
    
    // 确保点击在棋盘范围内
    if (boardX < 0 || boardX > boardWidth || boardY < 0 || boardY > boardHeight) {
      return;
    }
    
    // 计算最近的网格交叉点
    const col = Math.round(boardX / cellSize);
    const row = Math.round(boardY / cellSize);

    // 确保坐标在有效范围内
    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
      const success = makeMove(row, col);
      if (success) {
        audioService.playSound('place_stone');
      } else {
        audioService.playSound('error');
      }
    }
  }, [gameOver, isAIThinking, gameMode, currentPlayer, makeMove, boardWidth, boardHeight, cellSize]);

  // 绘制棋子
  const drawStone = useCallback((row: number, col: number, player: 1 | 2) => {
    if (!stonesContainerRef.current) return;

    const graphics = new PIXI.Graphics();
    const radius = cellSize / 2 - 2;
    
    if (player === 1) {
      // 黑棋 - 渐变效果
      graphics.beginFill(0x1a1a1a);
      graphics.drawCircle(col * cellSize, row * cellSize, radius);
      graphics.endFill();
      
      // 高光效果
      graphics.beginFill(0x404040, 0.6);
      graphics.drawCircle(col * cellSize - radius/3, row * cellSize - radius/3, radius/4);
      graphics.endFill();
      
      // 外边框
      graphics.lineStyle(Math.max(1, cellSize / 32), 0x000000, 0.8);
      graphics.drawCircle(col * cellSize, row * cellSize, radius);
    } else {
      // 白棋 - 渐变效果
      graphics.beginFill(0xffffff);
      graphics.drawCircle(col * cellSize, row * cellSize, radius);
      graphics.endFill();
      
      // 阴影效果
      graphics.beginFill(0xe0e0e0, 0.4);
      graphics.drawCircle(col * cellSize + radius/4, row * cellSize + radius/4, radius/3);
      graphics.endFill();
      
      // 外边框
      graphics.lineStyle(Math.max(1, cellSize / 32), 0x666666, 0.8);
      graphics.drawCircle(col * cellSize, row * cellSize, radius);
    }

    stonesContainerRef.current.addChild(graphics);
  }, [stonesContainerRef, cellSize]);

  // 更新棋子显示
  useEffect(() => {
    if (!stonesContainerRef.current) return;

    // 清除所有棋子
    stonesContainerRef.current.removeChildren();

    // 重新绘制所有棋子
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cell = board[row][col];
        if (cell !== 0) {
          drawStone(row, col, cell);
        }
      }
    }
  }, [board]);

  // 检查游戏结果并播放音效
  useEffect(() => {
    if (gameOver && winner) {
      audioService.playSound('win');
      
      // 更新统计数据
      if (gameMode === 'ai') {
        // AI模式下，玩家是黑棋(1)
        if (winner === 1) {
          updateGameStats('win');
        } else {
          updateGameStats('lose');
        }
      } else if (gameMode === 'human') {
        // 双人模式，不区分胜负，只记录游戏次数
        updateGameStats('win'); // 可以根据具体需求修改
      }
    }
  }, [gameOver, winner, gameMode]);

  // 当棋盘尺寸变化时重绘棋盘
  useEffect(() => {
    if (appRef.current && boardContainerRef.current) {
      // 更新画布尺寸
      appRef.current.renderer.resize(canvasWidth, canvasHeight);
      
      // 重新绘制棋盘
      redrawBoard();
    }
  }, [canvasWidth, canvasHeight, cellSize, boardWidth, boardHeight]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4">
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
        <div className={`absolute -top-1 -left-1 w-3 h-3 rounded-full ${
          currentTheme.id === 'modern' ? 'bg-gray-600' : 
          currentTheme.id === 'jade' ? 'bg-emerald-600' :
          currentTheme.id === 'ocean' ? 'bg-blue-600' :
          currentTheme.id === 'sunset' ? 'bg-orange-600' :
          currentTheme.id === 'purple' ? 'bg-purple-600' :
          'bg-amber-800'
        }`}></div>
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
          currentTheme.id === 'modern' ? 'bg-gray-600' : 
          currentTheme.id === 'jade' ? 'bg-emerald-600' :
          currentTheme.id === 'ocean' ? 'bg-blue-600' :
          currentTheme.id === 'sunset' ? 'bg-orange-600' :
          currentTheme.id === 'purple' ? 'bg-purple-600' :
          'bg-amber-800'
        }`}></div>
        <div className={`absolute -bottom-1 -left-1 w-3 h-3 rounded-full ${
          currentTheme.id === 'modern' ? 'bg-gray-600' : 
          currentTheme.id === 'jade' ? 'bg-emerald-600' :
          currentTheme.id === 'ocean' ? 'bg-blue-600' :
          currentTheme.id === 'sunset' ? 'bg-orange-600' :
          currentTheme.id === 'purple' ? 'bg-purple-600' :
          'bg-amber-800'
        }`}></div>
        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${
          currentTheme.id === 'modern' ? 'bg-gray-600' : 
          currentTheme.id === 'jade' ? 'bg-emerald-600' :
          currentTheme.id === 'ocean' ? 'bg-blue-600' :
          currentTheme.id === 'sunset' ? 'bg-orange-600' :
          currentTheme.id === 'purple' ? 'bg-purple-600' :
          'bg-amber-800'
        }`}></div>
        
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
  );
};
