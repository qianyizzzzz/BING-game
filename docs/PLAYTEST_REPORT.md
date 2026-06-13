# BING Playtest 子智能体报告

日期：2026-06-13  
最新自动化报告：`artifacts/playtests/ui-agents-2026-06-13T21-00-22-591Z/report.md`
最新复杂技能 smoke：`artifacts/playtests/ui-agents-2026-06-13T20-56-42-947Z/report.md`
最新角色浏览器 smoke：`artifacts/playtests/character-runtime-2026-06-13T17-16-00-934Z/report.md`

## 结论

当前版本的双玩家 happy path 可以跑通：首屏 CTA 准备流程、创建房间、加入房间、开始游戏、吃饼、沿用上回合、攻击、目标预览、行动 HUD 下一步提示、底部命令区固定可见、BattleDirector cue、3D canvas、GLB 加载、移动端 LOD1/桌面 LOD0 分流、placeholder 网络请求检查、遮挡检查、console 检查和新手结算摘要门禁均通过。
但这还不是“新玩家一眼就懂、竞技玩家愿意反复玩”的状态。下一阶段重点应该放在：竞技读局层、复杂技能中帧验证、运行时角色 LOD/可读性、技能参数抽屉和平衡数据。

## 2026-06-13 午间子智能体复审

- 新手玩家 Agent：前三回合最缺“为什么这样结算”的白话摘要。提交后也要明确“你已提交什么，还差谁，一起亮招”。
- 竞技玩家 Agent：读局层还缺上一招、HP/饼 delta、目标线、威胁阈值和动画加速；有 target 的 cue 必须映射到座位或目标线。
- 开发商/QA Agent：GitHub Actions 已补基础 CI、UI agents 夜间 workflow 和手动角色浏览器 workflow；应继续扩展多人、断线重连、复杂技能窗口和 release 体积预算。
- 美术总监 Agent：LOD0/LOD1 已有 first-pass blended skin、同名预览 clips 和 `skin-preview-*` QA，足够 WIP 管线验收；下一步是精修权重、动作过渡和 LOD 运行时切换。

## 2026-06-13 晚间子智能体复审

- 新手玩家 Agent：首屏主 CTA 直接建房仍可能跳过昵称/角色选择；移动端不能隐藏“现在该干什么”；本轮已把“动作 / 目标 / 结果”的新手结算摘要落到桌面，并由 UI agent 检查目标绑定。
- 竞技玩家 Agent：行动 dock 在移动端仍像滚动表单，下一步应做固定底部主指令条；按钮字号和触控高度需要回到 13-14px / 44px 以上；复杂技能需要目标线、资源 delta 和更强锁定/亮招节拍。
- 开发商 Agent：当前适合受控公网试玩，不适合正式公开发布；下一批工程项是复杂技能浏览器门禁、安全白名单、数据备份和许可证/资产权属。
- 美术总监 Agent：角色 GLB 管线已打通，但运行时角色仍偏小、剪影差异不足；下一批美术项是角色可读性、职业剪影、LOD 运行时策略、placeholder 清理和材质应用 QA。

## 玩家 Agent A：新手可用性

状态：能完成操作，但理解仍依赖日志和教程。

主要发现：

- 房间准备阶段不应显示“第 1 轮 / 第 1 回合”，否则新手会误以为游戏已经开始。
- 移动端行动面板信息密度高，目标、当前选择、消耗和提交按钮需要更靠近首屏。
- `DEPTH / LAYER / RELIC` 等氛围读数有质感，但对新手不解释规则价值，容易抢注意力。
- 结算日志可用于复盘，但桌面内还缺少一句“谁做了什么、为什么扣血/加饼”的白话总结。
- 第一局推荐在前 3 回合提供更直接的提示：吃饼、攻击目标、防御类型、提交后等待亮招。

立即修改建议：

