# 饼

《饼》是一个同时行动制、资源管理、猜拳克制、事件结算驱动的原创回合制卡牌策略游戏。

## 运行

```bash
npm install
npm run dev
```

- 前端: http://localhost:5173
- 后端: http://localhost:3001

## 当前实现

- 基础规则完整可玩：饼、小防、油条、石头、反弹、基础攻击、群攻、破弹、攻击对撞、特殊对撞、补刀、轮结束清饼。
- Socket.IO 房间：创建房间、加入房间、准备、同时提交出招、结算广播。
- 强类型共享规则包：前后端共用动作、状态、攻击定义、结算引擎。
- 技能扩展层：Excel 技能表导入为技能库，未来技能通过 hooks 接入结算流程。
- 比赛过程保存：服务端会落盘复盘快照和训练样本，见 [docs/AI_TRAINING.md](./docs/AI_TRAINING.md)。
- 公网部署骨架：服务端可托管前端静态文件，Docker 部署见 [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)。

详细架构见 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)。
