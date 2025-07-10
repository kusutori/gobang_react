// 测试高级AI的具体执行过程
const createEmptyBoard = () => {
  return Array(15)
    .fill(null)
    .map(() => Array(15).fill(0));
};

// 创建一个简单的测试场景
const testBoard = createEmptyBoard();
testBoard[7][7] = 1; // 黑棋先手
testBoard[7][8] = 2; // 白棋应手

// 导入并测试AdvancedAI
import { AdvancedAI } from './src/game/ai/AdvancedAI.ts';

async function testAdvancedAI() {
  console.log('=== 开始测试高级AI ===');
  
  const ai = new AdvancedAI({
    difficulty: 'medium',
    depth: 4,
    timeout: 3000
  });
  
  console.log('AI配置:', ai.getConfig());
  console.log('测试棋盘状态:');
  for (let i = 6; i <= 8; i++) {
    console.log(`行${i}:`, testBoard[i].slice(6, 10));
  }
  
  try {
    console.log('开始调用AI.getMove...');
    const result = await ai.getMove(testBoard, 2); // 白棋落子
    console.log('AI返回结果:', result);
    console.log('=== 测试完成 ===');
  } catch (error) {
    console.error('AI测试失败:', error);
    console.error('错误堆栈:', error.stack);
  }
}

testAdvancedAI();
