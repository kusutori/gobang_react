import React, { useState } from 'react';

interface QuickGuideProps {
  onClose: () => void;
}

export const QuickGuide: React.FC<QuickGuideProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: '欢迎来到五子棋！',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            这是一个功能完整的五子棋游戏，支持本地对战、人机对战和联机对战。
          </p>
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <span className="text-2xl">🎯</span>
            <span className="text-sm text-blue-800">目标：将5颗同色棋子连成一线即可获胜</span>
          </div>
        </div>
      )
    },
    {
      title: '基本游戏规则',
      content: (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚫</span>
            <div>
              <p className="font-medium text-gray-800">黑棋先行</p>
              <p className="text-sm text-gray-600">游戏开始时，黑棋方先下棋</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl">📍</span>
            <div>
              <p className="font-medium text-gray-800">落子规则</p>
              <p className="text-sm text-gray-600">点击网格线交叉点处落子，已有棋子的位置不能再次落子</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl">🏆</span>
            <div>
              <p className="font-medium text-gray-800">获胜条件</p>
              <p className="text-sm text-gray-600">横、竖、斜任意方向连成5子即获胜</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '主题和设置',
      content: (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">🎨</span>
            <div>
              <p className="font-medium text-gray-800">多种棋盘主题</p>
              <p className="text-sm text-gray-600">6种精美主题随心切换：经典木纹、现代深色、翡翠绿等</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl">🔊</span>
            <div>
              <p className="font-medium text-gray-800">音效系统</p>
              <p className="text-sm text-gray-600">支持背景音乐和落子音效，可单独控制开关和音量</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl">⛶</span>
            <div>
              <p className="font-medium text-gray-800">全屏模式</p>
              <p className="text-sm text-gray-600">支持全屏游戏，获得更沉浸的体验</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '游戏模式',
      content: (
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🎮</span>
              <span className="font-medium text-amber-800">本地游戏</span>
            </div>
            <p className="text-sm text-amber-700">支持双人对战和人机对战，AI有多个难度等级</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🌐</span>
              <span className="font-medium text-blue-800">联机对战</span>
            </div>
            <p className="text-sm text-blue-700">支持局域网内多人对战，创建房间或加入房间</p>
          </div>
        </div>
      )
    },
    {
      title: '开始游戏！',
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <span className="text-6xl">🎉</span>
            <p className="text-lg font-medium text-gray-800 mt-3">准备好开始对局了吗？</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
              <span className="text-green-600">💡</span>
              <span className="text-sm text-green-800">点击棋盘网格交叉点落子</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
              <span className="text-blue-600">⚙️</span>
              <span className="text-sm text-blue-800">随时可以打开设置调整主题和音效</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-purple-50 rounded">
              <span className="text-purple-600">📊</span>
              <span className="text-sm text-purple-800">游戏统计会自动记录你的战绩</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipGuide = () => {
    localStorage.setItem('gobang_guide_shown', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">{steps[currentStep].title}</h2>
          <button
            onClick={skipGuide}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          {steps[currentStep].content}
        </div>

        {/* 步骤指示器 */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* 控制按钮 */}
        <div className="flex justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`px-4 py-2 rounded-lg transition-colors ${
              currentStep === 0 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-gray-500 text-white hover:bg-gray-600'
            }`}
          >
            上一步
          </button>
          
          <button
            onClick={skipGuide}
            className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            跳过
          </button>
          
          {currentStep < steps.length - 1 ? (
            <button
              onClick={nextStep}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              下一步
            </button>
          ) : (
            <button
              onClick={skipGuide}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              开始游戏
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
