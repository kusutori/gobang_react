import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { themeService } from '../services/ThemeService';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ isOpen, onClose }) => {
  const [currentTheme, setCurrentTheme] = useState(themeService.getCurrentTheme());
  const { user, userStats, gameRecords, logout } = useAuthStore();

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

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const calculateWinRate = () => {
    if (!userStats || userStats.total_games === 0) return 0;
    return Math.round((userStats.wins / userStats.total_games) * 100);
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`${currentTheme.uiBackgroundClass} rounded-2xl p-6 shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${currentTheme.headingColorClass}`}>
            用户资料
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* 用户信息 */}
        <div className="mb-6">
          <div className={`p-4 rounded-lg ${currentTheme.boardBackgroundClass} border-2`}>
            <h3 className={`text-lg font-semibold ${currentTheme.headingColorClass} mb-3`}>
              基本信息
            </h3>
            <div className="space-y-2">
              <p className={`${currentTheme.textColorClass}`}>
                <span className="font-medium">用户名：</span>{user.name || '未设置'}
              </p>
              <p className={`${currentTheme.textColorClass}`}>
                <span className="font-medium">邮箱：</span>{user.email}
              </p>
              <p className={`${currentTheme.textColorClass}`}>
                <span className="font-medium">注册时间：</span>
                {new Date(user.$createdAt).toLocaleDateString('zh-CN')}
              </p>
            </div>
          </div>
        </div>

        {/* 游戏统计 */}
        {userStats && (
          <div className="mb-6">
            <div className={`p-4 rounded-lg ${currentTheme.boardBackgroundClass} border-2`}>
              <h3 className={`text-lg font-semibold ${currentTheme.headingColorClass} mb-3`}>
                游戏统计
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${currentTheme.accentColorClass}`}>
                    {userStats.total_games}
                  </div>
                  <div className={`text-sm ${currentTheme.subTextColorClass}`}>总局数</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold text-green-600`}>
                    {userStats.wins}
                  </div>
                  <div className={`text-sm ${currentTheme.subTextColorClass}`}>胜利</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold text-red-600`}>
                    {userStats.losses}
                  </div>
                  <div className={`text-sm ${currentTheme.subTextColorClass}`}>失败</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold text-blue-600`}>
                    {userStats.draws}
                  </div>
                  <div className={`text-sm ${currentTheme.subTextColorClass}`}>平局</div>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className={`text-xl font-bold ${currentTheme.accentColorClass}`}>
                    {calculateWinRate()}%
                  </div>
                  <div className={`text-sm ${currentTheme.subTextColorClass}`}>胜率</div>
                </div>
                <div className="text-center">
                  <div className={`text-xl font-bold ${currentTheme.accentColorClass}`}>
                    {userStats.current_streak}
                  </div>
                  <div className={`text-sm ${currentTheme.subTextColorClass}`}>当前连胜</div>
                </div>
                <div className="text-center">
                  <div className={`text-xl font-bold ${currentTheme.accentColorClass}`}>
                    {userStats.best_streak}
                  </div>
                  <div className={`text-sm ${currentTheme.subTextColorClass}`}>最佳连胜</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 最近游戏记录 */}
        <div className="mb-6">
          <div className={`p-4 rounded-lg ${currentTheme.boardBackgroundClass} border-2`}>
            <h3 className={`text-lg font-semibold ${currentTheme.headingColorClass} mb-3`}>
              最近游戏记录
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {gameRecords.length > 0 ? (
                gameRecords.slice(0, 10).map((record, index) => (
                  <div key={record.$id || index} className={`flex justify-between items-center p-2 rounded ${currentTheme.isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        record.result === 'win' 
                          ? 'bg-green-200 text-green-800' 
                          : record.result === 'lose' 
                          ? 'bg-red-200 text-red-800' 
                          : 'bg-blue-200 text-blue-800'
                      }`}>
                        {record.result === 'win' ? '胜' : record.result === 'lose' ? '负' : '平'}
                      </span>
                      <span className={`text-sm ${currentTheme.textColorClass}`}>
                        VS {record.opponent_type}
                      </span>
                    </div>
                    <div className={`text-xs ${currentTheme.subTextColorClass}`}>
                      {new Date(record.played_at).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                ))
              ) : (
                <p className={`text-center ${currentTheme.subTextColorClass}`}>
                  暂无游戏记录
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            登出
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
