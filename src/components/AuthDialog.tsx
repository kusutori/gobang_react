import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { themeService } from '../services/ThemeService';

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthDialog: React.FC<AuthDialogProps> = ({ isOpen, onClose }) => {
  const [currentTheme, setCurrentTheme] = useState(themeService.getCurrentTheme());
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  
  const { login, register, isLoading } = useAuthStore();

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

  // 重置表单
  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setError('');
  };

  // 切换登录/注册模式
  const toggleMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('请填写所有必需字段');
      return;
    }

    if (!isLogin && !name) {
      setError('请输入用户名');
      return;
    }

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      
      resetForm();
      onClose();
    } catch (error: any) {
      setError(error.message || '操作失败');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`${currentTheme.uiBackgroundClass} rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${currentTheme.headingColorClass}`}>
            {isLogin ? '登录账户' : '注册账户'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className={`block text-sm font-medium ${currentTheme.textColorClass} mb-1`}>
                用户名
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${currentTheme.textColorClass} focus:outline-none focus:ring-2 focus:ring-amber-500`}
                placeholder="请输入用户名"
                disabled={isLoading}
              />
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium ${currentTheme.textColorClass} mb-1`}>
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${currentTheme.textColorClass} focus:outline-none focus:ring-2 focus:ring-amber-500`}
              placeholder="请输入邮箱地址"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${currentTheme.textColorClass} mb-1`}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${currentTheme.textColorClass} focus:outline-none focus:ring-2 focus:ring-amber-500`}
              placeholder="请输入密码"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg shadow-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
          >
            {isLoading ? '处理中...' : (isLogin ? '登录' : '注册')}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={toggleMode}
              className={`text-sm ${currentTheme.accentColorClass} hover:underline`}
              disabled={isLoading}
            >
              {isLogin ? '没有账户？立即注册' : '已有账户？立即登录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
