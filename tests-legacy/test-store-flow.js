// 创建一个专门测试Zustand store中AI调用的脚本
import { create } from 'zustand';
import { AdvancedAI } from './src/game/ai/AdvancedAI.ts';

// 模拟完整的store结构
const useGameStore = create((set, get) => ({
  board: Array(15).fill(null).map(() => Array(15).fill(0)),
  currentPlayer: 1,
  gameMode: 'advanced',
  isAIThinking: false,
  gameOver: false,
  advancedAI: null,
  
  makeMove: (row, col) => {
    console.log(`\n=== makeMove called: [${row}, ${col}] ===`);
    const state = get();
    console.log('当前状态:', {
      currentPlayer: state.currentPlayer,
      gameMode: state.gameMode,
      isAIThinking: state.isAIThinking,
      gameOver: state.gameOver,
      advancedAI: !!state.advancedAI
    });
    
    if (state.gameOver || state.board[row][col] !== 0) {
      console.log('落子失败: 游戏结束或位置被占用');
      return false;
    }

    // 更新棋盘
    const newBoard = state.board.map((r) => [...r]);
    newBoard[row][col] = state.currentPlayer;
    console.log('更新棋盘，当前玩家:', state.currentPlayer);

    set({
      board: newBoard,
      currentPlayer: state.currentPlayer === 1 ? 2 : 1,
    });

    const newState = get();
    console.log('棋盘更新后状态:', {
      currentPlayer: newState.currentPlayer,
      boardSum: newState.board.flat().filter(c => c !== 0).length
    });

    // AI逻辑
    if (state.gameMode === 'advanced' && newState.currentPlayer === 2) {
      console.log('轮到AI，开始思考...');
      set({ isAIThinking: true });
      
      let { advancedAI } = get();
      if (!advancedAI) {
        console.log('创建新的AdvancedAI实例');
        advancedAI = new AdvancedAI({ difficulty: 'medium' });
        set({ advancedAI });
        console.log('AdvancedAI实例已创建');
      }
      
      console.log('调用advancedAI.getMove()...');
      const aiPromise = advancedAI.getMove(newBoard, 2);
      console.log('Promise创建完成，等待结果...');
      
      aiPromise
        .then((result) => {
          console.log('\n=== AI Promise resolved ===');
          console.log('AI结果:', result);
          
          const currentState = get();
          console.log('Promise resolve时的状态:', {
            currentPlayer: currentState.currentPlayer,
            isAIThinking: currentState.isAIThinking,
            boardSum: currentState.board.flat().filter(c => c !== 0).length
          });
          
          if (currentState.board[result.row][result.col] === 0) {
            console.log(`AI落子到 [${result.row}, ${result.col}]`);
            const aiBoard = currentState.board.map((r) => [...r]);
            aiBoard[result.row][result.col] = 2;
            
            set({
              board: aiBoard,
              currentPlayer: 1,
              isAIThinking: false,
            });
            
            const finalState = get();
            console.log('AI落子后的最终状态:', {
              currentPlayer: finalState.currentPlayer,
              isAIThinking: finalState.isAIThinking,
              boardSum: finalState.board.flat().filter(c => c !== 0).length
            });
            console.log('=== AI回合完成 ===\n');
          } else {
            console.error('AI尝试落子到已占用位置');
            set({ isAIThinking: false });
          }
        })
        .catch((error) => {
          console.error('AI Promise rejected:', error);
          set({ isAIThinking: false });
        });
    }
    
    return true;
  }
}));

// 执行测试
console.log('开始测试完整的AI调用流程...\n');

async function runTest() {
  const store = useGameStore.getState();
  
  console.log('初始状态:', {
    currentPlayer: store.currentPlayer,
    gameMode: store.gameMode,
    boardSum: store.board.flat().filter(c => c !== 0).length
  });
  
  // 玩家落子
  console.log('\n>>> 玩家落子...');
  store.makeMove(7, 7);
  
  // 等待AI完成
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const finalState = useGameStore.getState();
  console.log('\n=== 最终状态 ===');
  console.log('当前玩家:', finalState.currentPlayer);
  console.log('AI思考中:', finalState.isAIThinking);
  console.log('棋子总数:', finalState.board.flat().filter(c => c !== 0).length);
  console.log('AI实例存在:', !!finalState.advancedAI);
  
  // 显示棋盘
  console.log('棋盘状态:');
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
}

runTest();
