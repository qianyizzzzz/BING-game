# TASK-006 手绘搞怪动物角色资产升级

## Goal

把当前 6 个默认角色从技术 blockout 升级为油画纸面质感的手绘搞怪动物游戏角色。当前几何体组合资产只保留为运行时、LOD、蒙皮和动画管线验证，不再作为公开试玩美术目标。

## Why It Matters

现在的角色一眼能看出是基础几何体拼装，削弱“真实游戏”的第一印象，也让牌桌动画、攻击反馈和角色头像显得像原型。公开试玩前必须让角色至少达到“有物种剪影、有表情、有生活化道具、能绑定、能动画、近景不露怯”的质量。

## Scope

- 覆盖 `apps/client/src/lib/characters.ts` 中 6 个默认角色。
- 允许使用 Blender MCP、Blender Python、程序化草模、授权参考图和用户授权素材。
- 不允许使用未授权可识别真人肖像。
- 不把简单球体、圆柱、盒子、胶囊体组合包装成成品角色。
- 不做三国古风、偶像脸、糖水萌宠或塑料玩具质感。

## Art Director P0 Gate

- 角色比例：大头短躯干、四肢清楚、动物物种剪影明确；不能回到 7 头身人物、偶像脸或写实人脸。
- 面部：眼神、嘴部、耳朵/角/鼻口部位有表情节奏；不能是球形头贴五官。
- 手脚：爪、蹄、蹼、手套或等价动物化手脚结构可读，动作姿态能服务出招。
- 服装：有厚度、接缝、袖口、领口、褶皱和生活化道具，支撑角色身份。
- 材质：毛发、羽毛、皮肤、布料、纸面颜料边缘和低塑料感纹理至少有 albedo / normal / roughness 或等价手绘贴图证据。
- 绑定：LOD0/LOD1 GLB 通过 skinned mesh、JOINTS_0、WEIGHTS_0、animation clip 检查。
- 动画：idle / attack / defend / skill / hit / down 至少有可播放预览，不能只靠静态姿势截图。

## Required Outputs

- `{characterId}.blend` 源文件或明确的可复现 Blender Python 生成脚本。
- LOD0 `{characterId}.glb` 与 LOD1 `{characterId}-lod1.glb`。
- `portrait.png`、`mobile-avatar.png`、`face-detail.png`、`turnaround-front.png`、`turnaround-side.png`、`turnaround-three-quarter.png`、`table-scale.png`。
- `action-idle.png`、`action-attack.png`、`action-defend.png`、`action-skill.png`、`action-hit.png`、`action-down.png`。
- `rig-guide.png`、`skin-preview-attack.png`、`skin-preview-skill.png`、`skin-preview-hit.png`、`skin-preview-down.png`。
- 更新 `docs/CHARACTER_ASSET_AUDIT.md`，明确哪些是技术管线通过、哪些是美术质量通过。

## Verification

```bash
npm run test:assets
npm run test:character-browser
npm run test:visual-style
```

美术验收还必须人工查看 face-detail、动物剪影、手脚/rig detail、table-scale 和移动头像。自动测试只证明资源可加载，不证明角色已经有最终美术质感。
