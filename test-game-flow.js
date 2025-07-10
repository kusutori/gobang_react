import { spawn } from "child_process";
import path from "path";

const yiXinPath = path.join(process.cwd(), "YiXin-Wuziqi-API", "Yixin2018.exe");

console.log("Testing YiXin game flow...");

const yixin = spawn(yiXinPath, [], {
  stdio: ["pipe", "pipe", "pipe"],
  cwd: path.dirname(yiXinPath),
});

yixin.stdout?.on("data", (data) => {
  console.log("YiXin:", data.toString().trim());
});

yixin.stderr?.on("data", (data) => {
  console.error("Error:", data.toString());
});

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendCommand(cmd) {
  console.log(`\n> ${cmd}`);
  yixin.stdin?.write(cmd + "\n");
  await delay(1000);
}

async function testGame() {
  await delay(1000);
  
  // 开始游戏
  await sendCommand("START 15");
  
  // 模拟一个简单的游戏流程
  await sendCommand("8,8");  // 人类下中心位置
  await sendCommand("7,7");  // AI会在之前的输出中给出建议位置
  await sendCommand("9,8");  // 人类下一步
  await sendCommand("10,8"); // 看AI如何回应
  
  yixin.kill();
}

testGame();
