import { spawn } from "child_process";
import path from "path";

const yiXinPath = path.join(process.cwd(), "YiXin-Wuziqi-API", "Yixin2018.exe");

console.log("Testing YiXin AI move...");

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
  await delay(1500);
}

async function testAIMove() {
  await delay(1000);
  
  await sendCommand("START 15");
  
  // 让AI先下（空棋盘）
  await sendCommand("BOARD");
  await sendCommand("DONE");
  
  await delay(3000); // 给更多时间让AI思考
  
  // 试试一步棋后的情况
  await sendCommand("BOARD");
  await sendCommand("8,8,1");  // 人类在中心下一子
  await sendCommand("DONE");
  
  await delay(3000);
  yixin.kill();
}

testAIMove();
