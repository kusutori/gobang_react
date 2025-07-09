import React, { useState, useEffect } from 'react';
import { audioService } from '../services/AudioService';

export const AudioControls: React.FC = () => {
  const [audioSettings, setAudioSettings] = useState(audioService.getSettings());

  const toggleBGM = () => {
    const newSettings = { ...audioSettings, bgmEnabled: !audioSettings.bgmEnabled };
    setAudioSettings(newSettings);
    audioService.updateSettings(newSettings);
    
    if (newSettings.bgmEnabled) {
      audioService.resumeAudioContext();
    }
  };

  const toggleSound = () => {
    const newSettings = { ...audioSettings, soundEnabled: !audioSettings.soundEnabled };
    setAudioSettings(newSettings);
    audioService.updateSettings(newSettings);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={toggleBGM}
        className={`p-2 rounded-lg transition-colors ${
          audioSettings.bgmEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}
        title={audioSettings.bgmEnabled ? '关闭背景音乐' : '开启背景音乐'}
      >
        🎵
      </button>
      <button
        onClick={toggleSound}
        className={`p-2 rounded-lg transition-colors ${
          audioSettings.soundEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}
        title={audioSettings.soundEnabled ? '关闭音效' : '开启音效'}
      >
        🔊
      </button>
    </div>
  );
};
