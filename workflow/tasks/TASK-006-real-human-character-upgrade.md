# TASK-006 真人比例角色资产升级

## Goal

把当前 6 个默认角色从技术 blockout 升级为真人比例的半写实游戏角色。当前几何体组合资产只保留为运行时、LOD、蒙皮和动画管线验证，不再作为公开试玩美术目标。

## Why It Matters

现在的角色一眼能看出是基础几何体拼装，削弱“真实游戏”的第一印象，也让牌桌动画、攻击反馈和角色头像显得像原型。公开试玩前必须让角色至少达到“真人比例、可绑定、可动画、近景不露怯”的质量。

## Scope

- 覆盖 `apps/client/src/lib/characters.ts` 中 6 个默认角色。
- 允许使用 Blender MCP、Blender Python、授权 humanoid base mesh 或用户授权参考。
- 不允许使用未授权可识别真人肖像。
- 不把简单球体、圆柱、盒子、胶囊体组合包装成成品角色。

## Art Director P0 Gate

- 真人比例：7 到 7.5 头身，头、颈、胸腔、骨盆、肩、肘、膝、手腕有连续结构。
- 面部：下颌、颧骨、眼窝、鼻梁、耳廓、嘴唇、眼球/虹膜/角膜层次可见。
- 手部：五指、拇指方向、指节、手腕体块、指甲或手套细节可见。
- 服装：领口、袖口、腰带、褶皱、厚度、接缝和职业道具支撑角色身份。
- 材质：皮肤、布料、皮革、金属、头发至少有 albedo / normal / roughness 或等价 PBR 证据。
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
```

美术验收还必须人工查看 face-detail、hand/rig detail、table-scale 和移动头像。自动测试只证明资源可加载，不证明角色已经有真人质感。
