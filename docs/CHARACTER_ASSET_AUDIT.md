# BING 角色资产审计

日期：2026-06-13

本审计由 `tools/blender/create-bing-character-blockouts.py` 通过 Blender MCP / Blender Python 生成。2026-06-15 复审后，当前资产只能作为技术占位和运行时管线验证，不能再按“已验收美术资产”宣传。下一阶段角色方向已从真人比例半写实改为“手绘搞怪动物角色”：松弛、略怪、有生活化道具，但不过度可爱，不做三国古风、偶像脸或塑料 3D 玩具。

## 2026-06-15 复审结论

- 当前角色仍有明显程序化 blockout / 几何拼装感，公开试玩前必须替换或大幅重做。
- 浏览器和静态审计只能证明 GLB、LOD、蒙皮、动画命名和截图管线可运行，不能证明角色已经达到最新手绘动物角色美术质量。
- 美术总监 Agent 之后必须把“几何体组合感”列为 P0，而不是 P1/P2 后续优化。
- 新验收目标：清楚的动物物种剪影、不过度可爱的搞怪表情、手绘油画/蛋彩质感、职业道具、服装层次、桌面距离可读性、移动头像可读性和可播放动画证据。

## 当前产物

- 源场景：`tools/blender/source/bing-character-blockouts.blend`
- 每角色：LOD0 `.glb`、LOD1 `-lod1.glb`、头像、移动端头像、正面、侧面、3/4、桌面距离 QA 图
- 动作 QA：每角色 `idle / attack / defend / skill / hit / down` 动作剪影图
- 绑定准备：每角色 `17` 根骨骼 guide armature、`rig-guide.png`、LOD0/LOD1 first-pass blended skin weights、`skin-preview-*.png` 与 `idle / attack / defend / skill / hit / down` 预览动画 clips
- 建模：当前仍保留旧半写实 blockout 结构和运行时 GLB 管线；这些结构只能证明导出链路可用，不能作为新动物角色方向的最终模型。
- 材质：当前 PBR 贴图仍服务于旧 blockout 管线；新方向应改成手绘毛发/羽毛/布料/颜料痕迹/亚克力道具等更低塑料感的贴图语言。
- PBR 贴图目录：`apps/client/public/assets/characters/materials/pbr`，当前 `123` 张 PNG
- 材质近景 QA：`apps/client/public/assets/characters/materials/material-qa.png`
- 面部近景 QA：每角色导出 `face-detail.png`，用于检查分层眼睛、虹膜/角膜高光、睫毛/眉毛、口腔/牙齿、皮肤毛孔/小斑点、唇部阴影和面具磨损。
- 预算：LOD0 不超过 40000 faces；LOD1 不超过 12000 faces

| id | 中文名 | LOD0 vertices | LOD0 faces | LOD0 预算 | LOD1 vertices | LOD1 faces | LOD1 预算 | 移动头像 QA | 桌面距离 QA |
| --- | --- | ---: | ---: | --- | ---: | ---: | --- | --- | --- |
| `ember-guardian` | 烛火守卫 | 37035 | 39140 | 通过 | 6387 | 11160 | 通过 | `apps/client/public/assets/characters/ember-guardian/mobile-avatar.png` | `apps/client/public/assets/characters/ember-guardian/table-scale.png` |
| `jade-trickster` | 青玉术士 | 37277 | 39410 | 通过 | 6404 | 11220 | 通过 | `apps/client/public/assets/characters/jade-trickster/mobile-avatar.png` | `apps/client/public/assets/characters/jade-trickster/table-scale.png` |
| `violet-duelist` | 紫曦剑客 | 36405 | 38476 | 通过 | 6280 | 10966 | 通过 | `apps/client/public/assets/characters/violet-duelist/mobile-avatar.png` | `apps/client/public/assets/characters/violet-duelist/table-scale.png` |
| `solar-chef` | 日冕饼师 | 36365 | 38446 | 通过 | 6240 | 10936 | 通过 | `apps/client/public/assets/characters/solar-chef/mobile-avatar.png` | `apps/client/public/assets/characters/solar-chef/table-scale.png` |
| `crimson-mender` | 绯红医师 | 36909 | 39038 | 通过 | 6363 | 11118 | 通过 | `apps/client/public/assets/characters/crimson-mender/mobile-avatar.png` | `apps/client/public/assets/characters/crimson-mender/table-scale.png` |
| `iron-oracle` | 铁面观察者 | 17187 | 17856 | 通过 | 3091 | 5246 | 通过 | `apps/client/public/assets/characters/iron-oracle/mobile-avatar.png` | `apps/client/public/assets/characters/iron-oracle/table-scale.png` |

## 美术判断

- 技术管线已完成：LOD0/LOD1 GLB、头像、turnaround、table-scale、face-detail、rig-guide、PBR PNG、first-pass blended skin weights、预览动画 clips 和浏览器加载验收。
- 美术质量未达标：当前仍像程序化几何体组合，也不符合最新“手绘搞怪动物”方向；缺少动物剪影、松弛表情、生活化道具、手绘材质、低塑料感和可播放精修动画。

## 运行时验收

- 静态资产审计：`npm run test:assets`，覆盖 LOD0/LOD1 GLB、LOD0/LOD1 skinned mesh、LOD0/LOD1 动画命名、动作图、骨骼驱动蒙皮 QA、移动头像、turnaround、table-scale、face-detail、rig-guide、material QA 和 PBR 贴图包。
- 浏览器逐角色验收：`npm run test:character-browser`，创建角色房间并用观战视角验证 LOD0 animated GLB 请求、3D canvas 采样和角色屏幕 BBox；最新报告 `artifacts/playtests/character-runtime-2026-06-13T23-56-29-228Z/report.md` 显示 6 个角色 minHeight 约 15%、minVisible 100%。
- 当前运行时 `TableScene3D` 加载 LOD0 skinned/animated GLB，并按 battle director cue 播放 `idle / attack / defend / skill / hit / down` 预览 clips；LOD1 已导出同名 skinned/animated clips，可作为后续性能档动态切换目标。

## 下一步 P0

- 按 `workflow/docs/01-visual-bible.md` 重建 6 个默认角色为手绘动物角色，禁止继续使用明显球体/圆柱/盒子拼装的角色作为美术产物。
- 先完成 6 张 512 头像和 mobile-avatar：物种剪影、表情、道具和身份必须一眼可读，且不过度可爱。
- 重做桌面小人：大头但不幼态，短躯干，手脚和道具可夸张，整体更像法式手绘动画角色而不是 3D 娃娃。
- 重做服装和道具层：围裙、领巾、外套、护具、餐盘、药瓶、观察镜等必须支撑角色身份。
- 用手绘/烘焙贴图替换当前程序化 PBR 贴图，明确 albedo / normal / roughness 或等价手绘纹理来源。
- 评估运行时是否按设备性能在 LOD0/LOD1 animated GLB 之间动态切换。

## 下一步 P1

- 继续扩展 `TableScene3D` 的相机、灯光和座位遮挡门禁：当前已有运行时 BBox，高级门禁还需要结合 readout、行动 dock 和 390px 移动端遮挡预算。
- 把 first-pass blended skin weights 升级为精细权重绘制，让当前关键帧预览变成可播放的高质量蒙皮动画；每次改动后先看 `skin-preview-*`，再扩展死亡/倒地后的结算动作。