- 准备阶段显示“房间准备 / 等待房主开始”。
- 移动端把“当前选择 + 目标 + 提交”做成更稳定的底部操作区。
- 结算后在桌面或座位上显示 HP/饼 delta 和一句自然语言摘要。
- UI agent 增加首屏可见性检查：提交按钮、目标选择和阶段文案不能互相矛盾。

## 玩家 Agent B：竞技与游戏性

状态：核心策略框架成立，但平衡风险集中在防御和反弹。

主要发现：

- 攒饼、攻击、防御、反弹和技能之间有张力。饼会因为本轮有人受伤而清空，所以资源路线不是无脑发育。
- 风险信号来自自博：防御生存和反弹伤害路线胜率偏高，高费核爆/秒杀路线偏弱。
- 2 人局容易收敛为“攒饼 / 猜防 / 反弹”的循环；多人局群攻、反弹和集火会放大政治性和突然死亡。
- “沿用上回合”对高手很好，但也可能放大连续吃饼或连续防守的惯性。

下一轮平衡建议：

- 按 2/3/4/6 人分别统计平均回合数、连续无伤回合、防御成功率、反弹收益和群攻伤害。
- 先验证防御/反弹是否真的过强，再决定是否增加连续防守成本或削弱反弹收益。
- 补强 4-7 饼区间的中途威胁，让高费路线有可见压力，而不是只等最终大招。
- 为竞技模式增加读局层：上一招、饼量变化、敌方威胁阈值、目标线和结算摘要。

## 开发商 Agent：QA 与仓库质量

状态：可试玩，发布验收暂缓。

当前通过项：

- `npm run test:ui-agents` 最近一次通过，无 console error、无 failed action、无视觉 QA 告警。
- `npm run test:ui-agents:complex` 最近一次通过，覆盖“单房主 + 2 个 AI 对手”的火箭双目标技能 smoke，HUD 目标数 2，座位映射 2/2，结算 cueTargets=2、summaryTargets=2。
- `npm run test:ui-agents` 和 `npm run test:character-browser` 会先执行 `npm run build -w @bing/client`，避免浏览器验收使用过期 `apps/client/dist`。
- 双端 canvas 正常渲染，并检测到运行时 LOD0 animated GLB 成功加载。
- UI agent 已覆盖目标预览、沿用上回合、遮挡检查、结算 cue、cue target 到座位的映射。
- UI agent 已覆盖行动 HUD：攻击模式下必须显示下一步、目标数、目标 id 和可提交状态。
- UI agent 已覆盖底部命令区：移动端和桌面端提交按钮保持可见，触控高度不低于 44px。
- UI agent 已覆盖新手结算摘要：当 readout 已播放到系统步骤时，摘要仍要保留本轮真实动作、目标绑定和目标座位映射。
- UI agent 已覆盖运行时 LOD 分流：390px 移动端加载 `*-lod1.glb`，1280px 桌面端加载 LOD0 `*.glb`。
- UI agent 已覆盖公开战斗画面 Network 检查：不应再请求 `/assets/placeholders/`。
- UI agent 已覆盖首屏 CTA：点击后必须进入玩家准备区并聚焦玩家名，不能直接跳过昵称/角色确认创建房间。
- `npm run test:character-browser` 已逐个验证 6 个角色：期望 GLB 与观察 GLB 一致，canvas 非空，console/page error 为无。

缺口：

- GitHub Actions 已补 `build + test:ci`、夜间 UI agents 和手动角色浏览器 workflow。
- UI agent 已覆盖 2 玩家 3 回合 happy path 和一条复杂技能 smoke；仍未覆盖断线重连、多人集火、观战和公网 tunnel。
- 6 个角色的浏览器加载验收已通过，LOD0/LOD1 GLB 均已具备可读取的预览动画 clips。
- 角色资产仍是 WIP/blockout，未完成精细权重绘制、可播放动作和最终授权说明。

收尾建议：

