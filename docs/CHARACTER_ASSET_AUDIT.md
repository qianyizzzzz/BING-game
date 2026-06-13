# BING 角色资产审计

日期：2026-06-13

本审计由 `tools/blender/create-bing-character-blockouts.py` 通过 Blender MCP / Blender Python 生成。当前目标是把默认玩家角色推进到“接近真人比例的半写实游戏角色”，不是最终真人级高模。

## 当前产物

- 源场景：`apps/client/public/assets/characters/source/bing-character-blockouts.blend`
- 每角色：LOD0 `.glb`、LOD1 `-lod1.glb`、头像、移动端头像、正面、侧面、3/4、桌面距离 QA 图
- 动作 QA：每角色 `idle / attack / defend / skill / hit / down` 六张动作剪影图
- 绑定准备：每角色 `17` 根骨骼 guide armature 与 `rig-guide.png`；LOD0 GLB 已有 first-pass rigid skin weights，可由预览关键帧 clips 驱动，并导出 `skin-preview-attack / skill / hit / down` 蒙皮 QA 图；图中的琥珀骨架是目标姿态 overlay，用来检查 mesh 跟随、穿插和折断感，仍需手工权重绘制
- 建模：连续面部 sculpt surface、眼袋/法令/耳廓细节、手部拇指/指节/指甲、服装层次和职业道具
- 材质：皮肤、布料、皮革、金属、头发均带程序化 micro-bump、roughness variation 和导出的 albedo/normal/roughness PNG
- PBR 贴图目录：`apps/client/public/assets/characters/materials/pbr`，当前 `96` 张 PNG
- 材质近景 QA：`apps/client/public/assets/characters/materials/material-qa.png`
- 面部近景 QA：每角色 `face-detail.png`，用于检查眼球湿润高光、皮肤毛孔/小斑点、唇部阴影和面具磨损。
- 预算：LOD0 不超过 35000 faces；LOD1 不超过 12000 faces

| id | 中文名 | LOD0 vertices | LOD0 faces | LOD0 预算 | LOD1 vertices | LOD1 faces | LOD1 预算 | 移动头像 QA | 桌面距离 QA |
| --- | --- | ---: | ---: | --- | ---: | ---: | --- | --- | --- |
| `ember-guardian` | 烛火守卫 | 27509 | 28898 | 通过 | 11038 | 11265 | 通过 | `apps/client/public/assets/characters/ember-guardian/mobile-avatar.png` | `apps/client/public/assets/characters/ember-guardian/table-scale.png` |
| `jade-trickster` | 青玉术士 | 27751 | 29168 | 通过 | 10764 | 10983 | 通过 | `apps/client/public/assets/characters/jade-trickster/mobile-avatar.png` | `apps/client/public/assets/characters/jade-trickster/table-scale.png` |
| `violet-duelist` | 紫曦剑客 | 26879 | 28234 | 通过 | 10732 | 10951 | 通过 | `apps/client/public/assets/characters/violet-duelist/mobile-avatar.png` | `apps/client/public/assets/characters/violet-duelist/table-scale.png` |
| `solar-chef` | 日冕饼师 | 26839 | 28204 | 通过 | 10120 | 10411 | 通过 | `apps/client/public/assets/characters/solar-chef/mobile-avatar.png` | `apps/client/public/assets/characters/solar-chef/table-scale.png` |
| `crimson-mender` | 绯红医师 | 27383 | 28796 | 通过 | 10842 | 11139 | 通过 | `apps/client/public/assets/characters/crimson-mender/mobile-avatar.png` | `apps/client/public/assets/characters/crimson-mender/table-scale.png` |
| `iron-oracle` | 铁面观察者 | 13649 | 14052 | 通过 | 7834 | 7729 | 通过 | `apps/client/public/assets/characters/iron-oracle/mobile-avatar.png` | `apps/client/public/assets/characters/iron-oracle/table-scale.png` |

## 美术判断

- 已完成：统一 7-7.5 头身比例、角色体型差异、连续面部 sculpt surface、眼袋/法令/耳廓、手部拇指/指节/指甲、眼球湿润高光、皮肤毛孔/小斑点、唇部阴影、面部近景 QA、发型/头饰、服装层次、职业道具、guide armature、first-pass rigid skin weights、骨骼驱动蒙皮 QA、预览动画 clips、LOD1、移动端头像、桌面距离渲染、动作剪影 QA、材质近景 QA 和可追踪 PBR 贴图文件。
- 仍不足：还没有真实高模雕刻、手工/烘焙贴图、精细权重绘制和可播放精修动画；当前 LOD0 GLB 已有 skinned mesh 与 `idle / attack / defend / skill / hit / down` 预览动作，但 `skin-preview-*` 仍显示 mesh 跟随不足，动作质量还不能当最终游戏动画。

## 运行时验收

- 静态资产审计：`npm run test:assets`，覆盖 LOD0/LOD1 GLB、LOD0 skinned mesh、LOD0 动画命名、动作图、骨骼驱动蒙皮 QA、移动头像、turnaround、table-scale、face-detail、rig-guide、material QA 和 PBR 贴图包。
- 浏览器逐角色验收：`npm run test:character-browser`，创建角色房间并用观战视角验证 LOD1 GLB 请求和 3D canvas 采样。

## 下一步 P0

- 替换程序几何脸为雕刻面部或外部授权模型基底，减少“几何拼装感”。
- 用高模或授权基底烘焙替换当前程序化 PBR 贴图。

## 下一步 P1

- 验收 6 个角色 GLB 内的 `idle / attack / defend / skill / hit / down` 预览 clips，确认引擎侧能读取 animation names。
- 把 first-pass rigid skin weights 升级为精细权重绘制，把当前动作剪影和预览关键帧升级为高质量可播放蒙皮动画；每次改动后先用 `skin-preview-*` 排查穿插和剪影问题。
