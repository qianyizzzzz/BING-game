# BING 角色资产审计

日期：2026-06-13

本审计由 `tools/blender/create-bing-character-blockouts.py` 通过 Blender MCP / Blender Python 生成。当前目标是把默认玩家角色推进到“接近真人比例的半写实游戏角色”，不是最终真人级高模。

## 当前产物

- 源场景：`apps/client/public/assets/characters/source/bing-character-blockouts.blend`
- 每角色：LOD0 `.glb`、LOD1 `-lod1.glb`、头像、移动端头像、正面、侧面、3/4、桌面距离 QA 图
- 动作 QA：每角色 `idle / attack / defend / skill / hit / down` 动作剪影图
- 绑定准备：每角色 `17` 根骨骼 guide armature、`rig-guide.png`、LOD0 first-pass rigid skin weights、`skin-preview-*.png` 与 `idle / attack / defend / skill / hit / down` 预览动画 clips
- 建模：连续面部 sculpt surface、分层眼睛、睫毛/眉毛、口腔/牙齿、眼袋/法令/耳廓细节、手部拇指/指节/指甲、服装层次和职业道具
- 材质：皮肤、布料、皮革、金属、头发、虹膜、角膜、牙釉质和牙龈阴影均带程序化 micro-bump、roughness variation 和导出的 albedo/normal/roughness PNG
- PBR 贴图目录：`apps/client/public/assets/characters/materials/pbr`，当前 `123` 张 PNG
- 材质近景 QA：`apps/client/public/assets/characters/materials/material-qa.png`
- 面部近景 QA：每角色导出 `face-detail.png`，用于检查分层眼睛、虹膜/角膜高光、睫毛/眉毛、口腔/牙齿、皮肤毛孔/小斑点、唇部阴影和面具磨损。
- 预算：LOD0 不超过 35000 faces；LOD1 不超过 12000 faces

| id | 中文名 | LOD0 vertices | LOD0 faces | LOD0 预算 | LOD1 vertices | LOD1 faces | LOD1 预算 | 移动头像 QA | 桌面距离 QA |
| --- | --- | ---: | ---: | --- | ---: | ---: | --- | --- | --- |
| `ember-guardian` | 烛火守卫 | 30571 | 32168 | 通过 | 3383 | 5301 | 通过 | `apps/client/public/assets/characters/ember-guardian/mobile-avatar.png` | `apps/client/public/assets/characters/ember-guardian/table-scale.png` |
| `jade-trickster` | 青玉术士 | 30813 | 32438 | 通过 | 3382 | 5325 | 通过 | `apps/client/public/assets/characters/jade-trickster/mobile-avatar.png` | `apps/client/public/assets/characters/jade-trickster/table-scale.png` |
| `violet-duelist` | 紫曦剑客 | 29941 | 31504 | 通过 | 3318 | 5191 | 通过 | `apps/client/public/assets/characters/violet-duelist/mobile-avatar.png` | `apps/client/public/assets/characters/violet-duelist/table-scale.png` |
| `solar-chef` | 日冕饼师 | 29901 | 31474 | 通过 | 3278 | 5161 | 通过 | `apps/client/public/assets/characters/solar-chef/mobile-avatar.png` | `apps/client/public/assets/characters/solar-chef/table-scale.png` |
| `crimson-mender` | 绯红医师 | 30445 | 32066 | 通过 | 3368 | 5277 | 通过 | `apps/client/public/assets/characters/crimson-mender/mobile-avatar.png` | `apps/client/public/assets/characters/crimson-mender/table-scale.png` |
| `iron-oracle` | 铁面观察者 | 13649 | 14052 | 通过 | 1671 | 2527 | 通过 | `apps/client/public/assets/characters/iron-oracle/mobile-avatar.png` | `apps/client/public/assets/characters/iron-oracle/table-scale.png` |

## 美术判断

- 已完成：统一 7-7.5 头身比例、角色体型差异、连续面部 sculpt surface、分层眼睛、睫毛/眉毛、口腔/牙齿、眼袋/法令/耳廓、手部拇指/指节/指甲、发型/头饰、服装层次、职业道具、guide armature、LOD0 first-pass rigid skin weights、骨骼驱动蒙皮 QA、预览动画 clips、LOD1、移动端头像、桌面距离渲染、动作剪影 QA、材质近景 QA 和可追踪 PBR 贴图文件。
- 仍不足：还没有真实高模雕刻、手工/烘焙贴图、精细权重绘制和可播放精修动画；当前 LOD0 GLB 有 WIP 预览动作，LOD1 仍缺运行时 animation clips，真人质感也还需要外部雕刻/贴图阶段继续推进。

## 运行时验收

- 静态资产审计：`npm run test:assets`，覆盖 LOD0/LOD1 GLB、LOD0 skinned mesh、LOD0 动画命名、动作图、骨骼驱动蒙皮 QA、移动头像、turnaround、table-scale、face-detail、rig-guide、material QA 和 PBR 贴图包。
- 浏览器逐角色验收：`npm run test:character-browser`，创建角色房间并用观战视角验证 LOD1 GLB 请求和 3D canvas 采样。
- 当前运行时 `TableScene3D` 加载 LOD1；`npm run test:assets` 仍会提示 6 个 LOD1 暂无运行时 animation clips，角色可动性以 LOD0 WIP 预览验收为准。

## 下一步 P0

- 替换程序几何脸为雕刻面部或外部授权模型基底，减少“几何拼装感”。
- 用高模或授权基底烘焙替换当前程序化 PBR 贴图。
- 选择运行时动画策略：要么导出带 skin/animation 的 LOD1，要么让 `TableScene3D` 在桌面距离可控时使用可动 LOD0。

## 下一步 P1

- 用桌面距离 QA 图继续校准 `TableScene3D` 的相机、灯光和座位遮挡。
- 把 first-pass rigid skin weights 升级为精细权重绘制，让当前关键帧预览变成可播放的高质量蒙皮动画；每次改动后先看 `skin-preview-*`，再扩展死亡/倒地后的结算动作。
