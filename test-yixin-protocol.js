import { spawn } from "child_process";
import path from "path";

// YiXin可执行文件路径
const yiXinPath = path.join(process.cwd(), "YiXin-Wuziqi-API", "Yixin2018.exe");

console.log("Starting YiXin for protocol testing...");
console.log("YiXin path:", yiXinPath);

const process_yixin = spawn(yiXinPath, [], {
  stdio: ["pipe", "pipe", "pipe"],
  cwd: path.dirname(yiXinPath),
});

let outputBuffer = "";

process_yixin.stdout?.on("data", (data) => {
  const output = data.toString();
  outputBuffer += output;
  console.log("YiXin output:", output.trim());
});

process_yixin.stderr?.on("data", (data) => {
  console.error("YiXin error:", data.toString());
});

process_yixin.on("exit", (code) => {
  console.log("YiXin exited with code:", code);
});

// 测试一系列命令
const commands = [
  "START 15",
  "HELP", 
  "INFO",
  "BOARD",
  "MOVE 8,8",
  "YXNB",
  "TURN",
  "THINK",
  ""
];

let commandIndex = 0;

function sendNextCommand() {
  if (commandIndex < commands.length) {
    const command = commands[commandIndex];
    console.log(`\n--- Sending command ${commandIndex + 1}: "${command}" ---`);
    
    if (process_yixin.stdin) {
      process_yixin.stdin.write(command + "\n");
    }
    
    commandIndex++;
    
    // 等待响应后发送下一个命令
    setTimeout(sendNextCommand, 2000);
  } else {
    console.log("\n--- Testing complete ---");
    process_yixin.kill();
    process.exit(0);
  }
}

// 等待初始化后开始测试
setTimeout(sendNextCommand, 1000);
