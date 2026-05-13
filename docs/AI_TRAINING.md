# 《饼》AI 训练路线

当前最适合《饼》的 AI 路线不是直接上大模型，而是三层递进：

1. **规则评分 AI**：先把显然错误的随机行为换成可解释评分函数。
2. **数据驱动 AI**：保存真人和 AI 的每一次决策，把局面特征和动作导出为训练集。
3. **自我博弈 AI**：让多个策略版本反复对局，用胜率更新策略权重。

## 已经接入的数据

服务端会保存两类文件：

- `data/matches/<roomId>.json`：最新比赛快照，用于复盘。
- `data/snapshots/<roomId>.jsonl`：比赛过程中的状态快照流。
- `data/training/<roomId>.jsonl`：每次玩家或 AI 出招前的训练样本。

导出训练集：

```bash
npm run training:export
```

输出：

```text
data/training-dataset.jsonl
```

每行结构：

```json
{
  "gameId": "room_xxx",
  "playerKind": "human",
  "action": { "type": "gain_cake" },
  "features": {
    "selfHp": 6,
    "selfCakes": 0,
    "aliveEnemyCount": 3,
    "maxEnemyCakes": 0,
    "minEnemyHp": 6
  }
}
```

## 怎么训练

第一阶段建议训练一个轻量策略模型，而不是神经网络：

- 输入：`features`
- 输出：动作类型、攻击名、防御名、目标选择、重数
- 初始算法：逻辑回归、决策树、LightGBM、XGBoost 都可以
- 评估：让模型和当前 `scoreAction` AI 对战 1000 局，看胜率

第二阶段做自我博弈：

1. 固定当前 AI 为 baseline。
2. 新策略和 baseline 对战。
3. 如果新策略胜率超过 55%，替换 baseline。
4. 保存失败局，重点分析“为什么被人类一眼打穿”。

第三阶段再做强化学习：

- 状态：公开局面，不包含别人未亮出的动作。
- 动作：所有合法 `PlayerAction`。
- 奖励：胜利 +1，失败 -1，造成伤害小奖励，被命中小惩罚，浪费饼惩罚。

## 当前代码入口

- AI 策略：`apps/server/src/ai.ts`
- 决策样本记录：`apps/server/src/matchRecorder.ts`
- 训练集导出：`scripts/export-training-data.mjs`
