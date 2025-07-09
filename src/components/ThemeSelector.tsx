import React, { useState, useEffect } from 'react';
import { boardThemes, themeService } from '../services/ThemeService';

export const ThemeSelector: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState(themeService.getCurrentTheme());

  useEffect(() => {
    const handleThemeChange = (theme: any) => {
      setCurrentTheme(theme);
    };

    themeService.addListener(handleThemeChange);
    return () => {
      themeService.removeListener(handleThemeChange);
    };
  }, []);

  return (
    <div className={`${currentTheme.uiBackgroundClass} rounded-xl p-4 mb-6 border-2`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-3">🎨 棋盘主题</h3>
      <div className="grid grid-cols-3 gap-2">
        {boardThemes.map(theme => (
          <button
            key={theme.id}
            onClick={() => themeService.setTheme(theme.id)}
            className={`p-2 rounded-lg border-2 transition-all text-2xl hover:scale-105 ${
              currentTheme.id === theme.id 
                ? 'border-blue-500 bg-blue-50 shadow-lg' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            title={theme.name}
          >
            {theme.icon}
          </button>
        ))}
      </div>
    </div>
  );
};
