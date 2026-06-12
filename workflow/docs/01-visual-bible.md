# Visual Bible

这份文档用于固定游戏的视觉和 UI 方向。每次你对一个界面满意，都把规则沉淀到这里。

## Keywords

视觉关键词：

- TODO: 压迫感
- TODO: 低饱和
- TODO: 高对比
- TODO: 机械感
- TODO: 破损感

## References

| Reference | Use This | Avoid This |
| --- | --- | --- |
| TODO: 参考 A | TODO: 光影、构图、情绪 | TODO: 过度写实 |
| TODO: 参考 B | TODO: UI 信息密度 | TODO: 复杂装饰 |
| TODO: 参考 C | TODO: 材质和按钮反馈 | TODO: 色彩过艳 |

## Do

- TODO: 使用深色背景和高识别度强调色。
- TODO: 重要按钮必须有明确 hover 和 selected 状态。
- TODO: HUD 只显示当前决策需要的信息。

## Do Not

- TODO: 不要塑料感。
- TODO: 不要大圆角 SaaS 卡片。
- TODO: 不要像普通网页后台。
- TODO: 不要无意义渐变背景。

## Color Tokens

| Token | Color | Use |
| --- | --- | --- |
| Background | `#TODO` | 主背景 |
| Surface | `#TODO` | 面板 |
| Border | `#TODO` | 分隔线 |
| Primary Text | `#TODO` | 主要文字 |
| Secondary Text | `#TODO` | 次要文字 |
| Accent | `#TODO` | 可交互或高亮 |
| Danger | `#TODO` | 危险、失败、低血量 |
| Disabled | `#TODO` | 禁用状态 |

## Typography

| Use | Font | Size Range | Notes |
| --- | --- | --- | --- |
| Title | TODO | TODO | TODO |
| UI Label | TODO | TODO | TODO |
| Body | TODO | TODO | TODO |
| Number | TODO | TODO | TODO |

## UI Components

### Button

- Default: TODO
- Hover: TODO
- Pressed: TODO
- Selected: TODO
- Disabled: TODO
- Controller focus: TODO

### Panel

- Background: TODO
- Border: TODO
- Shadow: TODO
- Texture: TODO
- Radius: TODO

### HUD

- Position: TODO
- Information priority: TODO
- Animation: TODO
- Collapse behavior: TODO

### Modal

- Entry animation: TODO
- Exit animation: TODO
- Confirm action: TODO
- Cancel action: TODO

## Motion

- Hover: TODO
- Click: TODO
- Error: TODO
- Success: TODO
- Damage or failure: TODO

## Character Art Direction

目标：把默认角色和玩家形象从 placeholder 推进到接近真人比例的半写实游戏角色，同时保持“深渊遗物牌桌竞技”的可读性。

### Proportion

- 默认使用 7 到 7.5 头身比例。
- 头部、肩部、手部和标志性道具可以略微夸张，以保证桌面距离和移动端头像可读。
- 避免过度 Q 版、塑料玩具感和纯写实照片感。

### Materials

- Skin: 半写实皮肤，低油光，高粗糙度，保留眼窝、鼻梁、嘴部和手部体块。
- Cloth: 深色布料、轻微磨损、低饱和纹理。
- Leather: 暗棕/黑色皮革，边缘磨损，不要纯平色。
- Metal: 暖金属、铁面、旧铜、低亮度高边缘识别。
- Relic emissive: 只用于技能符号、道具核心和桌面呼应，不要全身发光。

### Roster Silhouette

| Character | Silhouette Rule | Key Prop |
| --- | --- | --- |
| 烬火守卫 | 厚重、稳定、护肩明显 | 护盾/暖金属 |
| 青玉术士 | 细长、飘逸、符件突出 | 青玉符件 |
| 紫曜剑客 | 锐利、前倾、快攻姿态 | 紫色刀痕 |
| 日冕饼师 | 圆润但不幼稚，资源运营感 | 饼炉/厨具 |
| 绯红医师 | 长袍、药剂、支援气质 | 红色药剂 |
| 铁面观测者 | 冷静、机械、面具强识别 | 铁面/观测仪 |

### Blender Asset Gate

- 每个角色需要 `.blend` 源文件、`.glb` 导出、头像、正面/侧面/3/4 图。
- LOD0 建议不超过 35k triangles；LOD1 建议不超过 12k triangles。
- 头像裁切、桌面视角和移动端尺寸必须分别检查。
- 未经授权不得使用可识别真人肖像作为模型目标。

## Screenshot Checklist

- [ ] 一眼能看出玩家当前目标。
- [ ] 主要操作按钮不会被背景淹没。
- [ ] 小屏幕下 UI 不重叠。
- [ ] 文字没有溢出容器。
- [ ] 视觉风格不像网页后台。
- [ ] 角色在桌面距离、座位卡和移动端头像中都能识别。
- [ ] 角色材质接近半写实游戏角色，不像 placeholder 或塑料玩具。
