# 轮询订阅管理修复测试

## 修复内容

### 问题原因

- `useEffect([currentRoom?.$id])` 依赖整个房间对象的 ID
- 每次房间状态更新（如棋盘数据变化）都会导致 currentRoom 对象更新
- 这会触发 useEffect 重新执行，导致轮询被清理并重新创建
- 结果：玩家 2 无法持续接收更新，因为轮询被频繁中断

### 修复方案

1. 添加独立的 `currentRoomId` 状态变量
2. 修改 useEffect 依赖为 `[currentRoomId]`
3. 只在房间真正改变时更新 roomId：
   - `handleRoomCreated`: 设置新的 roomId
   - `handleRoomJoined`: 设置新的 roomId
   - `handleRoomLeft`: 清空 roomId
   - 其他事件：只更新 currentRoom 内容，不更新 roomId

### 预期效果

- 轮询订阅只在房间 ID 真正改变时重建
- 房间内容更新（如棋盘状态）不会影响轮询持续性
- 玩家 2 能持续接收实时更新

## 测试步骤

1. 创建房间并让两个玩家加入
2. 观察控制台日志：
   - 应该只看到一次 "🔔 创建新的房间轮询"
   - 不应该看到频繁的 "🧹 清理房间轮询"
3. 玩家 1 落子，检查玩家 2 是否能看到更新
4. 确认双向同步正常工作

## 关键指标

- 轮询创建次数：应该只在加入房间时创建一次
- 轮询清理次数：应该只在离开房间时清理一次
- 同步延迟：玩家 2 应该在 2 秒内看到玩家 1 的棋子
