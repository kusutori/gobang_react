import React, { useState, useEffect } from 'react';
import { themeService } from '../services/ThemeService';
import { useAuthStore } from '../store/authStore';

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
  const [currentTheme, setCurrentTheme] = useState(themeService.getCurrentTheme());
  
  // 从认证store获取用户数据
  const { isAuthenticated, userStats } = useAuthStore();

  useEffect(() => {
    // 如果已登录且有用户统计数据，优先使用Appwrite数据
    if (isAuthenticated && userStats) {
      const appwriteStats: GameStats = {
        totalGames: userStats.total_games,
        wins: userStats.wins,
        losses: userStats.losses,
        draws: userStats.draws,
        winRate: userStats.total_games > 0 ? Math.round((userStats.wins / userStats.total_games) * 100) : 0,
        currentStreak: userStats.current_streak,
        bestStreak: userStats.best_streak
      };
      setStats(appwriteStats);
      console.log('使用Appwrite统计数据:', appwriteStats);
      return;
    }

    // 如果未登录，从localStorage加载本地统计数据
    const savedStats = localStorage.getItem('gobang_stats');
    if (savedStats) {
      try {
        const parsedStats = JSON.parse(savedStats);
        console.log('从localStorage加载统计数据:', parsedStats);
        setStats(parsedStats);
      } catch (error) {
        console.error('解析统计数据失败:', error);
      }
    } else {
      console.log('未找到统计数据，使用默认值');
    }
    
    // 添加事件监听，当统计数据更新时刷新组件
    const handleStatsUpdate = (event: CustomEvent<GameStats>) => {
      console.log('接收到stats-updated事件:', event.detail);
      setStats(event.detail);
    };
    
    window.addEventListener('stats-updated', handleStatsUpdate as EventListener);
    console.log('已添加stats-updated事件监听器');
    
    // 手动触发一次更新，确保组件挂载后可以读取到最新状态
    const currentStats = localStorage.getItem('gobang_stats');
    if (currentStats) {
      try {
        window.dispatchEvent(new CustomEvent('stats-updated', { 
          detail: JSON.parse(currentStats)
        }));
      } catch (error) {
        console.error('手动触发stats-updated事件失败:', error);
      }
    }
    
    return () => {
      window.removeEventListener('stats-updated', handleStatsUpdate as EventListener);
      console.log('已移除stats-updated事件监听器');
    };
  }, [isAuthenticated, userStats]);

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

  const resetStats = () => {
    console.log('重置统计数据');
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
    console.log('统计数据已重置');
  };

  return (
    <div className={`${currentTheme.uiBackgroundClass} rounded-xl p-4 border-2`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-lg font-semibold ${currentTheme.headingColorClass}`}>📊 游戏统计</h3>
        <button
          onClick={resetStats}
          className={`text-xs ${currentTheme.subTextColorClass} hover:${currentTheme.textColorClass} transition-colors`}
          title="重置统计"
        >
          🔄
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex justify-between">
          <span className={`${currentTheme.subTextColorClass}`}>总局数</span>
          <span className={`font-medium ${currentTheme.textColorClass}`}>{stats.totalGames}</span>
        </div>
        <div className="flex justify-between">
          <span className={`${currentTheme.subTextColorClass}`}>胜率</span>
          <span className="font-medium text-green-600">{stats.winRate.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className={`${currentTheme.subTextColorClass}`}>胜局</span>
          <span className="font-medium text-green-600">{stats.wins}</span>
        </div>
        <div className="flex justify-between">
          <span className={`${currentTheme.subTextColorClass}`}>负局</span>
          <span className="font-medium text-red-600">{stats.losses}</span>
        </div>
        <div className="flex justify-between">
          <span className={`${currentTheme.subTextColorClass}`}>连胜</span>
          <span className="font-medium text-blue-600">{stats.currentStreak}</span>
        </div>
        <div className="flex justify-between">
          <span className={`${currentTheme.subTextColorClass}`}>最佳</span>
          <span className="font-medium text-purple-600">{stats.bestStreak}</span>
        </div>
      </div>
    </div>
  );
};

// 工具函数：更新统计数据
export const updateGameStats = (result: 'win' | 'lose' | 'draw', opponentType: string = 'ai') => {
  console.log('更新统计数据，结果:', result, '对手类型:', opponentType);
  
  // 导入并使用新的统计处理函数
  import('../utils/gameStats').then(({ handleGameResult }) => {
    handleGameResult(result, opponentType);
  });
};
