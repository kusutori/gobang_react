import React, { useState, useEffect } from 'react';
import { boardThemes, themeService } from '../services/ThemeService';
import { audioService, AudioSettings } from '../services/AudioService';

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const [currentTheme, setCurrentTheme] = useState(themeService.getCurrentTheme());
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(audioService.getSettings());

  useEffect(() => {
    const handleThemeChange = (theme: any) => {
      setCurrentTheme(theme);
    };

    themeService.addListener(handleThemeChange);
    return () => {
      themeService.removeListener(handleThemeChange);
    };
  }, []);

  const handleThemeChange = (themeId: string) => {
    themeService.setTheme(themeId);
    audioService.playSound('click');
  };

  const handleAudioSettingChange = (setting: keyof AudioSettings, value: boolean | number) => {
    const newSettings = { ...audioSettings, [setting]: value };
    setAudioSettings(newSettings);
    audioService.updateSettings(newSettings);
    
    if (setting === 'bgmEnabled' && value) {
      audioService.resumeAudioContext();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`${currentTheme.uiBackgroundClass} rounded-2xl shadow-2xl p-6 border-2 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">游戏设置</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 主题设置 */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            🎨 棋盘主题
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {boardThemes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                  currentTheme.id === theme.id
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">{theme.icon}</div>
                <div className="font-medium text-gray-800">{theme.name}</div>
                <div className="text-xs text-gray-600 mt-1">{theme.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 音效设置 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            🔊 音效设置
          </h3>
          
          <div className="space-y-4">
            {/* 背景音乐开关 */}
            <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎵</span>
                <div>
                  <div className="font-medium text-gray-800">背景音乐</div>
                  <div className="text-sm text-gray-600">播放轻柔的背景音乐</div>
                </div>
              </div>
              <button
                onClick={() => handleAudioSettingChange('bgmEnabled', !audioSettings.bgmEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  audioSettings.bgmEnabled ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                    audioSettings.bgmEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* 音效开关 */}
            <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔔</span>
                <div>
                  <div className="font-medium text-gray-800">音效</div>
                  <div className="text-sm text-gray-600">落子和按钮点击音效</div>
                </div>
              </div>
              <button
                onClick={() => handleAudioSettingChange('soundEnabled', !audioSettings.soundEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  audioSettings.soundEnabled ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                    audioSettings.soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* 背景音乐音量 */}
            {audioSettings.bgmEnabled && (
              <div className="p-3 bg-white/50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl">🎼</span>
                  <span className="font-medium text-gray-800">背景音乐音量</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={audioSettings.bgmVolume}
                  onChange={(e) => handleAudioSettingChange('bgmVolume', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-sm text-gray-600 mt-1">
                  {Math.round(audioSettings.bgmVolume * 100)}%
                </div>
              </div>
            )}

            {/* 音效音量 */}
            {audioSettings.soundEnabled && (
              <div className="p-3 bg-white/50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl">🔊</span>
                  <span className="font-medium text-gray-800">音效音量</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={audioSettings.soundVolume}
                  onChange={(e) => handleAudioSettingChange('soundVolume', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-sm text-gray-600 mt-1">
                  {Math.round(audioSettings.soundVolume * 100)}%
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 测试按钮 */}
        <div className="flex gap-4">
          <button
            onClick={() => audioService.playSound('place_stone')}
            className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            测试落子音效
          </button>
          <button
            onClick={() => audioService.playSound('win')}
            className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            测试胜利音效
          </button>
        </div>
      </div>
    </div>
  );
};
