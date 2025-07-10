// 高级AI测试脚本
import { AdvancedAI } from './src/game/ai/AdvancedAI';

console.log('🧠 测试高级AI功能...');

const testBoard = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,0,0,0,0,0,0,0], // 黑棋在中心
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];

async function testAdvancedAI() {
  try {
    const ai = new AdvancedAI({ difficulty: 'easy', depth: 4 });
    
    console.log('📊 测试简单模式...');
    const result = await ai.getMove(testBoard, 2); // 白棋(2)
    
    console.log('✅ 高级AI结果:', {
      position: `(${result.row}, ${result.col})`,
      confidence: `${result.confidence}%`,
      searchDepth: result.searchDepth,
      timeUsed: `${result.timeUsed}ms`
    });
    
  } catch (error) {
    console.error('❌ 高级AI测试失败:', error);
  }
}

testAdvancedAI();
