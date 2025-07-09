import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { themeService } from '../services/ThemeService';

export const SimpleGameBoard: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const [currentTheme, setCurrentTheme] = useState(themeService.getCurrentTheme());

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

  // 初始化PixiJS应用
  useEffect(() => {
    if (!canvasRef.current) return;

    const initApp = async () => {
      try {
        const app = new PIXI.Application();
        await app.init({
          width: 400,
          height: 400,
          backgroundColor: currentTheme.backgroundColor,
        });

        appRef.current = app;
        canvasRef.current!.appendChild(app.canvas);

        // 绘制简单的棋盘
        const graphics = new PIXI.Graphics();
        graphics.lineStyle(2, currentTheme.gridColor);
        
        for (let i = 0; i < 15; i++) {
          const pos = i * 25;
          graphics.moveTo(pos, 0);
          graphics.lineTo(pos, 350);
          graphics.moveTo(0, pos);
          graphics.lineTo(350, pos);
        }

        app.stage.addChild(graphics);

      } catch (error) {
        console.error('Failed to initialize PixiJS:', error);
      }
    };

    initApp();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, []);

  // 主题变化时更新背景色
  useEffect(() => {
    if (appRef.current) {
      // 使用类型断言来避免TypeScript错误
      (appRef.current.renderer as any).backgroundColor = currentTheme.backgroundColor;
    }
  }, [currentTheme.backgroundColor]);

  return (
    <div className="flex justify-center items-center">
      <div 
        ref={canvasRef} 
        className="border-2 border-gray-400 rounded-lg"
        style={{ width: '400px', height: '400px' }}
      />
    </div>
  );
};
