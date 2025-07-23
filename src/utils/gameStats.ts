import { useAuthStore } from '../store/authStore';

// 处理游戏结果并保存到Appwrite
export const handleGameResult = async (
  result: 'win' | 'lose' | 'draw',
  opponentType: string,
  gameStartTime?: number,
  movesCount?: number
) => {
  const { isAuthenticated, saveGameResult } = useAuthStore.getState();
  
  // 如果用户已登录，保存到Appwrite
  if (isAuthenticated) {
    const gameRecord = {
      opponent_type: opponentType,
      result,
      game_duration: gameStartTime ? Math.round((Date.now() - gameStartTime) / 1000) : undefined,
      moves_count: movesCount,
    };
    
    try {
      await saveGameResult(gameRecord);
      console.log('游戏记录已保存到Appwrite:', gameRecord);
    } catch (error) {
      console.error('保存游戏记录失败:', error);
    }
  } else {
    // 如果未登录，继续使用localStorage逻辑
    updateLocalStats(result);
  }
};

// 更新本地统计数据（向后兼容）
export const updateLocalStats = (result: 'win' | 'lose' | 'draw') => {
  const savedStats = localStorage.getItem('gobang_stats');
  let stats = {
    totalGames: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
    currentStreak: 0,
    bestStreak: 0
  };

  if (savedStats) {
    try {
      stats = JSON.parse(savedStats);
      console.log('读取到现有统计数据:', stats);
    } catch (error) {
      console.error('解析已保存的统计数据失败:', error);
    }
  } else {
    console.log('未找到已保存的统计数据，使用默认值');
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

  // 计算胜率
  if (stats.totalGames > 0) {
    stats.winRate = Math.round((stats.wins / stats.totalGames) * 100);
  }

  // 保存到localStorage
  localStorage.setItem('gobang_stats', JSON.stringify(stats));
  
  // 发出事件通知其他组件更新
  window.dispatchEvent(new CustomEvent('stats-updated', { detail: stats }));
  
  console.log('本地统计数据已更新:', stats);
};
