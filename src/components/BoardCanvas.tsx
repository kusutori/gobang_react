import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from 'pixi.js';
import { themeService } from '../services/ThemeService';

const BOARD_SIZE = 15;
const MIN_CELL_SIZE = 24;
const MAX_CELL_SIZE = 40;
const BOARD_PADDING = 20;

interface BoardCanvasProps {
  board: (0 | 1 | 2)[][];
  onCellClick?: (row: number, col: number) => void;
  onCellHover?: (row: number, col: number) => void;
  onCellLeave?: () => void;
  previewPosition?: { row: number; col: number } | null;
  previewStoneType?: 1 | 2;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const BoardCanvas: React.FC<BoardCanvasProps> = ({
  board,
  onCellClick,
  onCellHover,
  onCellLeave,
  previewPosition,
  previewStoneType,
  disabled = false,
  className = '',
  style
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const boardContainerRef = useRef<PIXI.Container | null>(null);
  const stonesContainerRef = useRef<PIXI.Container | null>(null);
  const previewStoneContainerRef = useRef<PIXI.Container | null>(null);
  
  const [currentTheme, setCurrentTheme] = useState(themeService.getCurrentTheme());
  const [cellSize, setCellSize] = useState(MIN_CELL_SIZE);
  const [boardWidth, setBoardWidth] = useState(0);
  const [boardHeight, setBoardHeight] = useState(0);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const [pixiError, setPixiError] = useState<string | null>(null);

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

  // 创建预览棋子
  const createPreviewStone = useCallback((col: number, row: number, type: number) => {
    const graphics = new PIXI.Graphics();
    const radius = cellSize / 2 - 2;
    
    if (type === 1) {
      // 黑棋预览
      graphics.beginFill(0x1a1a1a, 0.4);
      graphics.drawCircle(col * cellSize, row * cellSize, radius);
      graphics.endFill();
      graphics.lineStyle(Math.max(1, cellSize / 32), 0x000000, 0.6);
      graphics.drawCircle(col * cellSize, row * cellSize, radius);
    } else {
      // 白棋预览
      graphics.beginFill(0xffffff, 0.4);
      graphics.drawCircle(col * cellSize, row * cellSize, radius);
      graphics.endFill();
      graphics.lineStyle(Math.max(1, cellSize / 32), 0x666666, 0.6);
      graphics.drawCircle(col * cellSize, row * cellSize, radius);
    }
    
    return graphics;
  }, [cellSize]);

  // 创建棋子
  const createStone = useCallback((col: number, row: number, type: number) => {
    const graphics = new PIXI.Graphics();
    const radius = cellSize / 2 - 2;
    
    if (type === 1) {
      // 黑棋
      graphics.beginFill(0x1a1a1a);
      graphics.drawCircle(col * cellSize, row * cellSize, radius);
      graphics.endFill();
      graphics.beginFill(0x404040, 0.6);
      graphics.drawCircle(col * cellSize - radius/3, row * cellSize - radius/3, radius/4);
      graphics.endFill();
      graphics.lineStyle(Math.max(1, cellSize / 32), 0x000000, 0.8);
      graphics.drawCircle(col * cellSize, row * cellSize, radius);
    } else {
      // 白棋
      graphics.beginFill(0xffffff);
      graphics.drawCircle(col * cellSize, row * cellSize, radius);
      graphics.endFill();
      graphics.beginFill(0xe0e0e0, 0.4);
      graphics.drawCircle(col * cellSize + radius/4, row * cellSize + radius/4, radius/3);
      graphics.endFill();
      graphics.lineStyle(Math.max(1, cellSize / 32), 0x666666, 0.8);
      graphics.drawCircle(col * cellSize, row * cellSize, radius);
    }
    
    return graphics;
  }, [cellSize]);

  // 绘制棋盘
  const drawBoard = useCallback(() => {
    if (!boardContainerRef.current) return;

    boardContainerRef.current.removeChildren();

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

  // 重绘棋子
  const redrawStones = useCallback(() => {
    if (!stonesContainerRef.current) return;

    stonesContainerRef.current.removeChildren();

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cell = board[row][col];
        if (cell !== 0) {
          const stone = createStone(col, row, cell);
          stonesContainerRef.current.addChild(stone);
        }
      }
    }
  }, [board, createStone]);

  // 更新预览棋子
  const updatePreviewStone = useCallback(() => {
    if (!previewStoneContainerRef.current) return;
    
    // 清除现有预览棋子
    previewStoneContainerRef.current.removeChildren();
    
    // 检查是否应该显示预览棋子
    if (!previewPosition || 
        disabled ||
        !previewStoneType ||
        board[previewPosition.row][previewPosition.col] !== 0) {
      return;
    }

    // 创建预览棋子
    const previewStone = createPreviewStone(previewPosition.col, previewPosition.row, previewStoneType);
    previewStoneContainerRef.current.addChild(previewStone);
  }, [previewPosition, disabled, previewStoneType, board, createPreviewStone]);

  // 处理点击事件
  const handleBoardClick = useCallback((event: PIXI.FederatedPointerEvent) => {
    if (disabled || !onCellClick) return;

    const point = event.global;
    const localPoint = boardContainerRef.current?.toLocal(point);
    
    if (!localPoint) return;

    const col = Math.round(localPoint.x / cellSize);
    const row = Math.round(localPoint.y / cellSize);

    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
      if (board[row][col] === 0) {
        onCellClick(row, col);
      }
    }
  }, [disabled, onCellClick, cellSize, board]);

  // 处理鼠标移动事件
  const handleBoardMove = useCallback((event: PIXI.FederatedPointerEvent) => {
    if (disabled || !onCellHover) return;

    const point = event.global;
    const localPoint = boardContainerRef.current?.toLocal(point);
    
    if (!localPoint) {
      onCellLeave?.();
      return;
    }

    const col = Math.round(localPoint.x / cellSize);
    const row = Math.round(localPoint.y / cellSize);

    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
      if (board[row][col] === 0) {
        onCellHover(row, col);
      } else {
        onCellLeave?.();
      }
    } else {
      onCellLeave?.();
    }
  }, [disabled, onCellHover, onCellLeave, cellSize, board]);

