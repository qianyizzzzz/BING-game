# Roadmap

这个路线图用于把项目推进到可公开 Demo 和未来 Steam 上架。日期可以后续补。

## M0: Core Prototype

Goal:

```text
证明核心玩法在 10-30 秒内有趣。
```

Done when:

- [ ] 玩家可以完成一次核心循环。
- [ ] 有基础失败条件。
- [ ] 有基础奖励或进度反馈。
- [ ] 玩法不依赖说明文也能被理解。

## M1: Vertical Slice

Goal:

```text
做出 5-10 分钟、接近最终品质的可玩体验。
```

Done when:

- [ ] 有一个完整开局。
- [ ] 有一个完整核心挑战。
- [ ] 有失败状态。
- [ ] 有胜利、结算或阶段完成状态。
- [ ] 有接近最终方向的 UI。
- [ ] 有基础音效和反馈。
- [ ] 有设置、暂停、退出路径。

## M2: Public Demo Candidate

Goal:

```text
准备可公开试玩的 Demo。
```

Done when:

- [ ] Demo 有清晰开始和结束。
- [ ] 前 1 分钟能让玩家理解目标。
- [ ] 支持常见分辨率。
- [ ] 支持键鼠，尽量支持手柄。
- [ ] 没有已知阻塞崩溃。
- [ ] 有反馈收集方式。

## M3: Steam Store Page

Goal:

```text
建立可吸引愿望单的 Steam 页面。
```

Done when:

- [ ] 游戏名确定。
- [ ] 短描述和长描述完成。
- [ ] 标签方向确定。
- [ ] 截图至少 5 张。
- [ ] 预告片草稿完成。
- [ ] 胶囊图方向完成。
- [ ] Coming Soon 页面准备提交审核。

## M4: Content Complete

Goal:

```text
正式版主要内容完成。
```

Done when:

- [ ] 所有关卡、敌人、道具、系统完成。
- [ ] 存档和读档稳定。
- [ ] 设置菜单完整。
- [ ] 本地化文本整理。
- [ ] 主要性能问题解决。

## M5: QA and Release Candidate

Goal:

```text
准备发布候选版本。
```

Done when:

- [ ] 完整通关测试完成。
- [ ] Steam build 审核准备完成。
- [ ] 商店页审核通过。
- [ ] 关键 bug 清零。
- [ ] 发布说明草稿完成。

## Current Sprint

Focus:

```text
把 BING 从“可玩的网页原型”推进到“可受控公网试玩的游戏切片”。
```

Deliverable:

```text
双玩家 3 回合 playtest、移动端/桌面行动 HUD、底部命令区、角色 GLB 运行时 smoke、中文 README 和发布清单。
```

验收：

- `npm run typecheck`
- `npm run test:ui-agents`
- `npm run test:ui-agents:complex`
- `npm run test:character-browser -- --character=ember-guardian`
- `docs/PLAYTEST_REPORT.md` 指向最新报告。
- 重要步骤单独 commit，push 约每 3 小时一次。

下一步：

- 断线重连和多人集火 playtest。
- 技能参数二级抽屉。
- 许可证、资产权属和公开发布说明。
