import React, { useState, useEffect } from 'react';

interface FullscreenButtonProps {
  className?: string;
}

export const FullscreenButton: React.FC<FullscreenButtonProps> = ({ className = '' }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.error('Error attempting to enable full-screen mode:', err);
      }
    } else {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.error('Error attempting to exit full-screen mode:', err);
      }
    }
  };

  return (
    <button
      onClick={toggleFullscreen}
      className={`p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors ${className}`}
      title={isFullscreen ? '退出全屏' : '进入全屏'}
    >
      {isFullscreen ? '🔄' : '⛶'}
    </button>
  );
};