  // 初始化 PIXI 应用
  const initPixiApp = useCallback(async () => {
    if (!canvasRef.current || appRef.current || canvasWidth === 0 || canvasHeight === 0) return;

    try {
      setPixiError(null);
      
      // 确保DOM元素完全可用
      await new Promise(resolve => setTimeout(resolve, 10));
      
      if (!canvasRef.current) return;
      
      const app = new PIXI.Application();
      
      await app.init({
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: currentTheme.backgroundColor,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (!canvasRef.current) return;

      appRef.current = app;
      
      // 清理旧的画布
      if (canvasRef.current.firstChild) {
        canvasRef.current.removeChild(canvasRef.current.firstChild);
      }
      canvasRef.current.appendChild(app.canvas);

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

      // 创建预览棋子容器
      const previewStoneContainer = new PIXI.Container();
      previewStoneContainer.position.set(BOARD_PADDING, BOARD_PADDING);
      previewStoneContainerRef.current = previewStoneContainer;
      app.stage.addChild(previewStoneContainer);

      // 设置交互
      if (!disabled) {
        app.stage.interactive = true;
        app.stage.on('pointermove', handleBoardMove);
        app.stage.on('pointerleave', () => onCellLeave?.());
        app.stage.on('pointerdown', handleBoardClick);
      }

      // 绘制棋盘和棋子
      drawBoard();
      redrawStones();
      
    } catch (error) {
      console.error('Failed to initialize PixiJS:', error);
      setPixiError(error instanceof Error ? error.message : '初始化PixiJS失败');
    }
  }, [canvasWidth, canvasHeight, currentTheme.backgroundColor, disabled, handleBoardMove, onCellLeave, handleBoardClick, drawBoard, redrawStones]);

  // 销毁 PIXI 应用
  const destroyPixiApp = useCallback(() => {
    if (appRef.current) {
      try {
        appRef.current.destroy(true, { children: true });
      } catch (error) {
        console.error('Error destroying PIXI app:', error);
      }
      appRef.current = null;
    }
    
    boardContainerRef.current = null;
    stonesContainerRef.current = null;
    previewStoneContainerRef.current = null;
    
    if (canvasRef.current) {
      canvasRef.current.innerHTML = '';
    }
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

  // 统一的PixiJS应用生命周期管理
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    // 初始化条件：尺寸有效且应用不存在且canvas引用存在
    if (canvasWidth > 0 && canvasHeight > 0 && !appRef.current && canvasRef.current) {
      // 延迟初始化，确保DOM完全准备好
      timeoutId = setTimeout(() => {
        initPixiApp();
      }, 50);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      destroyPixiApp();
    };
  }, [canvasWidth, canvasHeight, initPixiApp, destroyPixiApp]);

  // 处理尺寸变化
  useEffect(() => {
    if (appRef.current && canvasWidth > 0 && canvasHeight > 0) {
      // 调整应用尺寸
      appRef.current.renderer.resize(canvasWidth, canvasHeight);
      
      // 重绘棋盘
      drawBoard();
    }
  }, [canvasWidth, canvasHeight, cellSize, boardWidth, boardHeight, drawBoard]);

  // 当主题变化时更新背景色和重绘棋盘
  useEffect(() => {
    if (appRef.current) {
      // 更新背景色
      (appRef.current.renderer as any).backgroundColor = currentTheme.backgroundColor;
      // 重绘棋盘以更新颜色
      drawBoard();
    }
  }, [currentTheme.id, currentTheme.backgroundColor, drawBoard]);

  // 棋盘状态变化时重绘棋子
  useEffect(() => {
    redrawStones();
  }, [board, redrawStones]);

  // 预览棋子更新
  useEffect(() => {
    updatePreviewStone();
  }, [updatePreviewStone]);

  if (pixiError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️ {pixiError}</div>
          <button 
            onClick={() => {
              setPixiError(null);
              setTimeout(() => {
                destroyPixiApp();
                setTimeout(initPixiApp, 0);
              }, 0);
            }}
            className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={canvasRef} 
      className={className}
      style={style}
    />
  );
};
