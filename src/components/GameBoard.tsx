import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from 'pixi.js';
import { useGameStore } from '../store/gameStore';
import { AISettings } from './AISettings';
import { themeService } from '../services/ThemeService';
import { audioService } from '../services/AudioService';
import { updateGameStats } from './GameStatsPanel';

const BOARD_SIZE = 15;
const CELL_SIZE = 35;
const BOARD_WIDTH = BOARD_SIZE * CELL_SIZE;
const BOARD_HEIGHT = BOARD_SIZE * CELL_SIZE;

export const GameBoard: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const boardContainerRef = useRef<PIXI.Container | null>(null);
  const stonesContainerRef = useRef<PIXI.Container | null>(null);
  const [showAISettings, setShowAISettings] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(themeService.getCurrentTheme());
  
  const { board, currentPlayer, winner, gameOver, gameMode, isAIThinking, makeMove, resetGame, setGameMode } = useGameStore();

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

  const redrawBoard = () => {
    if (!boardContainerRef.current) return;
    
    boardContainerRef.current.removeChildren();
    drawBoard();
  };

  // 初始化 PixiJS
  useEffect(() => {
    if (!canvasRef.current) return;

    const app = new PIXI.Application();
    
    // 异步初始化应用
    const initApp = async () => {
      await app.init({
        width: BOARD_WIDTH + 60,
        height: BOARD_HEIGHT + 60,
        backgroundColor: currentTheme.backgroundColor,
        antialias: true,
      });

      appRef.current = app;
      canvasRef.current!.appendChild(app.canvas);

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
  }, []);

  // 绘制棋盘网格
  const drawBoard = () => {
    if (!boardContainerRef.current) return;

    const graphics = new PIXI.Graphics();
    
    // 绘制网格线
    graphics.lineStyle(2, currentTheme.gridColor, 0.8);
    
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
      graphics.drawCircle(col * CELL_SIZE, row * CELL_SIZE, 6);
      graphics.endFill();
    });

    boardContainerRef.current.addChild(graphics);
  };

  // 处理棋盘点击
  const onBoardClick = useCallback((event: any) => {
    if (gameOver || isAIThinking) return;
    
    // 在 AI 模式下，只允许玩家（黑棋）下棋
    if (gameMode === 'ai' && currentPlayer !== 1) return;

    const pos = event.data.getLocalPosition(appRef.current!.stage);
    const col = Math.round((pos.x - 30) / CELL_SIZE);
    const row = Math.round((pos.y - 30) / CELL_SIZE);

    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
      const success = makeMove(row, col);
      if (success) {
        audioService.playSound('place_stone');
      } else {
        audioService.playSound('error');
      }
    }
  }, [gameOver, isAIThinking, gameMode, currentPlayer, makeMove]);

  // 绘制棋子
  const drawStone = (row: number, col: number, player: 1 | 2) => {
    if (!stonesContainerRef.current) return;

    const graphics = new PIXI.Graphics();
    const radius = CELL_SIZE / 2 - 3;
    
    if (player === 1) {
      // 黑棋 - 渐变效果
      graphics.beginFill(0x1a1a1a);
      graphics.drawCircle(col * CELL_SIZE, row * CELL_SIZE, radius);
      graphics.endFill();
      
      // 高光效果
      graphics.beginFill(0x404040, 0.6);
      graphics.drawCircle(col * CELL_SIZE - radius/3, row * CELL_SIZE - radius/3, radius/3);
      graphics.endFill();
      
      // 外边框
      graphics.lineStyle(2, 0x000000, 0.8);
      graphics.drawCircle(col * CELL_SIZE, row * CELL_SIZE, radius);
    } else {
      // 白棋 - 渐变效果
      graphics.beginFill(0xffffff);
      graphics.drawCircle(col * CELL_SIZE, row * CELL_SIZE, radius);
      graphics.endFill();
      
      // 阴影效果
      graphics.beginFill(0xe0e0e0, 0.4);
      graphics.drawCircle(col * CELL_SIZE + radius/4, row * CELL_SIZE + radius/4, radius/2);
      graphics.endFill();
      
      // 外边框
      graphics.lineStyle(2, 0x666666, 0.8);
      graphics.drawCircle(col * CELL_SIZE, row * CELL_SIZE, radius);
    }

    stonesContainerRef.current.addChild(graphics);
  };

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

  return (
    <div className="flex flex-col items-center gap-6">
      {/* 游戏模式选择 */}
      <div className={`${currentTheme.uiBackgroundClass} rounded-2xl shadow-xl p-4 border-2`}>
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold text-gray-800">游戏模式:</span>
          <button
            onClick={() => {
              setGameMode('human');
              audioService.playSound('click');
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              gameMode === 'human' 
                ? 'bg-amber-500 text-white shadow-lg' 
                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
            }`}
          >
            双人对战
          </button>
          <button
            onClick={() => {
              setGameMode('ai');
              audioService.playSound('click');
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              gameMode === 'ai' 
                ? 'bg-amber-500 text-white shadow-lg' 
                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
            }`}
          >
            人机对战
          </button>
          {gameMode === 'ai' && (
            <button
              onClick={() => {
                setShowAISettings(true);
                audioService.playSound('click');
              }}
              className="px-3 py-2 bg-amber-200 text-amber-800 rounded-lg hover:bg-amber-300 transition-colors"
              title="AI设置"
            >
              ⚙️
            </button>
          )}
        </div>
      </div>

      {/* 游戏状态面板 */}
      <div className={`${currentTheme.uiBackgroundClass} rounded-2xl shadow-xl p-6 border-2`}>
        <div className="flex items-center justify-between gap-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800 mb-2">
              {gameOver ? (
                winner === 1 ? '🎉 黑棋获胜！' : winner === 2 ? '🎉 白棋获胜！' : '平局'
              ) : isAIThinking ? (
                '🤖 AI 思考中...'
              ) : (
                `当前回合`
              )}
            </div>
            {!gameOver && !isAIThinking && (
              <div className="flex items-center justify-center gap-2">
                <div className={`w-6 h-6 rounded-full border-2 ${
                  currentPlayer === 1 ? 'bg-black border-gray-600' : 'bg-white border-gray-400'
                }`}></div>
                <span className="text-lg font-semibold text-gray-700">
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
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white 
                     font-semibold rounded-xl shadow-lg hover:from-amber-600 hover:to-orange-600 
                     transform hover:scale-105 transition-all duration-200 active:scale-95"
          >
            重新开始
          </button>
        </div>
      </div>
      
      {/* 棋盘容器 */}
      <div className="relative">
        <div 
          ref={canvasRef}
          className={`${currentTheme.boardBorderColor} border-4 rounded-2xl shadow-2xl ${
            isAIThinking ? 'opacity-75 cursor-wait' : ''
          }`}
          style={{ 
            width: BOARD_WIDTH + 60, 
            height: BOARD_HEIGHT + 60 
          }}
        />
        
        {/* 棋盘装饰角 */}
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-amber-800 rounded-full"></div>
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-amber-800 rounded-full"></div>
        <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-amber-800 rounded-full"></div>
        <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-amber-800 rounded-full"></div>
        
        {/* AI 思考动画 */}
        {isAIThinking && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-2xl">
            <div className="bg-white/90 px-4 py-2 rounded-lg shadow-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full"></div>
                <span className="text-amber-800 font-medium">AI 正在思考...</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 提示信息 */}
      <div className="text-center text-gray-700 bg-white/60 px-4 py-2 rounded-lg">
        <p className="text-sm font-medium">
          {gameMode === 'ai' ? 
            '💡 您执黑棋，点击棋盘交叉点处落子' : 
            '💡 点击棋盘交叉点处落子'
          }
        </p>
        {gameOver && (
          <p className="text-xs mt-1 text-gray-600">点击"重新开始"按钮开始新游戏</p>
        )}
      </div>
      
      {/* AI 设置弹窗 */}
      {showAISettings && (
        <AISettings onClose={() => setShowAISettings(false)} />
      )}
    </div>
  );
};
