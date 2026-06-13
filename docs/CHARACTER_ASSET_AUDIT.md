# BING 角色资产审计

日期：2026-06-13

本审计由 `tools/blender/create-bing-character-blockouts.py` 通过 Blender MCP / Blender Python 生成。当前目标是把默认玩家角色推进到“接近真人比例的半写实游戏角色”，不是最终真人级高模。

## 当前产物

- 源场景：`apps/client/public/assets/characters/source/bing-character-blockouts.blend`
- 每角色：LOD0 `.glb`、LOD1 `-lod1.glb`、头像、移动端头像、正面、侧面、3/4、桌面距离 QA 图
- 动作 QA：每角色 `idle / attack / defend / skill / hit / down` 六张动作剪影图
- 绑定准备：每角色 `17` 根骨骼 guide armature 与 `rig-guide.png`；脚本内已有预览关键帧 clips，但尚未做权重蒙皮
- 建模：连续面部 sculpt surface、眼袋/法令/耳廓细节、手部拇指/指节/指甲、服装层次和职业道具
- 材质：皮肤、布料、皮革、金属、头发均带程序化 micro-bump、roughness variation 和导出的 albedo/normal/roughness PNG
- PBR 贴图目录：`apps/client/public/assets/characters/materials/pbr`，当前 `84` 张 PNG
- 材质近景 QA：`apps/client/public/assets/characters/materials/material-qa.png`
- 预算：LOD0 不超过 35000 faces；LOD1 不超过 12000 faces

| id | 中文名 | LOD0 vertices | LOD0 faces | LOD0 预算 | LOD1 vertices | LOD1 faces | LOD1 预算 | 移动头像 QA | 桌面距离 QA |
| --- | --- | ---: | ---: | --- | ---: | ---: | --- | --- | --- |
| `ember-guardian` | 烛火守卫 | 20859 | 21698 | 通过 | 2419 | 3687 | 通过 | `apps/client/public/assets/characters/ember-guardian/mobile-avatar.png` | `apps/client/public/assets/characters/ember-guardian/table-scale.png` |
| `jade-trickster` | 青玉术士 | 21101 | 21968 | 通过 | 2418 | 3711 | 通过 | `apps/client/public/assets/characters/jade-trickster/mobile-avatar.png` | `apps/client/public/assets/characters/jade-trickster/table-scale.png` |
| `violet-duelist` | 紫曦剑客 | 20229 | 21034 | 通过 | 2354 | 3577 | 通过 | `apps/client/public/assets/characters/violet-duelist/mobile-avatar.png` | `apps/client/public/assets/characters/violet-duelist/table-scale.png` |
| `solar-chef` | 日冕饼师 | 20189 | 21004 | 通过 | 2314 | 3547 | 通过 | `apps/client/public/assets/characters/solar-chef/mobile-avatar.png` | `apps/client/public/assets/characters/solar-chef/table-scale.png` |
| `crimson-mender` | 绯红医师 | 20733 | 21596 | 通过 | 2404 | 3663 | 通过 | `apps/client/public/assets/characters/crimson-mender/mobile-avatar.png` | `apps/client/public/assets/characters/crimson-mender/table-scale.png` |
| `iron-oracle` | 铁面观察者 | 11521 | 11748 | 通过 | 1487 | 2191 | 通过 | `apps/client/public/assets/characters/iron-oracle/mobile-avatar.png` | `apps/client/public/assets/characters/iron-oracle/table-scale.png` |

## 美术判断

- 已完成：统一 7-7.5 头身比例、角色体型差异、连续面部 sculpt surface、眼袋/法令/耳廓、手部拇指/指节/指甲、发型/头饰、服装层次、职业道具、guide armature、预览动画 clips、LOD1、移动端头像、桌面距离渲染、动作剪影 QA、材质近景 QA 和可追踪 PBR 贴图文件。
- 仍不足：还没有真实高模雕刻、手工/烘焙贴图、权重蒙皮和可播放蒙皮动画；当前 GLB 用于展示，运行时还不能播 `idle / attack / defend / skill / hit / down` 动作。

## 下一步 P0

- 替换程序几何脸为雕刻面部或外部授权模型基底，减少“几何拼装感”。
- 用高模或授权基底烘焙替换当前程序化 PBR 贴图。

## 下一步 P1

- 验收 6 个角色 GLB 内的 `idle / attack / defend / skill / hit / down` 预览 clips，确认引擎侧能读取 animation names。
- 给 guide armature 补权重蒙皮，把当前动作剪影和预览关键帧升级为可播放蒙皮动画。
