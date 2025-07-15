// 简单的页面测试脚本，在浏览器控制台运行
console.log('开始高级AI UI测试...');

// 获取游戏store
const store = window.useGameStore?.getState();
if (!store) {
  console.error('未找到游戏store');
} else {
  console.log('当前游戏状态:', {
    currentPlayer: store.currentPlayer,
    gameMode: store.gameMode,
    isAIThinking: store.isAIThinking,
    boardSum: store.board.flat().filter(c => c !== 0).length
  });
  
  // 如果还没有棋子，模拟一次玩家落子
  if (store.board.flat().filter(c => c !== 0).length === 0) {
    console.log('模拟玩家落子...');
    
    // 切换到高级AI模式
    if (store.gameMode !== 'advanced') {
      store.setGameMode('advanced');
      console.log('已切换到高级AI模式');
    }
    
    // 玩家落子
    setTimeout(() => {
      const success = store.makeMove(7, 7);
      console.log('玩家落子结果:', success);
      
      // 等待AI响应
      setTimeout(() => {
        const finalState = window.useGameStore.getState();
        console.log('AI响应后状态:', {
          currentPlayer: finalState.currentPlayer,
          isAIThinking: finalState.isAIThinking,
          boardSum: finalState.board.flat().filter(c => c !== 0).length
        });
        
        // 显示棋盘
        console.log('最终棋盘:');
        for (let i = 0; i < 15; i++) {
          let hasContent = false;
          for (let j = 0; j < 15; j++) {
            if (finalState.board[i][j] !== 0) {
              hasContent = true;
              break;
            }
          }
          if (hasContent) {
            console.log(`行${i}:`, finalState.board[i].map(cell => cell === 0 ? '.' : cell).join(' '));
          }
        }
      }, 1000);
    }, 100);
  }
}
