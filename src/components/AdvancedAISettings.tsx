import React, { useState, useEffect } from 'react';
import { AdvancedAIConfig } from '../game/ai/AdvancedAI';

interface AdvancedAISettingsProps {
  onClose: () => void;
  onConfigChange?: (config: AdvancedAIConfig) => void;
}

export const AdvancedAISettings: React.FC<AdvancedAISettingsProps> = ({ onClose, onConfigChange }) => {
  const [config, setConfig] = useState<AdvancedAIConfig>({
    difficulty: 'medium',
    depth: 6,
    timeout: 5000
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    // Load saved config from localStorage
    const savedConfig = localStorage.getItem('advancedAIConfig');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
      } catch (error) {
        console.error('Failed to parse saved advanced AI config:', error);
      }
    }
  }, []);

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('advancedAIConfig', JSON.stringify(config));
    
    // Notify parent component
    if (onConfigChange) {
      onConfigChange(config);
    }
    
    onClose();
  };

  const handleReset = () => {
    const defaultConfig: AdvancedAIConfig = {
      difficulty: 'medium',
      depth: 6,
      timeout: 5000
    };
    setConfig(defaultConfig);
  };

  const getDifficultyDescription = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '适合新手，反应较快但策略简单';
      case 'medium':
        return '平衡的对手，具有良好的策略和合理的思考时间';
      case 'hard':
        return '有挑战性的对手，深度思考和强大策略';
      case 'expert':
        return '专家级别，最高难度，需要较长思考时间';
      default:
        return '';
    }
  };

  const getDepthForDifficulty = (difficulty: string): number => {
    switch (difficulty) {
      case 'easy': return 4;
      case 'medium': return 6;
      case 'hard': return 8;
      case 'expert': return 10;
      default: return 6;
    }
  };

  const updateDifficulty = (difficulty: AdvancedAIConfig['difficulty']) => {
    setConfig(prev => ({
      ...prev,
      difficulty,
      depth: getDepthForDifficulty(difficulty)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              🧠 高级AI设置
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Difficulty Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              🎯 难度等级
            </label>
            <div className="space-y-2">
              {(['easy', 'medium', 'hard', 'expert'] as const).map((difficulty) => (
                <label key={difficulty} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="difficulty"
                    value={difficulty}
                    checked={config.difficulty === difficulty}
                    onChange={(e) => updateDifficulty(e.target.value as AdvancedAIConfig['difficulty'])}
                    className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800 capitalize">
                        {difficulty === 'easy' && '🟢 简单'}
                        {difficulty === 'medium' && '🟡 中等'}
                        {difficulty === 'hard' && '🟠 困难'}
                        {difficulty === 'expert' && '🔴 专家'}
                      </span>
                      <span className="text-sm text-gray-500">
                        深度: {getDepthForDifficulty(difficulty)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {getDifficultyDescription(difficulty)}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="font-medium text-gray-700">⚙️ 高级设置</span>
              <span className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
          </div>

          {/* Advanced Settings */}
          {showAdvanced && (
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              {/* Search Depth */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🔍 搜索深度: {config.depth}
                </label>
                <input
                  type="range"
                  min="2"
                  max="12"
                  step="1"
                  value={config.depth}
                  onChange={(e) => setConfig(prev => ({ ...prev, depth: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>快速 (2)</span>
                  <span>深度 (12)</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  更高的深度意味着更强的棋力，但需要更长的思考时间
                </p>
              </div>

              {/* Timeout */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ⏱️ 最大思考时间: {config.timeout / 1000}秒
                </label>
                <input
                  type="range"
                  min="1000"
                  max="30000"
                  step="1000"
                  value={config.timeout}
                  onChange={(e) => setConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1秒</span>
                  <span>30秒</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  AI的最大思考时间限制，超时将返回当前最佳解
                </p>
              </div>
            </div>
          )}

          {/* Performance Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">💡 性能提示</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 高级AI使用先进的minimax算法和评估函数</li>
              <li>• 较高难度需要更多计算时间</li>
              <li>• 建议在现代设备上使用中等或以上难度</li>
              <li>• AI会缓存计算结果以提高性能</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-xl">
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              重置默认
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              保存设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
