import { spawn } from "child_process";
import path from "path";

const yiXinPath = path.join(process.cwd(), "YiXin-Wuziqi-API", "Yixin2018.exe");

console.log("Testing YiXin BOARD protocol...");

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

async function testBoardProtocol() {
  await delay(1000);
  
  // 开始游戏
  await sendCommand("START 15");
  
  // 尝试BOARD协议
  await sendCommand("BOARD");
  await sendCommand("8,8,1");  // 第一个玩家在8,8位置
  await sendCommand("DONE");   // 完成输入
  
  await delay(2000);
  yixin.kill();
}

testBoardProtocol();
