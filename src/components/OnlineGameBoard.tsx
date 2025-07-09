import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from 'pixi.js';
import { socketService, SOCKET_EVENTS, RoomData } from '../services/SocketService';

const BOARD_SIZE = 15;
const CELL_SIZE = 30;
const BOARD_WIDTH = BOARD_SIZE * CELL_SIZE;
const BOARD_HEIGHT = BOARD_SIZE * CELL_SIZE;

interface OnlineGameBoardProps {
  room: RoomData;
}

export const OnlineGameBoard: React.FC<OnlineGameBoardProps> = ({ room }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const boardContainerRef = useRef<PIXI.Container | null>(null);
  const stonesContainerRef = useRef<PIXI.Container | null>(null);
  const [gameState, setGameState] = useState<RoomData>(room);
  
  // 使用 ref 来存储最新的回调，避免闭包问题
  const onBoardClickRef = useRef<((event: PIXI.FederatedPointerEvent) => void) | null>(null);

  const mySocketId = socketService.getSocketId();
  const myPlayer = mySocketId ? gameState.players[mySocketId] : null;
  const isMyTurn = gameState.gameStarted && !gameState.gameOver && myPlayer?.player === gameState.currentPlayer;

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
      await app.init({
        width: BOARD_WIDTH + 60,
        height: BOARD_HEIGHT + 60,
        backgroundColor: 0xD2B48C,
        antialias: true,
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
    };

    initApp();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, []);

  // 绘制棋盘网格
  const drawBoard = () => {
    if (!boardContainerRef.current) return;

    const graphics = new PIXI.Graphics();
    
    // 绘制网格线
    graphics.lineStyle(2, 0x8B4513, 0.8);
    
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
      graphics.beginFill(0x654321, 0.8);
      graphics.drawCircle(col * CELL_SIZE, row * CELL_SIZE, 5);
      graphics.endFill();
    });

    boardContainerRef.current.addChild(graphics);
  };

  // 绘制棋子
  const drawStone = (row: number, col: number, player: 1 | 2) => {
    if (!stonesContainerRef.current) return;

    const graphics = new PIXI.Graphics();
    const radius = CELL_SIZE / 2 - 3;
    
    if (player === 1) {
      // 黑棋
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
      // 白棋
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
        const cell = gameState.board[row][col];
        if (cell !== 0) {
          drawStone(row, col, cell);
        }
      }
    }
  }, [gameState.board]);

  const handleResetGame = () => {
    socketService.resetGame();
  };

  const getPlayerInfo = (playerNum: 1 | 2) => {
    const player = Object.values(gameState.players).find(p => p.player === playerNum);
    return player || null;
  };

  const player1 = getPlayerInfo(1);
  const player2 = getPlayerInfo(2);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* 游戏状态面板 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border-2 border-amber-200">
        <div className="flex items-center justify-between gap-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-800 mb-2">
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
                <span className="text-lg font-semibold text-amber-700">
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
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-4 border-2 border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-black rounded-full border-2 border-gray-600"></div>
            <span className="font-medium text-amber-800">
              {player1?.name || '等待玩家'}
            </span>
          </div>
          {player1 && (
            <div className="text-sm text-gray-600">
              {gameState.gameStarted && gameState.currentPlayer === 1 && !gameState.gameOver && (
                <span className="text-blue-600 font-medium">当前回合</span>
              )}
              {myPlayer?.player === 1 && (
                <span className="text-green-600 font-medium">您</span>
              )}
            </div>
          )}
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-4 border-2 border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-white rounded-full border-2 border-gray-400"></div>
            <span className="font-medium text-amber-800">
              {player2?.name || '等待玩家'}
            </span>
          </div>
          {player2 && (
            <div className="text-sm text-gray-600">
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
          className={`border-4 border-amber-800 rounded-2xl shadow-2xl bg-amber-100 ${
            !isMyTurn && gameState.gameStarted && !gameState.gameOver ? 'opacity-75' : ''
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
      </div>
      
      {/* 提示信息 */}
      <div className="text-center text-amber-700 bg-white/60 px-4 py-2 rounded-lg">
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
