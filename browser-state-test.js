// 在浏览器控制台运行此脚本来手动测试高级AI状态
console.log('=== 高级AI状态测试 ===');

// 获取当前状态
const store = window.useGameStore.getState();
console.log('当前状态:', {
  gameMode: store.gameMode,
  currentPlayer: store.currentPlayer,
  isAIThinking: store.isAIThinking,
  boardSum: store.board.flat().filter(c => c !== 0).length
});

// 切换到高级AI模式（如果还不是）
if (store.gameMode !== 'advanced') {
  console.log('切换到高级AI模式...');
  store.setGameMode('advanced');
}

// 重置游戏
console.log('重置游戏...');
store.resetGame();

// 等待一下然后进行落子测试
setTimeout(() => {
  console.log('准备玩家落子...');
  const success = store.makeMove(7, 7);
  console.log('玩家落子结果:', success);
  
  // 立即检查状态
  const immediateState = window.useGameStore.getState();
  console.log('落子后立即状态:', {
    currentPlayer: immediateState.currentPlayer,
    isAIThinking: immediateState.isAIThinking,
    boardSum: immediateState.board.flat().filter(c => c !== 0).length
  });
  
  // 1秒后再检查
  setTimeout(() => {
    const finalState = window.useGameStore.getState();
    console.log('1秒后最终状态:', {
      currentPlayer: finalState.currentPlayer,
      isAIThinking: finalState.isAIThinking,
      boardSum: finalState.board.flat().filter(c => c !== 0).length
    });
  }, 1000);
}, 100);
