# BING 角色资产审计

日期：2026-06-13

本审计由 `tools/blender/create-bing-character-blockouts.py` 通过 Blender MCP 生成。当前目标是把默认玩家角色推进到“接近真人比例的半写实游戏角色”，不是最终真人级高模。

## 当前产物

- 源场景：`apps/client/public/assets/characters/source/bing-character-blockouts.blend`
- 每角色：LOD0 `.glb`、LOD1 `-lod1.glb`、头像、移动端头像、正面、侧面、3/4、桌面距离 QA 图
- 预算：LOD0 不超过 35000 faces；LOD1 不超过 12000 faces

| id | 中文名 | LOD0 vertices | LOD0 faces | LOD0 预算 | LOD1 vertices | LOD1 faces | LOD1 预算 | 移动头像 QA | 桌面距离 QA |
| --- | --- | ---: | ---: | --- | ---: | ---: | --- | --- | --- |
| `ember-guardian` | 烛火守卫 | 22868 | 23598 | 通过 | 2307 | 3838 | 通过 | `apps/client/public/assets/characters/ember-guardian/mobile-avatar.png` | `apps/client/public/assets/characters/ember-guardian/table-scale.png` |
| `jade-trickster` | 青玉术士 | 23326 | 24092 | 通过 | 2323 | 3896 | 通过 | `apps/client/public/assets/characters/jade-trickster/mobile-avatar.png` | `apps/client/public/assets/characters/jade-trickster/table-scale.png` |
| `violet-duelist` | 紫曦剑客 | 21778 | 22460 | 通过 | 2205 | 3654 | 通过 | `apps/client/public/assets/characters/violet-duelist/mobile-avatar.png` | `apps/client/public/assets/characters/violet-duelist/table-scale.png` |
| `solar-chef` | 日冕饼师 | 21738 | 22430 | 通过 | 2165 | 3624 | 通过 | `apps/client/public/assets/characters/solar-chef/mobile-avatar.png` | `apps/client/public/assets/characters/solar-chef/table-scale.png` |
| `crimson-mender` | 绯红医师 | 22702 | 23464 | 通过 | 2288 | 3806 | 通过 | `apps/client/public/assets/characters/crimson-mender/mobile-avatar.png` | `apps/client/public/assets/characters/crimson-mender/table-scale.png` |
| `iron-oracle` | 铁面观察者 | 14246 | 14432 | 通过 | 1494 | 2418 | 通过 | `apps/client/public/assets/characters/iron-oracle/mobile-avatar.png` | `apps/client/public/assets/characters/iron-oracle/table-scale.png` |

## 美术判断

- 已完成：统一 7-7.5 头身比例、角色体型差异、脸部体块、发型/头饰、服装层次、职业道具、LOD1、移动端头像和桌面距离渲染。
- 仍不足：还没有真实高模雕刻、PBR 贴图、布料法线、绑定和角色动作；真人质感仍需外部雕刻/贴图阶段继续推进。

## 下一步 P0

- 替换程序几何脸为雕刻面部或外部授权模型基底，减少“几何拼装感”。
- 为皮肤、布料、皮革、金属补法线/粗糙度贴图，而不是只靠纯色材质。

## 下一步 P1

- 在 `TableScene3D` 中接入 `.glb`，用桌面距离 QA 图校准相机和灯光。
- 为攻击、防御、技能、受伤、死亡建立 5 个基础动作剪影。
