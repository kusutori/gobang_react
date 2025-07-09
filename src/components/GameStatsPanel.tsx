import React, { useState, useEffect } from 'react';

interface GameStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
}

export const GameStatsPanel: React.FC = () => {
  const [stats, setStats] = useState<GameStats>({
    totalGames: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
    currentStreak: 0,
    bestStreak: 0
  });

  useEffect(() => {
    // 从localStorage加载统计数据
    const savedStats = localStorage.getItem('gobang_stats');
    if (savedStats) {
      setStats(JSON.parse(savedStats));
    }
  }, []);

  const resetStats = () => {
    const newStats: GameStats = {
      totalGames: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winRate: 0,
      currentStreak: 0,
      bestStreak: 0
    };
    setStats(newStats);
    localStorage.setItem('gobang_stats', JSON.stringify(newStats));
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border-2 border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">📊 游戏统计</h3>
        <button
          onClick={resetStats}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          title="重置统计"
        >
          🔄
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">总局数</span>
          <span className="font-medium text-gray-800">{stats.totalGames}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">胜率</span>
          <span className="font-medium text-green-600">{stats.winRate.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">胜局</span>
          <span className="font-medium text-green-600">{stats.wins}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">负局</span>
          <span className="font-medium text-red-600">{stats.losses}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">连胜</span>
          <span className="font-medium text-blue-600">{stats.currentStreak}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">最佳</span>
          <span className="font-medium text-purple-600">{stats.bestStreak}</span>
        </div>
      </div>
    </div>
  );
};

// 工具函数：更新统计数据
export const updateGameStats = (result: 'win' | 'lose' | 'draw') => {
  const savedStats = localStorage.getItem('gobang_stats');
  let stats: GameStats = {
    totalGames: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
    currentStreak: 0,
    bestStreak: 0
  };

  if (savedStats) {
    stats = JSON.parse(savedStats);
  }

  stats.totalGames++;
  
  if (result === 'win') {
    stats.wins++;
    stats.currentStreak++;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
  } else if (result === 'lose') {
    stats.losses++;
    stats.currentStreak = 0;
  } else {
    stats.draws++;
    stats.currentStreak = 0;
  }

  stats.winRate = stats.totalGames > 0 ? (stats.wins / stats.totalGames) * 100 : 0;

  localStorage.setItem('gobang_stats', JSON.stringify(stats));
  
  // 触发自定义事件以更新UI
  window.dispatchEvent(new CustomEvent('stats-updated', { detail: stats }));
};
