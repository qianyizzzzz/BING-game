# Visual Bible

这份文档用于固定《BING / 饼》的视觉和 UI 方向。每次一个界面被验证有效，就把规则沉淀到这里，作为之后 Codex、Figma、子智能体和美术资产制作的共同标准。

## Keywords

视觉关键词：

- 深渊竞技场
- 遗物牌桌
- 低饱和高对比
- 半写实角色
- 清晰 HUD
- 短促有力的结算反馈

## References

| Reference | Use This | Avoid This |
| --- | --- | --- |
| 深海/深渊科考仪表 | 冷色暗场、深度读数、信号噪声、层级感 | 把界面做成真实仪器说明书 |
| 桌面卡牌/自走棋 HUD | 座位、玩家状态、已提交/等待、资源读数 | 大量卡片堆叠导致无法读局 |
| 动作游戏结算反馈 | 命中、反弹、防御、技能触发的节奏感 | 过长动画挡住玩家继续判断 |

## Do

- 使用深色背景和高识别度强调色，让操作按钮和当前目标始终清楚。
- 重要按钮必须有明确 hover、pressed、selected、disabled 状态。
- HUD 只显示当前决策需要的信息：阶段、倒计时、已提交、未提交、目标、消耗。
- 桌面动画可以有冲击感，但不能遮掉 HP、饼、已出招状态。
- 移动端优先保证可玩：行动面板、提交按钮和当前选择不能被装饰压住。

## Do Not

- 不要塑料玩具感。
- 不要大圆角 SaaS 卡片感。
- 不要像普通网页后台或 CRM。
- 不要用无意义渐变、光球、背景装饰填空。
- 不要让文字解释 UI 动效；状态本身要能被看懂。

## Color Tokens

| Token | Color | Use |
| --- | --- | --- |
| Background | `#06110f` | 主背景、深渊空间 |
| Surface | `#101710` | 面板底、行动区 |
| Surface Raised | `#1c2216` | 牌桌 HUD、浮层 |
| Border | `#3c4631` | 分隔线、卡片描边 |
| Primary Text | `#f7f3df` | 主文字、标题 |
| Secondary Text | `#b9b49d` | 次要说明 |
| Accent | `#14b8a6` | 当前选择、可交互高亮 |
| Warning | `#f5b041` | 倒计时、资源不足、注意提示 |
| Danger | `#ef4444` | 伤害、死亡、失败 |
| Success | `#82c66f` | 治疗、成功、防御成立 |
| Disabled | `#4b5147` | 禁用按钮、不可用状态 |

## Typography

| Use | Font | Size Range | Notes |
| --- | --- | --- | --- |
| Title | 系统默认黑体 / sans-serif | 24-34px | 只用于首屏、阶段标题、结果标题 |
| UI Label | sans-serif semibold | 11-13px | HUD 标签、按钮辅助标签 |
| Body | sans-serif | 14-16px | 规则说明、提示、日志摘要 |
| Number | tabular-nums | 14-28px | HP、饼、倒计时、层级读数，必须稳定不跳宽 |

## UI Components

### Button

- Default: 深色底、细描边、图标在前、文字短。
- Hover: 边框和背景同时提亮，不改变尺寸。
- Pressed: 轻微内压，持续时间 80-120ms。
- Selected: 使用 `Accent` 描边和暗青底，必须比 hover 更明确。
- Disabled: 降低对比，不隐藏文字；能说明原因时放在 `title` 或附近提示。
- Controller focus: 2px 高对比描边，不能只依赖颜色变化。

### Panel

- Background: 深色半透明或实体暗面，避免纯黑。
- Border: 1px 低亮度描边，重点面板用 Accent/Warning 顶边或角标。
- Shadow: 少量硬阴影，表现桌面层级，不做柔软网页投影。
- Texture: 可用微弱噪点、扫描线、金属边，但不能影响文字。
- Radius: 6-8px；大型工具面板可 10px，但不要胶囊化。

### HUD

- Position: 顶部显示阶段和进度；牌桌内保留深度/层级/遗物读数；行动面板贴近底部或侧边。
- Information priority: 当前阶段 > 是否需要我行动 > 目标/消耗 > 倒计时 > 日志。
- Animation: 数值变化使用短促闪烁或滚动，持续 160-320ms。
- Collapse behavior: 移动端把日志、技能、规则收进 tabs；行动面板不可被折叠到找不到。

### Modal

- Entry animation: 120-180ms，轻微上移或缩放。
- Exit animation: 100-140ms，直接、干净。
- Confirm action: 主按钮使用 Accent 或 Warning，文案必须是动词。
- Cancel action: 次按钮弱化但可见，不使用危险色。

## Motion

- Hover: 80-120ms，按钮/座位轻微提亮。
- Click: 80ms 内给出按下反馈。
- Error: 220-320ms 轻微横向抖动或红色闪烁。
- Success: 180-300ms 绿色/青色脉冲。
- Damage or failure: 240-420ms 冲击波、短震、红色数字，但不能长期遮挡桌面。
- Reduced motion: 关闭大幅镜头晃动、粒子爆发和长位移，只保留透明度/颜色反馈。

## Character Art Direction

目标：把默认角色和玩家形象从 placeholder 推进到接近半写实游戏角色，同时保持“深渊遗物牌桌竞技”的可读性。

### Proportion

- 默认使用 7 到 7.5 头身比例。
- 头部、肩部、手部和标志性道具可以略微夸张，以保证桌面距离和移动端头像可读。
- 避免过度 Q 版、塑料玩具感和纯写实照片感。

### Materials

- Skin: 半写实皮肤，低油光，高粗糙度，保留眼窝、鼻梁、嘴部和手部体块。
- Cloth: 深色布料、轻微磨损、低饱和纹理。
- Leather: 暗棕/黑色皮革，边缘磨损，不要纯平色。
- Metal: 暖金属、铁面、旧铜，低亮度高边缘识别。
- Relic emissive: 只用于技能符号、道具核心和桌面呼应，不要全身发光。

### Roster Silhouette

| Character | Silhouette Rule | Key Prop |
| --- | --- | --- |
| 烛火守卫 | 厚重、稳定、护肩明显 | 护盾 / 暖金属 |
| 青玉术士 | 细长、飘逸、符件突出 | 青玉符件 |
| 紫曦剑客 | 锐利、前倾、快攻姿态 | 紫色刃痕 |
| 日冕饼师 | 圆润但不幼稚，资源运营感 | 饼炉 / 厨具 |
| 绯红医师 | 长袖、药剂、支援气质 | 红色药剂 |
| 铁面观察者 | 冷静、机械、面具强识别 | 铁面 / 观察仪 |

### Asset Gate

- 每个角色需要源文件、Web 可用导出、头像、正面/侧面/3/4 图。
- 桌面视角和移动端头像必须分别检查。
- 角色材质应接近半写实游戏角色，不像 placeholder 或塑料玩具。
- 未经授权不得使用可识别真人肖像作为模型目标。

## Screenshot Checklist

- [ ] 一眼能看出玩家当前目标。
- [ ] 主要操作按钮不会被背景淹没。
- [ ] 小屏幕下 UI 不重叠。
- [ ] 文字没有溢出容器。
- [ ] 视觉风格不像网页后台。
- [ ] 角色在桌面距离、座位卡和移动端头像中都能识别。
- [ ] 结算动画播放时仍能读到 HP、饼、已出招状态。
