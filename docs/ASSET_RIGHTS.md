# BING 资产权属与来源说明

日期：2026-06-15

本项目当前定位为私有项目和受控公网试玩。`LICENSE` 采用保留所有权利口径；在没有单独书面授权前，仓库中的代码、规则数据、图片、模型、音视频、文档和生成素材都不能作为公开可复用素材发布。

## 总体口径

- 代码：由项目开发流程生成和维护，随仓库一起按私有项目管理。
- 游戏规则与技能表：来自项目内规则设计和导入脚本，当前仅供 BING-game 使用。
- UI 文案与文档：由项目开发流程编写，当前仅供 BING-game 使用。
- 角色、头像、贴图、GLB、Blender 产物：当前主要用于技术管线验证或 WIP 美术方向验证，不代表最终公开发布资产。
- AI / imagegen / Seedance 生成素材：只能在项目授权范围内使用；批量生成前仍需记录生成提示词、来源工具、费用和导出文件。
- 用户上传头像或参考图：只用于对应玩家的本地/受控试玩体验，未经用户授权不得进入默认资产或公开宣传材料。

## 当前资产分类

| 资产 | 目录 / 文件 | 当前状态 | 发布前要求 |
| --- | --- | --- | --- |
| 角色 GLB / LOD | `apps/client/public/assets/characters/*/*.glb` | WIP / 技术管线验证 | 明确最终角色方向、来源、授权和体积预算 |
| 角色头像 / mobile-avatar | `apps/client/public/assets/characters/*/portrait.png`、`mobile-avatar.png` | WIP，已转向手绘搞怪动物方向 | 替换为通过美术总监验收的最终头像 |
| 角色 PBR 贴图 | `apps/client/public/assets/characters/materials/pbr/` | 程序化 / WIP | 记录生成方式或替换为授权贴图 |
| Blender 源场景 | `tools/blender/source/` | 开发源文件，不进入发布产物 | 发布包不得包含 `.blend` 源文件 |
| 技能特效关键帧 | `apps/client/public/assets/effects/{skillId}/keyframe-*.png` | 仅 `火球` 有小样 | 每个技能需记录 prompt、生成工具和资产状态 |
| Seedance 动画 | `apps/client/public/assets/effects/{skillId}/effect.mp4`、`effect.webm` | 尚未完成批量产物 | 生成前遵守 10 元人民币费用阈值，生成后记录任务和文件 |
| 技能表 / 规则数据 | `packages/shared/src/skills/generatedSkillCatalog.ts` | 项目规则数据 | 保留来源行号和导入脚本；公开发布前确认规则权属 |
| Playtest 截图 / 报告 | `artifacts/playtests/` | 测试产物，不作为默认发布素材 | 对外展示前清理玩家名、房号、账号 id 和临时 URL |

## 禁止事项

- 不得把当前 WIP/blockout 角色宣传为最终美术资产。
- 不得把未授权真人照片、可识别肖像或用户上传头像做成默认角色资产。
- 不得把第三方素材、参考图或生成结果混入仓库而不记录来源。
- 不得在公开发布包里包含 Blender 源文件、临时生成计划、未清理的测试截图或私人账号数据。
- 不得把 `LICENSE` 理解为开源授权；当前没有授予复制、分发或商用权利。

## 发布前检查

1. 更新本文件，列出最终角色、贴图、特效、音频和宣传图的来源。
2. 确认 `npm run test:release-assets` 通过，发布产物不含 `.blend` 或 source 目录。
3. 确认所有默认头像、角色、技能特效和音频都有可追踪来源。
4. 确认公开截图不包含测试账号 id、房号、临时 tunnel URL 或未授权用户头像。
5. 若未来决定开源代码，必须重新选择开源许可证，并把代码授权和美术/音视频素材授权分开说明。
