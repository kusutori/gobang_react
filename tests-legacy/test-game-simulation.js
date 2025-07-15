// 模拟前端游戏状态和AI调用流程
import { create } from 'zustand';
import { AdvancedAI } from './src/game/ai/AdvancedAI.ts';

// 创建简化的游戏状态管理
const createEmptyBoard = () => {
  return Array(15)
    .fill(null)
    .map(() => Array(15).fill(0));
};

const useGameStore = create((set, get) => ({
  board: createEmptyBoard(),
  currentPlayer: 1,
  gameMode: 'advanced',
  isAIThinking: false,
  advancedAI: null,
  
  makeMove: (row, col) => {
    console.log(`=== 玩家落子: [${row}, ${col}] ===`);
    const { board, currentPlayer, gameMode } = get();
    
    if (board[row][col] !== 0) {
      console.log('位置已被占用');
      return false;
    }
    
    // 更新棋盘
    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = currentPlayer;
    
    console.log('更新棋盘状态，切换到下一玩家');
    set({
      board: newBoard,
      currentPlayer: currentPlayer === 1 ? 2 : 1,
    });
    
    // 如果是高级AI模式且轮到AI
    if (gameMode === 'advanced' && (currentPlayer === 1 ? 2 : 1) === 2) {
      console.log('轮到AI下棋，开始思考...');
      set({ isAIThinking: true });
      
      let { advancedAI } = get();
      if (!advancedAI) {
        console.log('创建新的高级AI实例');
        advancedAI = new AdvancedAI({ difficulty: 'medium' });
        set({ advancedAI });
      }
      
      console.log('调用AI.getMove()...');
      advancedAI.getMove(newBoard, 2)
        .then((result) => {
          console.log('AI返回结果:', result);
          const { board: currentBoard } = get();
          
          if (currentBoard[result.row][result.col] === 0) {
            console.log(`AI落子: [${result.row}, ${result.col}]`);
            const aiBoard = currentBoard.map((r) => [...r]);
            aiBoard[result.row][result.col] = 2;
            
            set({
              board: aiBoard,
              currentPlayer: 1, // 下一轮轮到玩家
              isAIThinking: false,
            });
            
            console.log('AI落子完成，状态更新');
            // 打印棋盘状态
            console.log('当前棋盘状态:');
            for (let i = 0; i < 15; i++) {
              let hasContent = false;
              for (let j = 0; j < 15; j++) {
                if (aiBoard[i][j] !== 0) {
                  hasContent = true;
                  break;
                }
              }
              if (hasContent) {
                console.log(`行${i}:`, aiBoard[i].map(cell => cell === 0 ? '.' : cell).join(' '));
              }
            }
          } else {
            console.error('AI尝试下在已占用的位置');
            set({ isAIThinking: false });
          }
        })
        .catch((error) => {
          console.error('AI调用失败:', error);
          set({ isAIThinking: false });
        });
    }
    
    return true;
  }
}));

// 执行测试
console.log('=== 开始模拟游戏流程 ===');
const store = useGameStore.getState();

// 模拟玩家下第一子
console.log('玩家(黑棋)下第一子: [7, 7]');
store.makeMove(7, 7);

// 等待一段时间观察AI是否响应
setTimeout(() => {
  const finalState = useGameStore.getState();
  console.log('=== 最终状态检查 ===');
  console.log('当前玩家:', finalState.currentPlayer);
  console.log('AI是否在思考:', finalState.isAIThinking);
  console.log('AI实例是否存在:', !!finalState.advancedAI);
}, 2000);
