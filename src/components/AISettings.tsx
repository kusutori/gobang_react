import React from 'react';
import { useGameStore } from '../store/gameStore';

interface AISettingsProps {
  onClose: () => void;
}

export const AISettings: React.FC<AISettingsProps> = ({ onClose }) => {
  const { aiPlayer, gameMode } = useGameStore();
  
  if (gameMode !== 'ai' || !aiPlayer) return null;
  
  const currentConfig = aiPlayer.getConfig();
  
  const handleDifficultyChange = (difficulty: 'easy' | 'medium' | 'hard') => {
    const configs = {
      easy: { difficulty: 1, thinkingTime: 300 },
      medium: { difficulty: 2, thinkingTime: 800 },
      hard: { difficulty: 3, thinkingTime: 1200 }
    };
    
    aiPlayer.updateConfig(configs[difficulty]);
  };
  
  const getCurrentDifficulty = () => {
    const diff = currentConfig.difficulty;
    if (diff <= 1) return 'easy';
    if (diff <= 2) return 'medium';
    return 'hard';
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-amber-800">AI 设置</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-amber-700 mb-3">难度选择</h3>
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
                    getCurrentDifficulty() === key
                      ? 'border-amber-500 bg-amber-50 text-amber-800'
                      : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  <div className="text-left">
                    <div className="font-medium">{label}</div>
                    <div className="text-sm text-gray-600">{desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="text-center">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
