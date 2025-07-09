import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { themeService } from '../services/ThemeService';

interface AISettingsProps {
  onClose: () => void;
}

export const AISettings: React.FC<AISettingsProps> = ({ onClose }) => {
  const { aiPlayer, gameMode } = useGameStore();
  const [currentTheme] = useState(themeService.getCurrentTheme());
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  
  if (gameMode !== 'ai' || !aiPlayer) return null;
  
  const currentConfig = aiPlayer.getConfig();
  
  const handleDifficultyChange = (difficulty: 'easy' | 'medium' | 'hard') => {
    const configs = {
      easy: { difficulty: 1, thinkingTime: 300 },
      medium: { difficulty: 2, thinkingTime: 800 },
      hard: { difficulty: 3, thinkingTime: 1200 }
    };
    
    // 更新本地状态，立即反映在UI上
    setSelectedDifficulty(difficulty);
    
    // 更新AI配置
    aiPlayer.updateConfig(configs[difficulty]);
  };
  
  // 初始化选择的难度
  React.useEffect(() => {
    setSelectedDifficulty(getCurrentDifficulty());
  }, []);
  
  const getCurrentDifficulty = () => {
    const diff = currentConfig.difficulty;
    if (diff <= 1) return 'easy';
    if (diff <= 2) return 'medium';
    return 'hard';
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`${currentTheme.uiBackgroundClass} rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${currentTheme.headingColorClass}`}>AI 设置</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-6">
          <div>
            <h3 className={`text-lg font-semibold ${currentTheme.headingColorClass} mb-3`}>难度选择</h3>
            <div className="space-y-2">
              {[
                { key: 'easy', label: '简单', desc: '思考快速，适合新手' },
                { key: 'medium', label: '中等', desc: '平衡的挑战性' },
                { key: 'hard', label: '困难', desc: '深度思考，高挑战' }
              ].map(({ key, label, desc }) => (
                <button
                  key={key}
                  onClick={() => handleDifficultyChange(key as 'easy' | 'medium' | 'hard')}
                  className={`w-full p-3 rounded-lg border-2 transition-all ${
                    selectedDifficulty === key
                      ? 'border-amber-500 bg-amber-50 text-amber-800'
                      : `border-gray-200 hover:border-amber-300 hover:bg-amber-50 ${currentTheme.textColorClass}`
                  }`}
                >
                  <div className="text-left">
                    <div className="font-medium">{label}</div>
                    <div className={`text-sm ${currentTheme.subTextColorClass}`}>{desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="text-center">
            <button
              onClick={onClose}
              className={`px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white 
                       font-semibold rounded-lg shadow-lg hover:from-amber-600 hover:to-orange-600 
                       transform hover:scale-105 transition-all duration-200 active:scale-95`}
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