- 保持小步 commit，不把半生成资产和代码混在一起。
- 09:30 前优先做 README、交接文档、基础测试和最后 push。
- 后续把复杂技能链、断线重连和多人集火放进可选浏览器 CI。

## 美术总监 Agent：UI 与动画方向

状态：美术方向清楚，但桌面演出还需要从“网页 UI”继续推向“游戏 HUD”。

UI 优化方法：

- 把结算 overlay 逐步改成桌面内演出：桌心 reveal strip、座位目标线、HP/饼 delta、状态徽章。
- 行动 dock 只承担一个主任务：当前行动、目标、消耗、提交。高级技能参数折叠到二级层。
- 右侧信息改为上下文 tabs：提示、日志、技能、规则只突出当前最相关的一项。
- 桌面中心补实体元素：牌堆、弃牌、遗物刻度、当前回合牌、目标线落点。

动画方案：

- 扩展 `BattleDirector`：已统一 active cue、座位高亮和 3D 镜头脉冲；下一步驱动技能 VFX 分层、音效资源和新手结算摘要。
- 标准节奏：锁定 200ms、亮招 600-800ms、预备 250ms、冲击 80-140ms hit-stop、余波 500ms、回中 300ms。
- 角色动作目标：`idle / attack / defend / skill / hit / down`，运行时用 `THREE.AnimationMixer` 做 80-160ms crossfade。
- 当前桌面运行时加载 LOD0 animated GLB；LOD1 已具备同名 first-pass skin 与预览 clips，下一步是做设备性能档切换、动作 crossfade 和精修权重。

## 本轮已落实

- 3D 桌面开始加载角色 animated GLB，并在 UI agent 报告中检测 `.glb` 响应。
- UI agent 截图 helper 增加更稳定的 timeout、动画禁用和重试。
- 六个角色补齐 `action-down.png` 倒地剪影。
- 房间准备阶段 HUD 改为“房间准备 · 等待开始”，避免显示回合数造成误解。
- `scripts/ui-playtest-agents.ts` 增加 lobby 文案回归检查，并把第三回合流程稳定为“新手攻击、竞技玩家吃饼承压”。
- 行动面板顶部新增“下一步 / 目标 / 状态”HUD，明确是否可提交和不可提交原因；UI agent 会检查目标数、目标 id 和 ready 状态。
- 行动面板底部新增 portal HUD 命令区，“沿用上回合 / 提交”固定在视窗内；UI agent 会检查按钮可见性和 44px 触控高度。

## 2026-06-14 凌晨子智能体复审

- 新手玩家 Agent：优先修正可行动阶段文案，避免“正在收招”让人误解为结算中；技能提交和结算摘要必须显示技能名与目标；禁用提交时需要“原因 + 补救动作”。
- 竞技玩家 Agent：火箭等目标型技能必须在提交、亮招、摘要和 VFX 阶段保留 source/target；下一步做上一招、HP/饼 delta、威胁阈值和 2/3/4/6 人平衡遥测。
- 开发商/QA Agent：受控公网试玩可以继续，但公开 demo 前要收紧生产 Origin、清理 public 资产边界、补 LICENSE/资产权属、持久化备份和发布产物审计。
- 美术总监 Agent：角色与桌面仍偏 WIP；P0 是技能 VFX target 绑定、角色运行时可读尺寸、桌面中心遮挡控制和 6 角色浏览器报告口径。

本轮已落实：

- 行动状态 pill 从“正在收招”改为“请选择行动 / 等待亮招”，降低新手误解。
- 技能攻击提交按钮显示具体技能名，例如“提交：火箭”，并暴露 `data-submit-label` 供 UI agent 检查。
- `BattleDirector` / readout / summary 从同回合 `turn_revealed.actions` 反查技能目标，火箭复杂技能已验证 `cueTargets=2`、`summaryTargets=2`。
- 夜间 Browser Playtest workflow 已加入 `npm run test:ui-agents:complex`。
