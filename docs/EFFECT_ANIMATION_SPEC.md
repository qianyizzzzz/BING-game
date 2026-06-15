# BING 全技能特效动画生成规格

生成时间：2026-06-15T11:01:32.955Z

本文件由 `scripts/generate-effect-animation-spec.ts` 从真实技能注册表生成，覆盖全部技能，而不是只覆盖可主动播放的技能。

## 目标

- 为全部技能建立 imagegen 关键帧提示词与 Seedance 补帧动画提示词。
- 主动技能、攻击技能、资源技能、控制技能必须进入正式特效资产生产。
- 未接入 `play` 的锁定/被动技能也必须有触发提示、状态印记或无效反馈动画，避免技能表现缺口。
- 所有资产统一为油画感、透明亚克力装置、共餐实验装置风格，替换现有硬几何图形和浮层素材。

## 全局风格

- 统一采用油画、蛋彩、画布肌理、透明亚克力装置、细金属支架、共餐实验装置视觉。
- 禁止圆形 SVG、硬边几何光效、电竞霓虹、深色科幻 HUD、塑料玩具感。
- 每个技能输出 4 张关键帧：`keyframe-01.png`、`keyframe-02.png`、`keyframe-03.png`、`keyframe-04.png`。
- Seedance 输出：`effect.webm`、`effect.mp4`、`poster.png`。
- 动画时长建议 0.8-1.6 秒，30fps，首尾可循环但不强制循环。
- 所有动画不得遮挡 HP、饼数、目标线和提交状态超过 500ms。

## Seedance MCP 配置

- Codex 用户配置已新增 `mcp_servers.seedance`，使用 `uvx mcp-seedance` 启动。
- 运行前需要在系统环境变量中提供 `ACEDATACLOUD_API_TOKEN`。
- 配置变更通常需要重启 Codex 或新开会话，工具列表才会刷新出 Seedance MCP。

## 资产目录规范

```text
apps/client/public/assets/effects/{skillId}/keyframe-01.png
apps/client/public/assets/effects/{skillId}/keyframe-02.png
apps/client/public/assets/effects/{skillId}/keyframe-03.png
apps/client/public/assets/effects/{skillId}/keyframe-04.png
apps/client/public/assets/effects/{skillId}/poster.png
apps/client/public/assets/effects/{skillId}/effect.webm
apps/client/public/assets/effects/{skillId}/effect.mp4
```

## 技能总表

总计 120 个技能；已接入 play 的技能 65 个；未接入 play 但仍需视觉反馈的技能 55 个。

| 技能 | 名称 | 分类 | 播放状态 | 视觉原型 | 资产状态 | 资产目录 |
| --- | --- | --- | --- | --- | --- | --- |
| `skill_2_8724` | 空 | raw | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 中性无效波纹 | 0/7 | `apps/client/public/assets/effects/skill_2_8724/` |
| `skill_3_56718` | 再来一次 | raw | 已接入 play，可由技能播放系统直接触发 | 重获颜料旋涡 | 0/7 | `apps/client/public/assets/effects/skill_3_56718/` |
| `skill_4_65637` | 沙子 | raw | 已接入 play，可由技能播放系统直接触发 | 沙化变形 | 0/7 | `apps/client/public/assets/effects/skill_4_65637/` |
| `skill_5_34881` | 封印 | locked | 已接入 play，可由技能播放系统直接触发 | 石墨线控场 | 0/7 | `apps/client/public/assets/effects/skill_5_34881/` |
| `skill_6_503` | 裂魂 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 墨色虚空裂隙 | 0/7 | `apps/client/public/assets/effects/skill_6_503/` |
| `skill_7_35434` | 净化 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_7_35434/` |
| `skill_8_89763` | 禁锢 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 石墨线控场 | 0/7 | `apps/client/public/assets/effects/skill_8_89763/` |
| `skill_9_93219` | 破厄 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 石墨线控场 | 0/7 | `apps/client/public/assets/effects/skill_9_93219/` |
| `skill_10_9488` | 沦陷 | raw | 已接入 play，可由技能播放系统直接触发 | 石墨线控场 | 0/7 | `apps/client/public/assets/effects/skill_10_9488/` |
| `skill_11_89360` | 衰竭 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_11_89360/` |
| `skill_12_79004` | 血之哀 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_12_79004/` |
| `skill_13_68869` | 火烧大地 | limited | 已接入 play，可由技能播放系统直接触发 | 石墨线控场 | 0/7 | `apps/client/public/assets/effects/skill_13_68869/` |
| `skill_14_46860` | 霜落大地 | limited | 已接入 play，可由技能播放系统直接触发 | 冰霜蛋彩攻击 | 0/7 | `apps/client/public/assets/effects/skill_14_46860/` |
| `skill_15_64971` | 净化之风 | limited | 已接入 play，可由技能播放系统直接触发 | 石墨线控场 | 0/7 | `apps/client/public/assets/effects/skill_15_64971/` |
| `huo_yan_dao` | 火焰刀 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/huo_yan_dao/` |
| `zhu_que_yu_shan` | 朱雀羽扇 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/zhu_que_yu_shan/` |
| `skill_18_34323` | 寒冰剑 | control | 已接入 play，可由技能播放系统直接触发 | 石墨线控场 | 0/7 | `apps/client/public/assets/effects/skill_18_34323/` |
| `skill_19_45609` | 毒箭雨 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 透明防御波纹 | 0/7 | `apps/client/public/assets/effects/skill_19_45609/` |
| `skill_20_63089` | 冰箭雨 | locked | 已接入 play，可由技能播放系统直接触发 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_20_63089/` |
| `skill_21_36332` | 熔岩之怒 | locked | 已接入 play，可由技能播放系统直接触发 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_21_36332/` |
| `skill_22_54978` | 凛冬之怒 | locked | 已接入 play，可由技能播放系统直接触发 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_22_54978/` |
| `skill_23_90895` | 神隐红莲 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_23_90895/` |
| `skill_24_71363` | 神隐青莲 | control | 已接入 play，可由技能播放系统直接触发 | 暖白治愈晕染 | 0/7 | `apps/client/public/assets/effects/skill_24_71363/` |
| `skill_25_51277` | 暗影盾 | limited | 已接入 play，可由技能播放系统直接触发 | 透明防御波纹 | 0/7 | `apps/client/public/assets/effects/skill_25_51277/` |
| `skill_26_70243` | 后盾 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_26_70243/` |
| `skill_27_23816` | 全力一击 | attack | 已接入 play，可由技能播放系统直接触发 | 红色油彩冲击 | 0/7 | `apps/client/public/assets/effects/skill_27_23816/` |
| `skill_28_42646` | 狙击枪 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_28_42646/` |
| `skill_29_96125` | 古淀刀 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_29_96125/` |
| `skill_30_38815` | 青釭剑 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 透明防御波纹 | 0/7 | `apps/client/public/assets/effects/skill_30_38815/` |
| `skill_31_80497` | 双刃剑 | control | 已接入 play，可由技能播放系统直接触发 | 透明防御波纹 | 0/7 | `apps/client/public/assets/effects/skill_31_80497/` |
| `skill_32_19017` | 神之庇护 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_32_19017/` |
| `skill_33_55159` | 神族水晶 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_33_55159/` |
| `skill_34_1533` | 酒 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_34_1533/` |
| `skill_35_16792` | 雷电法术 | limited | 已接入 play，可由技能播放系统直接触发 | 石墨线控场 | 0/7 | `apps/client/public/assets/effects/skill_35_16792/` |
| `skill_36_14343` | 电击法术 | limited | 已接入 play，可由技能播放系统直接触发 | 透明防御波纹 | 0/7 | `apps/client/public/assets/effects/skill_36_14343/` |
| `skill_37_68416` | 鬼道 | attack | 已接入 play，可由技能播放系统直接触发 | 电流金属线绘 | 0/7 | `apps/client/public/assets/effects/skill_37_68416/` |
| `skill_38_81245` | 闪电护体 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_38_81245/` |
| `skill_39_77400` | 大地之心 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 透明防御波纹 | 0/7 | `apps/client/public/assets/effects/skill_39_77400/` |
| `skill_40_27274` | 碎石掌 | attack | 已接入 play，可由技能播放系统直接触发 | 红色油彩冲击 | 0/7 | `apps/client/public/assets/effects/skill_40_27274/` |
| `skill_41_43495` | 裂山拳 | attack | 已接入 play，可由技能播放系统直接触发 | 红色油彩冲击 | 0/7 | `apps/client/public/assets/effects/skill_41_43495/` |
| `skill_42_94266` | 破地之力 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_42_94266/` |
| `skill_43_74082` | 阳光普照 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_43_74082/` |
| `skill_44_20092` | 永远之夜 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_44_20092/` |
| `skill_45_30424` | 毁灭之力 | control | 已接入 play，可由技能播放系统直接触发 | 石墨线控场 | 0/7 | `apps/client/public/assets/effects/skill_45_30424/` |
| `skill_46_3651` | 嗜血 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_46_3651/` |
| `skill_47_94841` | 凝血之力 | limited | 已接入 play，可由技能播放系统直接触发 | 石墨线控场 | 0/7 | `apps/client/public/assets/effects/skill_47_94841/` |
| `skill_48_26455` | 血水屏障 | limited | 已接入 play，可由技能播放系统直接触发 | 透明防御波纹 | 0/7 | `apps/client/public/assets/effects/skill_48_26455/` |
| `skill_49_75347` | 遗计 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_49_75347/` |
| `skill_50_50034` | 八卦阵 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_50_50034/` |
| `skill_51_92674` | 藤甲 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 透明防御波纹 | 0/7 | `apps/client/public/assets/effects/skill_51_92674/` |
| `skill_52_22171` | 克己 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_52_22171/` |
| `skill_53_62958` | 独裁 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_53_62958/` |
| `skill_54_99719` | 乱舞 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_54_99719/` |
| `skill_55_96047` | 神罩 | limited | 已接入 play，可由技能播放系统直接触发 | 透明防御波纹 | 0/7 | `apps/client/public/assets/effects/skill_55_96047/` |
| `skill_56_42637` | 鬼罩 | limited | 已接入 play，可由技能播放系统直接触发 | 透明防御波纹 | 0/7 | `apps/client/public/assets/effects/skill_56_42637/` |
| `skill_57_59843` | 绝弹 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_57_59843/` |
| `skill_58_88471` | 散弹 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_58_88471/` |
| `skill_59_79990` | 火眼金睛 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 透明防御波纹 | 0/7 | `apps/client/public/assets/effects/skill_59_79990/` |
| `skill_60_57192` | 烈弓 | control | 已接入 play，可由技能播放系统直接触发 | 石墨线控场 | 0/7 | `apps/client/public/assets/effects/skill_60_57192/` |
| `skill_61_59049` | 圣 | raw | 已接入 play，可由技能播放系统直接触发 | 餐桌资源沉积 | 0/7 | `apps/client/public/assets/effects/skill_61_59049/` |
| `skill_62_8008` | 齐天大圣 | raw | 已接入 play，可由技能播放系统直接触发 | 餐桌资源沉积 | 0/7 | `apps/client/public/assets/effects/skill_62_8008/` |
| `skill_63_72549` | 圣水收集器 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_63_72549/` |
| `skill_64_60978` | 治愈术 | limited | 已接入 play，可由技能播放系统直接触发 | 石墨线控场 | 0/7 | `apps/client/public/assets/effects/skill_64_60978/` |
| `skill_65_71994` | 浴火重生 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_65_71994/` |
| `skill_66_82448` | 天佑之魂 | limited | 已接入 play，可由技能播放系统直接触发 | 暖白治愈晕染 | 0/7 | `apps/client/public/assets/effects/skill_66_82448/` |
| `skill_67_31717` | 沐浴圣光 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_67_31717/` |
| `skill_68_57581` | 离殇 | limited | 已接入 play，可由技能播放系统直接触发 | 石墨线控场 | 0/7 | `apps/client/public/assets/effects/skill_68_57581/` |
| `skill_69_22138` | 绝对值 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 墨色虚空裂隙 | 0/7 | `apps/client/public/assets/effects/skill_69_22138/` |
| `skill_70_79685` | 死神之镰 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 墨色虚空裂隙 | 0/7 | `apps/client/public/assets/effects/skill_70_79685/` |
| `skill_71_40087` | 圣域 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_71_40087/` |
| `skill_72_53933` | 邪域 | locked | 已接入 play，可由技能播放系统直接触发 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_72_53933/` |
| `skill_73_76567` | 十字守护 | control | 已接入 play，可由技能播放系统直接触发 | 石墨线控场 | 0/7 | `apps/client/public/assets/effects/skill_73_76567/` |
| `skill_74_34920` | 绝对守护 | control | 已接入 play，可由技能播放系统直接触发 | 石墨线控场 | 0/7 | `apps/client/public/assets/effects/skill_74_34920/` |
| `skill_75_68329` | 圣灵之境 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 透明防御波纹 | 0/7 | `apps/client/public/assets/effects/skill_75_68329/` |
| `skill_76_76044` | 帝炎之境 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_76_76044/` |
| `skill_77_30612` | 森林的低吟 | raw | 已接入 play，可由技能播放系统直接触发 | 暖白治愈晕染 | 0/7 | `apps/client/public/assets/effects/skill_77_30612/` |
| `skill_78_18866` | 火球 | attack | 已接入 play，可由技能播放系统直接触发 | 火焰油彩攻击 | 5/7 | `apps/client/public/assets/effects/skill_78_18866/` |
| `skill_79_36319` | 火箭 | limited | 已接入 play，可由技能播放系统直接触发 | 火焰油彩攻击 | 0/7 | `apps/client/public/assets/effects/skill_79_36319/` |
| `skill_80_20445` | 核反应堆 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_80_20445/` |
| `skill_81_59663` | 撸 | attack | 已接入 play，可由技能播放系统直接触发 | 红色油彩冲击 | 0/7 | `apps/client/public/assets/effects/skill_81_59663/` |
| `skill_82_45540` | 日 | attack | 已接入 play，可由技能播放系统直接触发 | 红色油彩冲击 | 0/7 | `apps/client/public/assets/effects/skill_82_45540/` |
| `skill_83_32356` | 丁 | attack | 已接入 play，可由技能播放系统直接触发 | 红色油彩冲击 | 0/7 | `apps/client/public/assets/effects/skill_83_32356/` |
| `skill_84_6114` | 抠 | attack | 已接入 play，可由技能播放系统直接触发 | 红色油彩冲击 | 0/7 | `apps/client/public/assets/effects/skill_84_6114/` |
| `skill_85_26345` | 钟 | attack | 已接入 play，可由技能播放系统直接触发 | 红色油彩冲击 | 0/7 | `apps/client/public/assets/effects/skill_85_26345/` |
| `skill_86_14131` | 梵 | attack | 已接入 play，可由技能播放系统直接触发 | 红色油彩冲击 | 0/7 | `apps/client/public/assets/effects/skill_86_14131/` |
| `skill_87_44771` | 连爆 | attack | 已接入 play，可由技能播放系统直接触发 | 红色油彩冲击 | 0/7 | `apps/client/public/assets/effects/skill_87_44771/` |
| `skill_88_62906` | 换防 | control | 已接入 play，可由技能播放系统直接触发 | 透明防御波纹 | 0/7 | `apps/client/public/assets/effects/skill_88_62906/` |
| `skill_89_99375` | 幻防 | control | 已接入 play，可由技能播放系统直接触发 | 透明防御波纹 | 0/7 | `apps/client/public/assets/effects/skill_89_99375/` |
| `skill_90_32911` | 杀换 | control | 已接入 play，可由技能播放系统直接触发 | 石墨线控场 | 0/7 | `apps/client/public/assets/effects/skill_90_32911/` |
| `skill_91_89631` | 级换 | control | 已接入 play，可由技能播放系统直接触发 | 石墨线控场 | 0/7 | `apps/client/public/assets/effects/skill_91_89631/` |
| `skill_92_26484` | 文明人 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_92_26484/` |
| `skill_93_50224` | 逆转 | limited | 已接入 play，可由技能播放系统直接触发 | 石墨线控场 | 0/7 | `apps/client/public/assets/effects/skill_93_50224/` |
| `skill_94_627` | 斗转星移 | limited | 已接入 play，可由技能播放系统直接触发 | 石墨线控场 | 0/7 | `apps/client/public/assets/effects/skill_94_627/` |
| `skill_95_91337` | 卷子 | attack | 已接入 play，可由技能播放系统直接触发 | 红色油彩冲击 | 0/7 | `apps/client/public/assets/effects/skill_95_91337/` |
| `skill_96_33279` | 暴风雪 | attack | 已接入 play，可由技能播放系统直接触发 | 冰霜蛋彩攻击 | 0/7 | `apps/client/public/assets/effects/skill_96_33279/` |
| `skill_97_60773` | 狂风骤雪 | limited | 已接入 play，可由技能播放系统直接触发 | 冰霜蛋彩攻击 | 0/7 | `apps/client/public/assets/effects/skill_97_60773/` |
| `skill_98_7182` | 普天同庆 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_98_7182/` |
| `skill_99_65551` | 无形之盾 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_99_65551/` |
| `skill_100_45717` | 顺手牵羊 | locked | 已接入 play，可由技能播放系统直接触发 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_100_45717/` |
| `skill_101_4254` | 镜像法术 | limited | 已接入 play，可由技能播放系统直接触发 | 石墨线控场 | 0/7 | `apps/client/public/assets/effects/skill_101_4254/` |
| `skill_102_5546` | 自爆者死 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 墨色虚空裂隙 | 0/7 | `apps/client/public/assets/effects/skill_102_5546/` |
| `skill_103_56259` | 闪现 | control | 已接入 play，可由技能播放系统直接触发 | 石墨线控场 | 0/7 | `apps/client/public/assets/effects/skill_103_56259/` |
| `skill_104_71181` | 过往时空 | limited | 已接入 play，可由技能播放系统直接触发 | 石墨线控场 | 0/7 | `apps/client/public/assets/effects/skill_104_71181/` |
| `skill_105_48309` | 白板 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_105_48309/` |
| `skill_106_59962` | 黑板 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_106_59962/` |
| `skill_107_53513` | 雷裂残阳 | limited | 已接入 play，可由技能播放系统直接触发 | 墨色虚空裂隙 | 0/7 | `apps/client/public/assets/effects/skill_107_53513/` |
| `skill_108_76133` | 六芒星 | limited | 已接入 play，可由技能播放系统直接触发 | 透明防御波纹 | 0/7 | `apps/client/public/assets/effects/skill_108_76133/` |
| `skill_109_65084` | 传音入密 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_109_65084/` |
| `skill_110_2190` | 三千雷动 | attack | 已接入 play，可由技能播放系统直接触发 | 电流金属线绘 | 0/7 | `apps/client/public/assets/effects/skill_110_2190/` |
| `skill_111_51056` | 制衡 | limited | 已接入 play，可由技能播放系统直接触发 | 石墨线控场 | 0/7 | `apps/client/public/assets/effects/skill_111_51056/` |
| `skill_112_59292` | 地狱主宰 | limited | 已接入 play，可由技能播放系统直接触发 | 墨色虚空裂隙 | 0/7 | `apps/client/public/assets/effects/skill_112_59292/` |
| `skill_113_88141` | 无限战意 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 墨色虚空裂隙 | 0/7 | `apps/client/public/assets/effects/skill_113_88141/` |
| `skill_114_87583` | 不死金身 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 透明防御波纹 | 0/7 | `apps/client/public/assets/effects/skill_114_87583/` |
| `skill_115_74459` | 同生共死 | limited | 已接入 play，可由技能播放系统直接触发 | 石墨线控场 | 0/7 | `apps/client/public/assets/effects/skill_115_74459/` |
| `skill_116_97172` | 复仇之刃 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_116_97172/` |
| `skill_117_55768` | 百炼成神 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_117_55768/` |
| `skill_118_53580` | 冰漩决 | attack | 已接入 play，可由技能播放系统直接触发 | 冰霜蛋彩攻击 | 0/7 | `apps/client/public/assets/effects/skill_118_53580/` |
| `skill_119_78843` | 火漩决 | attack | 已接入 play，可由技能播放系统直接触发 | 火焰油彩攻击 | 0/7 | `apps/client/public/assets/effects/skill_119_78843/` |
| `skill_120_85509` | 创伤聚合 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_120_85509/` |
| `skill_121_59557` | 因果律认知 | locked | 未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐 | 被动触发印记 | 0/7 | `apps/client/public/assets/effects/skill_121_59557/` |

## 逐技能规格

### skill_2_8724：空

- 名称：空
- 分类：raw
- 时机：无
- 描述：无效果
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check
- 触发表现：在系统判断技能生效、失效或无效果时播放轻量反馈。
- 机制视觉线索：无效果
- 视觉原型：中性无效波纹
- 色彩：乳白、灰蓝、少量淡金
- 材质：薄油膜、透明玻璃反光、柔软画布颗粒
- 运动：浅色油膜轻轻展开后收束，不制造强攻击感，作为无直接效果或空技能反馈
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_2_8724/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_2_8724 空
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 无效果.
Primary request: 中性无效波纹; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "空" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 乳白、灰蓝、少量淡金.
Materials/textures: 薄油膜、透明玻璃反光、柔软画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_2_8724 空
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 无效果.
Primary request: 中性无效波纹; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "空" motif reaches the strongest readable silhouette; 浅色油膜轻轻展开后收束，不制造强攻击感，作为无直接效果或空技能反馈; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 乳白、灰蓝、少量淡金.
Materials/textures: 薄油膜、透明玻璃反光、柔软画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_2_8724 空
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 无效果.
Primary request: 中性无效波纹; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 乳白、灰蓝、少量淡金.
Materials/textures: 薄油膜、透明玻璃反光、柔软画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_2_8724 空
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 无效果.
Primary request: 中性无效波纹; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "空" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 乳白、灰蓝、少量淡金.
Materials/textures: 薄油膜、透明玻璃反光、柔软画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_2_8724 "空".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check. Trigger behavior: 在系统判断技能生效、失效或无效果时播放轻量反馈。
Mechanic-specific cue: 无效果.
Visual language: neutral ivory oil film ripple, translucent acrylic reflection, quiet painterly feedback; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 浅色油膜轻轻展开后收束，不制造强攻击感，作为无直接效果或空技能反馈.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_3_56718：再来一次

- 名称：再来一次
- 分类：raw
- 时机：随时可用
- 描述：重新抽取一次技能
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=reroll_skill
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：重新抽取一次技能; cost 0, target none
- 视觉原型：重获颜料旋涡
- 色彩：青绿、红、黄、蓝混合
- 材质：旋转调色盘、透明圆盘、油彩涡流
- 运动：多色颜料绕透明圆盘旋转，重组为新的小色块，最后定格
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_3_56718/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_3_56718 再来一次
Gameplay meaning: kind=effect / cost=0 / target=none / effect=reroll_skill.
Mechanic-specific cue: 重新抽取一次技能; cost 0, target none.
Primary request: 重获颜料旋涡; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "再来一次" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、红、黄、蓝混合.
Materials/textures: 旋转调色盘、透明圆盘、油彩涡流.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_3_56718 再来一次
Gameplay meaning: kind=effect / cost=0 / target=none / effect=reroll_skill.
Mechanic-specific cue: 重新抽取一次技能; cost 0, target none.
Primary request: 重获颜料旋涡; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "再来一次" motif reaches the strongest readable silhouette; 多色颜料绕透明圆盘旋转，重组为新的小色块，最后定格; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、红、黄、蓝混合.
Materials/textures: 旋转调色盘、透明圆盘、油彩涡流.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_3_56718 再来一次
Gameplay meaning: kind=effect / cost=0 / target=none / effect=reroll_skill.
Mechanic-specific cue: 重新抽取一次技能; cost 0, target none.
Primary request: 重获颜料旋涡; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、红、黄、蓝混合.
Materials/textures: 旋转调色盘、透明圆盘、油彩涡流.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_3_56718 再来一次
Gameplay meaning: kind=effect / cost=0 / target=none / effect=reroll_skill.
Mechanic-specific cue: 重新抽取一次技能; cost 0, target none.
Primary request: 重获颜料旋涡; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "再来一次" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、红、黄、蓝混合.
Materials/textures: 旋转调色盘、透明圆盘、油彩涡流.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_3_56718 "再来一次".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=reroll_skill. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 重新抽取一次技能; cost 0, target none.
Visual language: multicolor oil paint whirlpool on transparent acrylic plate, reroll transformation; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 多色颜料绕透明圆盘旋转，重组为新的小色块，最后定格.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_4_65637：沙子

- 名称：沙子
- 分类：raw
- 时机：随时可用
- 描述：变换为一个自选小技能，使用时需声明为沙子变化。若场上有其他玩家持有该技能，你本次变换失败，你退游
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=sand_transform
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：变换为一个自选小技能，使用时需声明为沙子变化。若场上有其他玩家持有该技能，你本次变换失败，你退游; cost 0, target none
- 视觉原型：沙化变形
- 色彩：沙黄、米白、赭石
- 材质：砂质油彩、颗粒化笔触、半透明尘雾
- 运动：米黄色颜料粒子从中心散开，重新聚合成新的纹理印记
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_4_65637/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_4_65637 沙子
Gameplay meaning: kind=effect / cost=0 / target=none / effect=sand_transform.
Mechanic-specific cue: 变换为一个自选小技能，使用时需声明为沙子变化。若场上有其他玩家持有该技能，你本次变换失败，你退游; cost 0, target none.
Primary request: 沙化变形; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "沙子" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 沙黄、米白、赭石.
Materials/textures: 砂质油彩、颗粒化笔触、半透明尘雾.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_4_65637 沙子
Gameplay meaning: kind=effect / cost=0 / target=none / effect=sand_transform.
Mechanic-specific cue: 变换为一个自选小技能，使用时需声明为沙子变化。若场上有其他玩家持有该技能，你本次变换失败，你退游; cost 0, target none.
Primary request: 沙化变形; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "沙子" motif reaches the strongest readable silhouette; 米黄色颜料粒子从中心散开，重新聚合成新的纹理印记; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 沙黄、米白、赭石.
Materials/textures: 砂质油彩、颗粒化笔触、半透明尘雾.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_4_65637 沙子
Gameplay meaning: kind=effect / cost=0 / target=none / effect=sand_transform.
Mechanic-specific cue: 变换为一个自选小技能，使用时需声明为沙子变化。若场上有其他玩家持有该技能，你本次变换失败，你退游; cost 0, target none.
Primary request: 沙化变形; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 沙黄、米白、赭石.
Materials/textures: 砂质油彩、颗粒化笔触、半透明尘雾.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_4_65637 沙子
Gameplay meaning: kind=effect / cost=0 / target=none / effect=sand_transform.
Mechanic-specific cue: 变换为一个自选小技能，使用时需声明为沙子变化。若场上有其他玩家持有该技能，你本次变换失败，你退游; cost 0, target none.
Primary request: 沙化变形; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "沙子" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 沙黄、米白、赭石.
Materials/textures: 砂质油彩、颗粒化笔触、半透明尘雾.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_4_65637 "沙子".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=sand_transform. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 变换为一个自选小技能，使用时需声明为沙子变化。若场上有其他玩家持有该技能，你本次变换失败，你退游; cost 0, target none.
Visual language: sand colored oil paint particles dissolving and reforming, granular brush texture; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 米黄色颜料粒子从中心散开，重新聚合成新的纹理印记.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_5_34881：封印

- 名称：封印
- 分类：locked
- 时机：随时可用
- 描述：其他玩家暴露锁定技后，你可将其封锁，每个玩家只能封锁一个
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=no_direct_effect
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：其他玩家暴露锁定技后，你可将其封锁，每个玩家只能封锁一个; cost 0, target none
- 视觉原型：石墨线控场
- 色彩：石墨黑、灰蓝、少量青绿
- 材质：细金属支架线、铅笔线稿、透明胶片
- 运动：石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_5_34881/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_5_34881 封印
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 其他玩家暴露锁定技后，你可将其封锁，每个玩家只能封锁一个; cost 0, target none.
Primary request: 石墨线控场; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "封印" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_5_34881 封印
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 其他玩家暴露锁定技后，你可将其封锁，每个玩家只能封锁一个; cost 0, target none.
Primary request: 石墨线控场; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "封印" motif reaches the strongest readable silhouette; 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_5_34881 封印
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 其他玩家暴露锁定技后，你可将其封锁，每个玩家只能封锁一个; cost 0, target none.
Primary request: 石墨线控场; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_5_34881 封印
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 其他玩家暴露锁定技后，你可将其封锁，每个玩家只能封锁一个; cost 0, target none.
Primary request: 石墨线控场; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "封印" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_5_34881 "封印".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 其他玩家暴露锁定技后，你可将其封锁，每个玩家只能封锁一个; cost 0, target none.
Visual language: graphite linework and thin metal rods constricting, transparent installation control effect; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_6_503：裂魂

- 名称：裂魂
- 分类：locked
- 时机：被动技能
- 描述：你杀死玩家后，他无法复活
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check, revival_action
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：你杀死玩家后，他无法复活
- 视觉原型：墨色虚空裂隙
- 色彩：蓝黑、紫灰、象牙白
- 材质：稀释油墨、刮擦裂纹、半透明烟状颜料
- 运动：蓝黑墨痕在画布上裂开，吸入周围颜料后迅速闭合
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_6_503/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_6_503 裂魂
Gameplay meaning: visual-only / phases=passive_check, revival_action.
Mechanic-specific cue: 你杀死玩家后，他无法复活.
Primary request: 墨色虚空裂隙; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "裂魂" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_6_503 裂魂
Gameplay meaning: visual-only / phases=passive_check, revival_action.
Mechanic-specific cue: 你杀死玩家后，他无法复活.
Primary request: 墨色虚空裂隙; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "裂魂" motif reaches the strongest readable silhouette; 蓝黑墨痕在画布上裂开，吸入周围颜料后迅速闭合; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_6_503 裂魂
Gameplay meaning: visual-only / phases=passive_check, revival_action.
Mechanic-specific cue: 你杀死玩家后，他无法复活.
Primary request: 墨色虚空裂隙; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_6_503 裂魂
Gameplay meaning: visual-only / phases=passive_check, revival_action.
Mechanic-specific cue: 你杀死玩家后，他无法复活.
Primary request: 墨色虚空裂隙; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "裂魂" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_6_503 "裂魂".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check, revival_action. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 你杀死玩家后，他无法复活.
Visual language: blue black diluted oil ink fissure, violet gray smoke pigment, canvas scratch texture; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 蓝黑墨痕在画布上裂开，吸入周围颜料后迅速闭合.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_7_35434：净化

- 名称：净化
- 分类：locked
- 时机：被动技能
- 描述：其他玩家的限定技对你无效
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check, round_pre_interval_action, round_before_action, turn_before_action, turn_change_action, turn_damage_modify, turn_end_action, turn_after_interval_action, round_after_interval_action
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：其他玩家的限定技对你无效
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_7_35434/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_7_35434 净化
Gameplay meaning: visual-only / phases=passive_check, round_pre_interval_action, round_before_action, turn_before_action, turn_change_action, turn_damage_modify, turn_end_action, turn_after_interval_action, round_after_interval_action.
Mechanic-specific cue: 其他玩家的限定技对你无效.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "净化" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_7_35434 净化
Gameplay meaning: visual-only / phases=passive_check, round_pre_interval_action, round_before_action, turn_before_action, turn_change_action, turn_damage_modify, turn_end_action, turn_after_interval_action, round_after_interval_action.
Mechanic-specific cue: 其他玩家的限定技对你无效.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "净化" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_7_35434 净化
Gameplay meaning: visual-only / phases=passive_check, round_pre_interval_action, round_before_action, turn_before_action, turn_change_action, turn_damage_modify, turn_end_action, turn_after_interval_action, round_after_interval_action.
Mechanic-specific cue: 其他玩家的限定技对你无效.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_7_35434 净化
Gameplay meaning: visual-only / phases=passive_check, round_pre_interval_action, round_before_action, turn_before_action, turn_change_action, turn_damage_modify, turn_end_action, turn_after_interval_action, round_after_interval_action.
Mechanic-specific cue: 其他玩家的限定技对你无效.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "净化" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_7_35434 "净化".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check, round_pre_interval_action, round_before_action, turn_before_action, turn_change_action, turn_damage_modify, turn_end_action, turn_after_interval_action, round_after_interval_action. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 其他玩家的限定技对你无效.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_8_89763：禁锢

- 名称：禁锢
- 分类：locked
- 时机：被动技能
- 描述：当你在场时，全场控制技被封锁
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：当你在场时，全场控制技被封锁
- 视觉原型：石墨线控场
- 色彩：石墨黑、灰蓝、少量青绿
- 材质：细金属支架线、铅笔线稿、透明胶片
- 运动：石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_8_89763/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_8_89763 禁锢
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 当你在场时，全场控制技被封锁.
Primary request: 石墨线控场; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "禁锢" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_8_89763 禁锢
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 当你在场时，全场控制技被封锁.
Primary request: 石墨线控场; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "禁锢" motif reaches the strongest readable silhouette; 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_8_89763 禁锢
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 当你在场时，全场控制技被封锁.
Primary request: 石墨线控场; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_8_89763 禁锢
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 当你在场时，全场控制技被封锁.
Primary request: 石墨线控场; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "禁锢" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_8_89763 "禁锢".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 当你在场时，全场控制技被封锁.
Visual language: graphite linework and thin metal rods constricting, transparent installation control effect; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_9_93219：破厄

- 名称：破厄
- 分类：locked
- 时机：被动技能
- 描述：当你持有该技能时，开场时进行声明，当你在场时，全场封印、净化、禁锢、裂魂、沦陷、衰竭、血之哀无效
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=game_start_check, passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：当你持有该技能时，开场时进行声明，当你在场时，全场封印、净化、禁锢、裂魂、沦陷、衰竭、血之哀无效
- 视觉原型：石墨线控场
- 色彩：石墨黑、灰蓝、少量青绿
- 材质：细金属支架线、铅笔线稿、透明胶片
- 运动：石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_9_93219/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_9_93219 破厄
Gameplay meaning: visual-only / phases=game_start_check, passive_check.
Mechanic-specific cue: 当你持有该技能时，开场时进行声明，当你在场时，全场封印、净化、禁锢、裂魂、沦陷、衰竭、血之哀无效.
Primary request: 石墨线控场; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "破厄" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_9_93219 破厄
Gameplay meaning: visual-only / phases=game_start_check, passive_check.
Mechanic-specific cue: 当你持有该技能时，开场时进行声明，当你在场时，全场封印、净化、禁锢、裂魂、沦陷、衰竭、血之哀无效.
Primary request: 石墨线控场; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "破厄" motif reaches the strongest readable silhouette; 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_9_93219 破厄
Gameplay meaning: visual-only / phases=game_start_check, passive_check.
Mechanic-specific cue: 当你持有该技能时，开场时进行声明，当你在场时，全场封印、净化、禁锢、裂魂、沦陷、衰竭、血之哀无效.
Primary request: 石墨线控场; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_9_93219 破厄
Gameplay meaning: visual-only / phases=game_start_check, passive_check.
Mechanic-specific cue: 当你持有该技能时，开场时进行声明，当你在场时，全场封印、净化、禁锢、裂魂、沦陷、衰竭、血之哀无效.
Primary request: 石墨线控场; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "破厄" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_9_93219 "破厄".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=game_start_check, passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 当你持有该技能时，开场时进行声明，当你在场时，全场封印、净化、禁锢、裂魂、沦陷、衰竭、血之哀无效.
Visual language: graphite linework and thin metal rods constricting, transparent installation control effect; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_10_9488：沦陷

- 名称：沦陷
- 分类：raw
- 时机：随时可用
- 描述：一局限2次，先制重开，下轮所有玩家无技能
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=all / effect=no_direct_effect / uses=2
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：一局限2次，先制重开，下轮所有玩家无技能; cost 0, target all; limited 2 use(s)
- 视觉原型：石墨线控场
- 色彩：石墨黑、灰蓝、少量青绿
- 材质：细金属支架线、铅笔线稿、透明胶片
- 运动：石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_10_9488/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_10_9488 沦陷
Gameplay meaning: kind=effect / cost=0 / target=all / effect=no_direct_effect / uses=2.
Mechanic-specific cue: 一局限2次，先制重开，下轮所有玩家无技能; cost 0, target all; limited 2 use(s).
Primary request: 石墨线控场; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "沦陷" motif first appears as a small oil-paint emblem; radial table-wide spread with several separated landing stains; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_10_9488 沦陷
Gameplay meaning: kind=effect / cost=0 / target=all / effect=no_direct_effect / uses=2.
Mechanic-specific cue: 一局限2次，先制重开，下轮所有玩家无技能; cost 0, target all; limited 2 use(s).
Primary request: 石墨线控场; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "沦陷" motif reaches the strongest readable silhouette; 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_10_9488 沦陷
Gameplay meaning: kind=effect / cost=0 / target=all / effect=no_direct_effect / uses=2.
Mechanic-specific cue: 一局限2次，先制重开，下轮所有玩家无技能; cost 0, target all; limited 2 use(s).
Primary request: 石墨线控场; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through radial table-wide spread with several separated landing stains; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_10_9488 沦陷
Gameplay meaning: kind=effect / cost=0 / target=all / effect=no_direct_effect / uses=2.
Mechanic-specific cue: 一局限2次，先制重开，下轮所有玩家无技能; cost 0, target all; limited 2 use(s).
Primary request: 石墨线控场; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "沦陷" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_10_9488 "沦陷".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=all / effect=no_direct_effect / uses=2. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 一局限2次，先制重开，下轮所有玩家无技能; cost 0, target all; limited 2 use(s).
Visual language: graphite linework and thin metal rods constricting, transparent installation control effect; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_11_89360：衰竭

- 名称：衰竭
- 分类：locked
- 时机：被动技能
- 描述：全场含有0和无限的出招失效
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：全场含有0和无限的出招失效
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_11_89360/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_11_89360 衰竭
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 全场含有0和无限的出招失效.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "衰竭" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_11_89360 衰竭
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 全场含有0和无限的出招失效.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "衰竭" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_11_89360 衰竭
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 全场含有0和无限的出招失效.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_11_89360 衰竭
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 全场含有0和无限的出招失效.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "衰竭" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_11_89360 "衰竭".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 全场含有0和无限的出招失效.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_12_79004：血之哀

- 名称：血之哀
- 分类：locked
- 时机：被动技能
- 描述：当你在场时，所有玩家无法加血
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：当你在场时，所有玩家无法加血
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_12_79004/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_12_79004 血之哀
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 当你在场时，所有玩家无法加血.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "血之哀" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_12_79004 血之哀
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 当你在场时，所有玩家无法加血.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "血之哀" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_12_79004 血之哀
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 当你在场时，所有玩家无法加血.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_12_79004 血之哀
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 当你在场时，所有玩家无法加血.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "血之哀" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_12_79004 "血之哀".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 当你在场时，所有玩家无法加血.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_13_68869：火烧大地

- 名称：火烧大地
- 分类：limited
- 时机：随时可用
- 描述：限定技，一局限1次，使除你外所有人受到1点火系法伤，消除除你外所有人的冰系技能，对持有冰系技能的玩家变为使其受到2点火系法伤
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=all / effect=no_direct_effect / uses=1
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：限定技，一局限1次，使除你外所有人受到1点火系法伤，消除除你外所有人的冰系技能，对持有冰系技能的玩家变为使其受到2点火系法伤; cost 0, target all; limited 1 use(s)
- 视觉原型：石墨线控场
- 色彩：石墨黑、灰蓝、少量青绿
- 材质：细金属支架线、铅笔线稿、透明胶片
- 运动：石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_13_68869/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_13_68869 火烧大地
Gameplay meaning: kind=effect / cost=0 / target=all / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，一局限1次，使除你外所有人受到1点火系法伤，消除除你外所有人的冰系技能，对持有冰系技能的玩家变为使其受到2点火系法伤; cost 0, target all; limited 1 use(s).
Primary request: 石墨线控场; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "火烧大地" motif first appears as a small oil-paint emblem; radial table-wide spread with several separated landing stains; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_13_68869 火烧大地
Gameplay meaning: kind=effect / cost=0 / target=all / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，一局限1次，使除你外所有人受到1点火系法伤，消除除你外所有人的冰系技能，对持有冰系技能的玩家变为使其受到2点火系法伤; cost 0, target all; limited 1 use(s).
Primary request: 石墨线控场; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "火烧大地" motif reaches the strongest readable silhouette; 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_13_68869 火烧大地
Gameplay meaning: kind=effect / cost=0 / target=all / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，一局限1次，使除你外所有人受到1点火系法伤，消除除你外所有人的冰系技能，对持有冰系技能的玩家变为使其受到2点火系法伤; cost 0, target all; limited 1 use(s).
Primary request: 石墨线控场; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through radial table-wide spread with several separated landing stains; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_13_68869 火烧大地
Gameplay meaning: kind=effect / cost=0 / target=all / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，一局限1次，使除你外所有人受到1点火系法伤，消除除你外所有人的冰系技能，对持有冰系技能的玩家变为使其受到2点火系法伤; cost 0, target all; limited 1 use(s).
Primary request: 石墨线控场; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "火烧大地" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_13_68869 "火烧大地".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=all / effect=no_direct_effect / uses=1. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 限定技，一局限1次，使除你外所有人受到1点火系法伤，消除除你外所有人的冰系技能，对持有冰系技能的玩家变为使其受到2点火系法伤; cost 0, target all; limited 1 use(s).
Visual language: graphite linework and thin metal rods constricting, transparent installation control effect; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_14_46860：霜落大地

- 名称：霜落大地
- 分类：limited
- 时机：随时可用
- 描述：限定技，一局限1次，使你+4血，除你外所有人+1血，消除除你外所有人的火系技能，对持有火系技能的玩家不加血
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=all / selfHeal=4 / allEnemyDamage=-1 / uses=1
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：限定技，一局限1次，使你+4血，除你外所有人+1血，消除除你外所有人的火系技能，对持有火系技能的玩家不加血; cost 0, target all; limited 1 use(s); self heal 4; area damage -1
- 视觉原型：冰霜蛋彩攻击
- 色彩：雾蓝、灰白、淡青
- 材质：冷色蛋彩、薄涂刮痕、冰晶状颜料边缘
- 运动：淡蓝颜料凝成细线后快速刺出，命中时扩成霜花状薄涂纹理，末尾轻微碎裂
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_14_46860/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_14_46860 霜落大地
Gameplay meaning: kind=effect / cost=0 / target=all / selfHeal=4 / allEnemyDamage=-1 / uses=1.
Mechanic-specific cue: 限定技，一局限1次，使你+4血，除你外所有人+1血，消除除你外所有人的火系技能，对持有火系技能的玩家不加血; cost 0, target all; limited 1 use(s); self heal 4; area damage -1.
Primary request: 冰霜蛋彩攻击; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "霜落大地" motif first appears as a small oil-paint emblem; radial table-wide spread with several separated landing stains; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 雾蓝、灰白、淡青.
Materials/textures: 冷色蛋彩、薄涂刮痕、冰晶状颜料边缘.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_14_46860 霜落大地
Gameplay meaning: kind=effect / cost=0 / target=all / selfHeal=4 / allEnemyDamage=-1 / uses=1.
Mechanic-specific cue: 限定技，一局限1次，使你+4血，除你外所有人+1血，消除除你外所有人的火系技能，对持有火系技能的玩家不加血; cost 0, target all; limited 1 use(s); self heal 4; area damage -1.
Primary request: 冰霜蛋彩攻击; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "霜落大地" motif reaches the strongest readable silhouette; 淡蓝颜料凝成细线后快速刺出，命中时扩成霜花状薄涂纹理，末尾轻微碎裂; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 雾蓝、灰白、淡青.
Materials/textures: 冷色蛋彩、薄涂刮痕、冰晶状颜料边缘.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_14_46860 霜落大地
Gameplay meaning: kind=effect / cost=0 / target=all / selfHeal=4 / allEnemyDamage=-1 / uses=1.
Mechanic-specific cue: 限定技，一局限1次，使你+4血，除你外所有人+1血，消除除你外所有人的火系技能，对持有火系技能的玩家不加血; cost 0, target all; limited 1 use(s); self heal 4; area damage -1.
Primary request: 冰霜蛋彩攻击; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through radial table-wide spread with several separated landing stains; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 雾蓝、灰白、淡青.
Materials/textures: 冷色蛋彩、薄涂刮痕、冰晶状颜料边缘.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_14_46860 霜落大地
Gameplay meaning: kind=effect / cost=0 / target=all / selfHeal=4 / allEnemyDamage=-1 / uses=1.
Mechanic-specific cue: 限定技，一局限1次，使你+4血，除你外所有人+1血，消除除你外所有人的火系技能，对持有火系技能的玩家不加血; cost 0, target all; limited 1 use(s); self heal 4; area damage -1.
Primary request: 冰霜蛋彩攻击; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "霜落大地" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 雾蓝、灰白、淡青.
Materials/textures: 冷色蛋彩、薄涂刮痕、冰晶状颜料边缘.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_14_46860 "霜落大地".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=all / selfHeal=4 / allEnemyDamage=-1 / uses=1. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 限定技，一局限1次，使你+4血，除你外所有人+1血，消除除你外所有人的火系技能，对持有火系技能的玩家不加血; cost 0, target all; limited 1 use(s); self heal 4; area damage -1.
Visual language: pale blue ice-tempera paint streak, frost flower burst, delicate cold pigment scratches; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 淡蓝颜料凝成细线后快速刺出，命中时扩成霜花状薄涂纹理，末尾轻微碎裂.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_15_64971：净化之风

- 名称：净化之风
- 分类：limited
- 时机：随时可用
- 描述：限定技，一局限2次，第一次使用时使除你外所有血量为奇数的玩家-1血，第二次使用时使除你外所有血量为偶数的玩家-1血
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=2
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：限定技，一局限2次，第一次使用时使除你外所有血量为奇数的玩家-1血，第二次使用时使除你外所有血量为偶数的玩家-1血; cost 0, target none; limited 2 use(s)
- 视觉原型：石墨线控场
- 色彩：石墨黑、灰蓝、少量青绿
- 材质：细金属支架线、铅笔线稿、透明胶片
- 运动：石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_15_64971/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_15_64971 净化之风
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=2.
Mechanic-specific cue: 限定技，一局限2次，第一次使用时使除你外所有血量为奇数的玩家-1血，第二次使用时使除你外所有血量为偶数的玩家-1血; cost 0, target none; limited 2 use(s).
Primary request: 石墨线控场; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "净化之风" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_15_64971 净化之风
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=2.
Mechanic-specific cue: 限定技，一局限2次，第一次使用时使除你外所有血量为奇数的玩家-1血，第二次使用时使除你外所有血量为偶数的玩家-1血; cost 0, target none; limited 2 use(s).
Primary request: 石墨线控场; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "净化之风" motif reaches the strongest readable silhouette; 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_15_64971 净化之风
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=2.
Mechanic-specific cue: 限定技，一局限2次，第一次使用时使除你外所有血量为奇数的玩家-1血，第二次使用时使除你外所有血量为偶数的玩家-1血; cost 0, target none; limited 2 use(s).
Primary request: 石墨线控场; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_15_64971 净化之风
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=2.
Mechanic-specific cue: 限定技，一局限2次，第一次使用时使除你外所有血量为奇数的玩家-1血，第二次使用时使除你外所有血量为偶数的玩家-1血; cost 0, target none; limited 2 use(s).
Primary request: 石墨线控场; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "净化之风" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_15_64971 "净化之风".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=2. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 限定技，一局限2次，第一次使用时使除你外所有血量为奇数的玩家-1血，第二次使用时使除你外所有血量为偶数的玩家-1血; cost 0, target none; limited 2 use(s).
Visual language: graphite linework and thin metal rods constricting, transparent installation control effect; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### huo_yan_dao：火焰刀

- 名称：火焰刀
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你的单个杀攻2，等级2，变为火系
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=turn_reveal_check, passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你的单个杀攻2，等级2，变为火系
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/huo_yan_dao/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: huo_yan_dao 火焰刀
Gameplay meaning: visual-only / phases=turn_reveal_check, passive_check.
Mechanic-specific cue: 锁定技，你的单个杀攻2，等级2，变为火系.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "火焰刀" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: huo_yan_dao 火焰刀
Gameplay meaning: visual-only / phases=turn_reveal_check, passive_check.
Mechanic-specific cue: 锁定技，你的单个杀攻2，等级2，变为火系.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "火焰刀" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: huo_yan_dao 火焰刀
Gameplay meaning: visual-only / phases=turn_reveal_check, passive_check.
Mechanic-specific cue: 锁定技，你的单个杀攻2，等级2，变为火系.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: huo_yan_dao 火焰刀
Gameplay meaning: visual-only / phases=turn_reveal_check, passive_check.
Mechanic-specific cue: 锁定技，你的单个杀攻2，等级2，变为火系.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "火焰刀" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill huo_yan_dao "火焰刀".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=turn_reveal_check, passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你的单个杀攻2，等级2，变为火系.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### zhu_que_yu_shan：朱雀羽扇

- 名称：朱雀羽扇
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你的单个擒攻4，等级1，变为火系
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你的单个擒攻4，等级1，变为火系
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/zhu_que_yu_shan/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: zhu_que_yu_shan 朱雀羽扇
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你的单个擒攻4，等级1，变为火系.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "朱雀羽扇" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: zhu_que_yu_shan 朱雀羽扇
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你的单个擒攻4，等级1，变为火系.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "朱雀羽扇" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: zhu_que_yu_shan 朱雀羽扇
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你的单个擒攻4，等级1，变为火系.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: zhu_que_yu_shan 朱雀羽扇
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你的单个擒攻4，等级1，变为火系.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "朱雀羽扇" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill zhu_que_yu_shan "朱雀羽扇".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你的单个擒攻4，等级1，变为火系.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_18_34323：寒冰剑

- 名称：寒冰剑
- 分类：control
- 时机：变招阶段
- 描述：控制技，使你的攻击变为冰系，命中后不会造成伤害（但仍然会重开），使目标技能失效1轮
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=no_direct_effect
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：控制技，使你的攻击变为冰系，命中后不会造成伤害（但仍然会重开），使目标技能失效1轮; cost 0, target none
- 视觉原型：石墨线控场
- 色彩：石墨黑、灰蓝、少量青绿
- 材质：细金属支架线、铅笔线稿、透明胶片
- 运动：石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_18_34323/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_18_34323 寒冰剑
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，使你的攻击变为冰系，命中后不会造成伤害（但仍然会重开），使目标技能失效1轮; cost 0, target none.
Primary request: 石墨线控场; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "寒冰剑" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_18_34323 寒冰剑
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，使你的攻击变为冰系，命中后不会造成伤害（但仍然会重开），使目标技能失效1轮; cost 0, target none.
Primary request: 石墨线控场; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "寒冰剑" motif reaches the strongest readable silhouette; 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_18_34323 寒冰剑
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，使你的攻击变为冰系，命中后不会造成伤害（但仍然会重开），使目标技能失效1轮; cost 0, target none.
Primary request: 石墨线控场; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_18_34323 寒冰剑
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，使你的攻击变为冰系，命中后不会造成伤害（但仍然会重开），使目标技能失效1轮; cost 0, target none.
Primary request: 石墨线控场; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "寒冰剑" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_18_34323 "寒冰剑".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 控制技，使你的攻击变为冰系，命中后不会造成伤害（但仍然会重开），使目标技能失效1轮; cost 0, target none.
Visual language: graphite linework and thin metal rods constricting, transparent installation control effect; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_19_45609：毒箭雨

- 名称：毒箭雨
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你的万箭齐发变为毒系，只能用石头防，不会被反弹
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你的万箭齐发变为毒系，只能用石头防，不会被反弹
- 视觉原型：透明防御波纹
- 色彩：青绿、乳白、透明灰
- 材质：透明亚克力、水波、薄油膜
- 运动：青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_19_45609/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_19_45609 毒箭雨
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你的万箭齐发变为毒系，只能用石头防，不会被反弹.
Primary request: 透明防御波纹; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "毒箭雨" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_19_45609 毒箭雨
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你的万箭齐发变为毒系，只能用石头防，不会被反弹.
Primary request: 透明防御波纹; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "毒箭雨" motif reaches the strongest readable silhouette; 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_19_45609 毒箭雨
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你的万箭齐发变为毒系，只能用石头防，不会被反弹.
Primary request: 透明防御波纹; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_19_45609 毒箭雨
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你的万箭齐发变为毒系，只能用石头防，不会被反弹.
Primary request: 透明防御波纹; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "毒箭雨" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_19_45609 "毒箭雨".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你的万箭齐发变为毒系，只能用石头防，不会被反弹.
Visual language: teal translucent acrylic ripple shield, soft oil film, museum installation lighting; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_20_63089：冰箭雨

- 名称：冰箭雨
- 分类：locked
- 时机：被动技能；印记使用：变伤阶段
- 描述：锁定技，你的万箭齐发变为冰系，不会被反弹，命中后赋予1层“冰雨”印记；回合中，当你受到其他玩家的攻击时，若他有“冰雨”印记，可以消耗1层，使其对你的攻击-2
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=no_direct_effect
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：锁定技，你的万箭齐发变为冰系，不会被反弹，命中后赋予1层“冰雨”印记；回合中，当你受到其他玩家的攻击时，若他有“冰雨”印记，可以消耗1层，使其对你的攻击-2; cost 0, target none
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_20_63089/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_20_63089 冰箭雨
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 锁定技，你的万箭齐发变为冰系，不会被反弹，命中后赋予1层“冰雨”印记；回合中，当你受到其他玩家的攻击时，若他有“冰雨”印记，可以消耗1层，使其对你的攻击-2; cost 0, target none.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "冰箭雨" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_20_63089 冰箭雨
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 锁定技，你的万箭齐发变为冰系，不会被反弹，命中后赋予1层“冰雨”印记；回合中，当你受到其他玩家的攻击时，若他有“冰雨”印记，可以消耗1层，使其对你的攻击-2; cost 0, target none.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "冰箭雨" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_20_63089 冰箭雨
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 锁定技，你的万箭齐发变为冰系，不会被反弹，命中后赋予1层“冰雨”印记；回合中，当你受到其他玩家的攻击时，若他有“冰雨”印记，可以消耗1层，使其对你的攻击-2; cost 0, target none.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_20_63089 冰箭雨
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 锁定技，你的万箭齐发变为冰系，不会被反弹，命中后赋予1层“冰雨”印记；回合中，当你受到其他玩家的攻击时，若他有“冰雨”印记，可以消耗1层，使其对你的攻击-2; cost 0, target none.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "冰箭雨" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_20_63089 "冰箭雨".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 锁定技，你的万箭齐发变为冰系，不会被反弹，命中后赋予1层“冰雨”印记；回合中，当你受到其他玩家的攻击时，若他有“冰雨”印记，可以消耗1层，使其对你的攻击-2; cost 0, target none.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_21_36332：熔岩之怒

- 名称：熔岩之怒
- 分类：locked
- 时机：被动技能；印记使用：变招阶段
- 描述：锁定技，你每出3次石头，获得1层“熔岩”印记，最高3层；回合中，当你使用攻击时，可以消耗x层，使该攻击变为火系，攻等+x
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=lava_mark
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：锁定技，你每出3次石头，获得1层“熔岩”印记，最高3层；回合中，当你使用攻击时，可以消耗x层，使该攻击变为火系，攻等+x; cost 0, target none
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_21_36332/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_21_36332 熔岩之怒
Gameplay meaning: kind=effect / cost=0 / target=none / effect=lava_mark.
Mechanic-specific cue: 锁定技，你每出3次石头，获得1层“熔岩”印记，最高3层；回合中，当你使用攻击时，可以消耗x层，使该攻击变为火系，攻等+x; cost 0, target none.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "熔岩之怒" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_21_36332 熔岩之怒
Gameplay meaning: kind=effect / cost=0 / target=none / effect=lava_mark.
Mechanic-specific cue: 锁定技，你每出3次石头，获得1层“熔岩”印记，最高3层；回合中，当你使用攻击时，可以消耗x层，使该攻击变为火系，攻等+x; cost 0, target none.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "熔岩之怒" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_21_36332 熔岩之怒
Gameplay meaning: kind=effect / cost=0 / target=none / effect=lava_mark.
Mechanic-specific cue: 锁定技，你每出3次石头，获得1层“熔岩”印记，最高3层；回合中，当你使用攻击时，可以消耗x层，使该攻击变为火系，攻等+x; cost 0, target none.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_21_36332 熔岩之怒
Gameplay meaning: kind=effect / cost=0 / target=none / effect=lava_mark.
Mechanic-specific cue: 锁定技，你每出3次石头，获得1层“熔岩”印记，最高3层；回合中，当你使用攻击时，可以消耗x层，使该攻击变为火系，攻等+x; cost 0, target none.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "熔岩之怒" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_21_36332 "熔岩之怒".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=lava_mark. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 锁定技，你每出3次石头，获得1层“熔岩”印记，最高3层；回合中，当你使用攻击时，可以消耗x层，使该攻击变为火系，攻等+x; cost 0, target none.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_22_54978：凛冬之怒

- 名称：凛冬之怒
- 分类：locked
- 时机：被动技能；印记使用：变招阶段
- 描述：锁定技，你每出3次油条，获得1层“凛冬”印记，最高3层；回合中，当你使用攻击时，可以消耗x层，使该攻击变为冰系，攻击-x，等级+x，命中后赋予x回合“冰冻”；冰冻：无法出招；
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=winter_mark
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：锁定技，你每出3次油条，获得1层“凛冬”印记，最高3层；回合中，当你使用攻击时，可以消耗x层，使该攻击变为冰系，攻击-x，等级+x，命中后赋予x回合“冰冻”；冰冻：无法出招；; cost 0, target none
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_22_54978/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_22_54978 凛冬之怒
Gameplay meaning: kind=effect / cost=0 / target=none / effect=winter_mark.
Mechanic-specific cue: 锁定技，你每出3次油条，获得1层“凛冬”印记，最高3层；回合中，当你使用攻击时，可以消耗x层，使该攻击变为冰系，攻击-x，等级+x，命中后赋予x回合“冰冻”；冰冻：无法出招；; cost 0, target none.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "凛冬之怒" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_22_54978 凛冬之怒
Gameplay meaning: kind=effect / cost=0 / target=none / effect=winter_mark.
Mechanic-specific cue: 锁定技，你每出3次油条，获得1层“凛冬”印记，最高3层；回合中，当你使用攻击时，可以消耗x层，使该攻击变为冰系，攻击-x，等级+x，命中后赋予x回合“冰冻”；冰冻：无法出招；; cost 0, target none.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "凛冬之怒" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_22_54978 凛冬之怒
Gameplay meaning: kind=effect / cost=0 / target=none / effect=winter_mark.
Mechanic-specific cue: 锁定技，你每出3次油条，获得1层“凛冬”印记，最高3层；回合中，当你使用攻击时，可以消耗x层，使该攻击变为冰系，攻击-x，等级+x，命中后赋予x回合“冰冻”；冰冻：无法出招；; cost 0, target none.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_22_54978 凛冬之怒
Gameplay meaning: kind=effect / cost=0 / target=none / effect=winter_mark.
Mechanic-specific cue: 锁定技，你每出3次油条，获得1层“凛冬”印记，最高3层；回合中，当你使用攻击时，可以消耗x层，使该攻击变为冰系，攻击-x，等级+x，命中后赋予x回合“冰冻”；冰冻：无法出招；; cost 0, target none.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "凛冬之怒" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_22_54978 "凛冬之怒".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=winter_mark. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 锁定技，你每出3次油条，获得1层“凛冬”印记，最高3层；回合中，当你使用攻击时，可以消耗x层，使该攻击变为冰系，攻击-x，等级+x，命中后赋予x回合“冰冻”；冰冻：无法出招；; cost 0, target none.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_23_90895：神隐红莲

- 名称：神隐红莲
- 分类：locked
- 时机：被动技能
- 描述：锁定技，当你濒死时，+1血
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，当你濒死时，+1血
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_23_90895/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_23_90895 神隐红莲
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，当你濒死时，+1血.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "神隐红莲" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_23_90895 神隐红莲
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，当你濒死时，+1血.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "神隐红莲" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_23_90895 神隐红莲
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，当你濒死时，+1血.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_23_90895 神隐红莲
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，当你濒死时，+1血.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "神隐红莲" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_23_90895 "神隐红莲".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，当你濒死时，+1血.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_24_71363：神隐青莲

- 名称：神隐青莲
- 分类：control
- 时机：随时可用
- 描述：控制技，当你濒死时，可以消耗3饼，+3血，下轮轮初+1饼
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=3 / target=none / effect=no_direct_effect / selfHeal=3
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：控制技，当你濒死时，可以消耗3饼，+3血，下轮轮初+1饼; cost 3, target none; self heal 3
- 视觉原型：暖白治愈晕染
- 色彩：暖白、淡黄、浅粉
- 材质：柔软油彩晕染、薄纱状透明颜料
- 运动：暖白颜料从中心慢慢开花，淡黄光斑浮起，末尾融入画布
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_24_71363/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_24_71363 神隐青莲
Gameplay meaning: kind=effect / cost=3 / target=none / effect=no_direct_effect / selfHeal=3.
Mechanic-specific cue: 控制技，当你濒死时，可以消耗3饼，+3血，下轮轮初+1饼; cost 3, target none; self heal 3.
Primary request: 暖白治愈晕染; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "神隐青莲" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 暖白、淡黄、浅粉.
Materials/textures: 柔软油彩晕染、薄纱状透明颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_24_71363 神隐青莲
Gameplay meaning: kind=effect / cost=3 / target=none / effect=no_direct_effect / selfHeal=3.
Mechanic-specific cue: 控制技，当你濒死时，可以消耗3饼，+3血，下轮轮初+1饼; cost 3, target none; self heal 3.
Primary request: 暖白治愈晕染; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "神隐青莲" motif reaches the strongest readable silhouette; 暖白颜料从中心慢慢开花，淡黄光斑浮起，末尾融入画布; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 暖白、淡黄、浅粉.
Materials/textures: 柔软油彩晕染、薄纱状透明颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_24_71363 神隐青莲
Gameplay meaning: kind=effect / cost=3 / target=none / effect=no_direct_effect / selfHeal=3.
Mechanic-specific cue: 控制技，当你濒死时，可以消耗3饼，+3血，下轮轮初+1饼; cost 3, target none; self heal 3.
Primary request: 暖白治愈晕染; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 暖白、淡黄、浅粉.
Materials/textures: 柔软油彩晕染、薄纱状透明颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_24_71363 神隐青莲
Gameplay meaning: kind=effect / cost=3 / target=none / effect=no_direct_effect / selfHeal=3.
Mechanic-specific cue: 控制技，当你濒死时，可以消耗3饼，+3血，下轮轮初+1饼; cost 3, target none; self heal 3.
Primary request: 暖白治愈晕染; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "神隐青莲" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 暖白、淡黄、浅粉.
Materials/textures: 柔软油彩晕染、薄纱状透明颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_24_71363 "神隐青莲".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=3 / target=none / effect=no_direct_effect / selfHeal=3. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 控制技，当你濒死时，可以消耗3饼，+3血，下轮轮初+1饼; cost 3, target none; self heal 3.
Visual language: warm white and pale yellow oil paint bloom, gentle healing pigment spreading on canvas; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 暖白颜料从中心慢慢开花，淡黄光斑浮起，末尾融入画布.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_25_51277：暗影盾

- 名称：暗影盾
- 分类：limited
- 时机：变招阶段
- 描述：限定技，一局限1次，免疫此回合受到的不超过无限的攻击，+8防御值
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=invulnerable_turn / uses=1
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：限定技，一局限1次，免疫此回合受到的不超过无限的攻击，+8防御值; cost 0, target none; limited 1 use(s)
- 视觉原型：透明防御波纹
- 色彩：青绿、乳白、透明灰
- 材质：透明亚克力、水波、薄油膜
- 运动：青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_25_51277/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_25_51277 暗影盾
Gameplay meaning: kind=effect / cost=0 / target=none / effect=invulnerable_turn / uses=1.
Mechanic-specific cue: 限定技，一局限1次，免疫此回合受到的不超过无限的攻击，+8防御值; cost 0, target none; limited 1 use(s).
Primary request: 透明防御波纹; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "暗影盾" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_25_51277 暗影盾
Gameplay meaning: kind=effect / cost=0 / target=none / effect=invulnerable_turn / uses=1.
Mechanic-specific cue: 限定技，一局限1次，免疫此回合受到的不超过无限的攻击，+8防御值; cost 0, target none; limited 1 use(s).
Primary request: 透明防御波纹; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "暗影盾" motif reaches the strongest readable silhouette; 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_25_51277 暗影盾
Gameplay meaning: kind=effect / cost=0 / target=none / effect=invulnerable_turn / uses=1.
Mechanic-specific cue: 限定技，一局限1次，免疫此回合受到的不超过无限的攻击，+8防御值; cost 0, target none; limited 1 use(s).
Primary request: 透明防御波纹; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_25_51277 暗影盾
Gameplay meaning: kind=effect / cost=0 / target=none / effect=invulnerable_turn / uses=1.
Mechanic-specific cue: 限定技，一局限1次，免疫此回合受到的不超过无限的攻击，+8防御值; cost 0, target none; limited 1 use(s).
Primary request: 透明防御波纹; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "暗影盾" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_25_51277 "暗影盾".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=invulnerable_turn / uses=1. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 限定技，一局限1次，免疫此回合受到的不超过无限的攻击，+8防御值; cost 0, target none; limited 1 use(s).
Visual language: teal translucent acrylic ripple shield, soft oil film, museum installation lighting; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_26_70243：后盾

- 名称：后盾
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你对补刀者无敌
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你对补刀者无敌
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_26_70243/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_26_70243 后盾
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你对补刀者无敌.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "后盾" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_26_70243 后盾
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你对补刀者无敌.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "后盾" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_26_70243 后盾
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你对补刀者无敌.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_26_70243 后盾
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你对补刀者无敌.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "后盾" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_26_70243 "后盾".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你对补刀者无敌.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_27_23816：全力一击

- 名称：全力一击
- 分类：attack
- 时机：出招
- 描述：技能攻击，0饼，攻无限，-1级，任意防，被防住则你-3血
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=attack / cost=0 / target=single / element=physical / power=999 / level=-1
- 触发表现：在出招、目标确认、命中结算三段中播放。
- 机制视觉线索：技能攻击，0饼，攻无限，-1级，任意防，被防住则你-3血; cost 0, target single; power 999; level -1; defense any
- 视觉原型：红色油彩冲击
- 色彩：深红、赭石、少量黑色
- 材质：厚涂红色油彩、刮刀痕、画布颗粒
- 运动：红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_27_23816/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_27_23816 全力一击
Gameplay meaning: kind=attack / cost=0 / target=single / element=physical / power=999 / level=-1.
Mechanic-specific cue: 技能攻击，0饼，攻无限，-1级，任意防，被防住则你-3血; cost 0, target single; power 999; level -1; defense any.
Primary request: 红色油彩冲击; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "全力一击" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity high-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_27_23816 全力一击
Gameplay meaning: kind=attack / cost=0 / target=single / element=physical / power=999 / level=-1.
Mechanic-specific cue: 技能攻击，0饼，攻无限，-1级，任意防，被防住则你-3血; cost 0, target single; power 999; level -1; defense any.
Primary request: 红色油彩冲击; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "全力一击" motif reaches the strongest readable silhouette; 红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射; emphasize high-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_27_23816 全力一击
Gameplay meaning: kind=attack / cost=0 / target=single / element=physical / power=999 / level=-1.
Mechanic-specific cue: 技能攻击，0饼，攻无限，-1级，任意防，被防住则你-3血; cost 0, target single; power 999; level -1; defense any.
Primary request: 红色油彩冲击; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_27_23816 全力一击
Gameplay meaning: kind=attack / cost=0 / target=single / element=physical / power=999 / level=-1.
Mechanic-specific cue: 技能攻击，0饼，攻无限，-1级，任意防，被防住则你-3血; cost 0, target single; power 999; level -1; defense any.
Primary request: 红色油彩冲击; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "全力一击" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_27_23816 "全力一击".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=attack / cost=0 / target=single / element=physical / power=999 / level=-1. Trigger behavior: 在出招、目标确认、命中结算三段中播放。
Mechanic-specific cue: 技能攻击，0饼，攻无限，-1级，任意防，被防住则你-3血; cost 0, target single; power 999; level -1; defense any.
Visual language: deep red oil paint impact splash, palette knife texture, canvas grain, shared dining installation; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_28_42646：狙击枪

- 名称：狙击枪
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你补刀时，伤害×2
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=turn_damage_check, passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你补刀时，伤害×2
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_28_42646/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_28_42646 狙击枪
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check.
Mechanic-specific cue: 锁定技，你补刀时，伤害×2.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "狙击枪" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_28_42646 狙击枪
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check.
Mechanic-specific cue: 锁定技，你补刀时，伤害×2.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "狙击枪" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_28_42646 狙击枪
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check.
Mechanic-specific cue: 锁定技，你补刀时，伤害×2.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_28_42646 狙击枪
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check.
Mechanic-specific cue: 锁定技，你补刀时，伤害×2.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "狙击枪" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_28_42646 "狙击枪".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你补刀时，伤害×2.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_29_96125：古淀刀

- 名称：古淀刀
- 分类：locked
- 时机：被动技能
- 描述：锁定技，当你的攻击命中目标时，若目标饼数≤0，你造成的伤害×2
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=turn_damage_check, passive_check, turn_hit_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，当你的攻击命中目标时，若目标饼数≤0，你造成的伤害×2
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_29_96125/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_29_96125 古淀刀
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check, turn_hit_check.
Mechanic-specific cue: 锁定技，当你的攻击命中目标时，若目标饼数≤0，你造成的伤害×2.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "古淀刀" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_29_96125 古淀刀
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check, turn_hit_check.
Mechanic-specific cue: 锁定技，当你的攻击命中目标时，若目标饼数≤0，你造成的伤害×2.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "古淀刀" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_29_96125 古淀刀
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check, turn_hit_check.
Mechanic-specific cue: 锁定技，当你的攻击命中目标时，若目标饼数≤0，你造成的伤害×2.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_29_96125 古淀刀
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check, turn_hit_check.
Mechanic-specific cue: 锁定技，当你的攻击命中目标时，若目标饼数≤0，你造成的伤害×2.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "古淀刀" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_29_96125 "古淀刀".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check, turn_hit_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，当你的攻击命中目标时，若目标饼数≤0，你造成的伤害×2.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_30_38815：青釭剑

- 名称：青釭剑
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你的攻击无视换防、幻防、八卦阵、藤甲、无形之盾、神之庇佑
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你的攻击无视换防、幻防、八卦阵、藤甲、无形之盾、神之庇佑
- 视觉原型：透明防御波纹
- 色彩：青绿、乳白、透明灰
- 材质：透明亚克力、水波、薄油膜
- 运动：青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_30_38815/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_30_38815 青釭剑
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你的攻击无视换防、幻防、八卦阵、藤甲、无形之盾、神之庇佑.
Primary request: 透明防御波纹; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "青釭剑" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_30_38815 青釭剑
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你的攻击无视换防、幻防、八卦阵、藤甲、无形之盾、神之庇佑.
Primary request: 透明防御波纹; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "青釭剑" motif reaches the strongest readable silhouette; 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_30_38815 青釭剑
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你的攻击无视换防、幻防、八卦阵、藤甲、无形之盾、神之庇佑.
Primary request: 透明防御波纹; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_30_38815 青釭剑
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你的攻击无视换防、幻防、八卦阵、藤甲、无形之盾、神之庇佑.
Primary request: 透明防御波纹; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "青釭剑" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_30_38815 "青釭剑".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你的攻击无视换防、幻防、八卦阵、藤甲、无形之盾、神之庇佑.
Visual language: teal translucent acrylic ripple shield, soft oil film, museum installation lighting; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_31_80497：双刃剑

- 名称：双刃剑
- 分类：control
- 时机：变招阶段
- 描述：控制技，当你的攻击被非反弹防住时，你可以-1血，使该攻击无视其防御出招
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=no_direct_effect
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：控制技，当你的攻击被非反弹防住时，你可以-1血，使该攻击无视其防御出招; cost 0, target none
- 视觉原型：透明防御波纹
- 色彩：青绿、乳白、透明灰
- 材质：透明亚克力、水波、薄油膜
- 运动：青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_31_80497/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_31_80497 双刃剑
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，当你的攻击被非反弹防住时，你可以-1血，使该攻击无视其防御出招; cost 0, target none.
Primary request: 透明防御波纹; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "双刃剑" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_31_80497 双刃剑
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，当你的攻击被非反弹防住时，你可以-1血，使该攻击无视其防御出招; cost 0, target none.
Primary request: 透明防御波纹; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "双刃剑" motif reaches the strongest readable silhouette; 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_31_80497 双刃剑
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，当你的攻击被非反弹防住时，你可以-1血，使该攻击无视其防御出招; cost 0, target none.
Primary request: 透明防御波纹; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_31_80497 双刃剑
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，当你的攻击被非反弹防住时，你可以-1血，使该攻击无视其防御出招; cost 0, target none.
Primary request: 透明防御波纹; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "双刃剑" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_31_80497 "双刃剑".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 控制技，当你的攻击被非反弹防住时，你可以-1血，使该攻击无视其防御出招; cost 0, target none.
Visual language: teal translucent acrylic ripple shield, soft oil film, museum installation lighting; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_32_19017：神之庇护

- 名称：神之庇护
- 分类：locked
- 时机：被动技能
- 描述：锁定技，每轮前2回合无敌
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=turn_hit_check, passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，每轮前2回合无敌
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_32_19017/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_32_19017 神之庇护
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，每轮前2回合无敌.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "神之庇护" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_32_19017 神之庇护
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，每轮前2回合无敌.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "神之庇护" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_32_19017 神之庇护
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，每轮前2回合无敌.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_32_19017 神之庇护
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，每轮前2回合无敌.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "神之庇护" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_32_19017 "神之庇护".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，每轮前2回合无敌.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_33_55159：神族水晶

- 名称：神族水晶
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你出招后，若出招有等级，出招总等级+1
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=turn_reveal_check, passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你出招后，若出招有等级，出招总等级+1
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_33_55159/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_33_55159 神族水晶
Gameplay meaning: visual-only / phases=turn_reveal_check, passive_check.
Mechanic-specific cue: 锁定技，你出招后，若出招有等级，出招总等级+1.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "神族水晶" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_33_55159 神族水晶
Gameplay meaning: visual-only / phases=turn_reveal_check, passive_check.
Mechanic-specific cue: 锁定技，你出招后，若出招有等级，出招总等级+1.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "神族水晶" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_33_55159 神族水晶
Gameplay meaning: visual-only / phases=turn_reveal_check, passive_check.
Mechanic-specific cue: 锁定技，你出招后，若出招有等级，出招总等级+1.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_33_55159 神族水晶
Gameplay meaning: visual-only / phases=turn_reveal_check, passive_check.
Mechanic-specific cue: 锁定技，你出招后，若出招有等级，出招总等级+1.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "神族水晶" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_33_55159 "神族水晶".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=turn_reveal_check, passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你出招后，若出招有等级，出招总等级+1.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_34_1533：酒

- 名称：酒
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你出招后，若出招有攻击，出招总攻击+1
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=turn_reveal_check, passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你出招后，若出招有攻击，出招总攻击+1
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_34_1533/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_34_1533 酒
Gameplay meaning: visual-only / phases=turn_reveal_check, passive_check.
Mechanic-specific cue: 锁定技，你出招后，若出招有攻击，出招总攻击+1.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "酒" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_34_1533 酒
Gameplay meaning: visual-only / phases=turn_reveal_check, passive_check.
Mechanic-specific cue: 锁定技，你出招后，若出招有攻击，出招总攻击+1.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "酒" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_34_1533 酒
Gameplay meaning: visual-only / phases=turn_reveal_check, passive_check.
Mechanic-specific cue: 锁定技，你出招后，若出招有攻击，出招总攻击+1.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_34_1533 酒
Gameplay meaning: visual-only / phases=turn_reveal_check, passive_check.
Mechanic-specific cue: 锁定技，你出招后，若出招有攻击，出招总攻击+1.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "酒" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_34_1533 "酒".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=turn_reveal_check, passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你出招后，若出招有攻击，出招总攻击+1.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_35_16792：雷电法术

- 名称：雷电法术
- 分类：limited
- 时机：随时可用
- 描述：限定技，一局限2次，对除你外血量最高的2名玩家造成2点电系法伤，当有＞2名血量最高玩家时，由你选择伤害目标
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=2
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：限定技，一局限2次，对除你外血量最高的2名玩家造成2点电系法伤，当有＞2名血量最高玩家时，由你选择伤害目标; cost 0, target single; limited 2 use(s)
- 视觉原型：石墨线控场
- 色彩：石墨黑、灰蓝、少量青绿
- 材质：细金属支架线、铅笔线稿、透明胶片
- 运动：石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_35_16792/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_35_16792 雷电法术
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=2.
Mechanic-specific cue: 限定技，一局限2次，对除你外血量最高的2名玩家造成2点电系法伤，当有＞2名血量最高玩家时，由你选择伤害目标; cost 0, target single; limited 2 use(s).
Primary request: 石墨线控场; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "雷电法术" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_35_16792 雷电法术
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=2.
Mechanic-specific cue: 限定技，一局限2次，对除你外血量最高的2名玩家造成2点电系法伤，当有＞2名血量最高玩家时，由你选择伤害目标; cost 0, target single; limited 2 use(s).
Primary request: 石墨线控场; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "雷电法术" motif reaches the strongest readable silhouette; 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_35_16792 雷电法术
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=2.
Mechanic-specific cue: 限定技，一局限2次，对除你外血量最高的2名玩家造成2点电系法伤，当有＞2名血量最高玩家时，由你选择伤害目标; cost 0, target single; limited 2 use(s).
Primary request: 石墨线控场; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_35_16792 雷电法术
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=2.
Mechanic-specific cue: 限定技，一局限2次，对除你外血量最高的2名玩家造成2点电系法伤，当有＞2名血量最高玩家时，由你选择伤害目标; cost 0, target single; limited 2 use(s).
Primary request: 石墨线控场; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "雷电法术" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_35_16792 "雷电法术".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=2. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 限定技，一局限2次，对除你外血量最高的2名玩家造成2点电系法伤，当有＞2名血量最高玩家时，由你选择伤害目标; cost 0, target single; limited 2 use(s).
Visual language: graphite linework and thin metal rods constricting, transparent installation control effect; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_36_14343：电击法术

- 名称：电击法术
- 分类：limited
- 时机：出招
- 描述：限定技，一局限1次，技能出招，选取1到2名玩家作为目标，等级无限，反弹防，电系；命中后使其麻痹1回合
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=1
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：限定技，一局限1次，技能出招，选取1到2名玩家作为目标，等级无限，反弹防，电系；命中后使其麻痹1回合; cost 0, target single; limited 1 use(s)
- 视觉原型：透明防御波纹
- 色彩：青绿、乳白、透明灰
- 材质：透明亚克力、水波、薄油膜
- 运动：青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_36_14343/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_36_14343 电击法术
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，一局限1次，技能出招，选取1到2名玩家作为目标，等级无限，反弹防，电系；命中后使其麻痹1回合; cost 0, target single; limited 1 use(s).
Primary request: 透明防御波纹; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "电击法术" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_36_14343 电击法术
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，一局限1次，技能出招，选取1到2名玩家作为目标，等级无限，反弹防，电系；命中后使其麻痹1回合; cost 0, target single; limited 1 use(s).
Primary request: 透明防御波纹; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "电击法术" motif reaches the strongest readable silhouette; 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_36_14343 电击法术
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，一局限1次，技能出招，选取1到2名玩家作为目标，等级无限，反弹防，电系；命中后使其麻痹1回合; cost 0, target single; limited 1 use(s).
Primary request: 透明防御波纹; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_36_14343 电击法术
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，一局限1次，技能出招，选取1到2名玩家作为目标，等级无限，反弹防，电系；命中后使其麻痹1回合; cost 0, target single; limited 1 use(s).
Primary request: 透明防御波纹; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "电击法术" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_36_14343 "电击法术".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=1. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 限定技，一局限1次，技能出招，选取1到2名玩家作为目标，等级无限，反弹防，电系；命中后使其麻痹1回合; cost 0, target single; limited 1 use(s).
Visual language: teal translucent acrylic ripple shield, soft oil film, museum installation lighting; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_37_68416：鬼道

- 名称：鬼道
- 分类：attack
- 时机：被动技能；资源使用：出招
- 描述：锁定技，当你使用小防防住他人攻击时，根据攻击重数获得等量的“鬼道”次数；鬼道：技能出招，攻1，2级，油条防，电系
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=attack / cost=0 / target=single / element=electric / power=1 / level=2
- 触发表现：在出招、目标确认、命中结算三段中播放。
- 机制视觉线索：锁定技，当你使用小防防住他人攻击时，根据攻击重数获得等量的“鬼道”次数；鬼道：技能出招，攻1，2级，油条防，电系; cost 0, target single; power 1; level 2; defense youtiao
- 视觉原型：电流金属线绘
- 色彩：柠檬黄、钴蓝、石墨黑
- 材质：细金属线、亮黄油彩点、透明导线反光
- 运动：细线绷紧并抖动，黄色颜料沿线路跳跃，命中时产生短促星状飞溅
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_37_68416/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_37_68416 鬼道
Gameplay meaning: kind=attack / cost=0 / target=single / element=electric / power=1 / level=2.
Mechanic-specific cue: 锁定技，当你使用小防防住他人攻击时，根据攻击重数获得等量的“鬼道”次数；鬼道：技能出招，攻1，2级，油条防，电系; cost 0, target single; power 1; level 2; defense youtiao.
Primary request: 电流金属线绘; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "鬼道" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 柠檬黄、钴蓝、石墨黑.
Materials/textures: 细金属线、亮黄油彩点、透明导线反光.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_37_68416 鬼道
Gameplay meaning: kind=attack / cost=0 / target=single / element=electric / power=1 / level=2.
Mechanic-specific cue: 锁定技，当你使用小防防住他人攻击时，根据攻击重数获得等量的“鬼道”次数；鬼道：技能出招，攻1，2级，油条防，电系; cost 0, target single; power 1; level 2; defense youtiao.
Primary request: 电流金属线绘; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "鬼道" motif reaches the strongest readable silhouette; 细线绷紧并抖动，黄色颜料沿线路跳跃，命中时产生短促星状飞溅; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 柠檬黄、钴蓝、石墨黑.
Materials/textures: 细金属线、亮黄油彩点、透明导线反光.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_37_68416 鬼道
Gameplay meaning: kind=attack / cost=0 / target=single / element=electric / power=1 / level=2.
Mechanic-specific cue: 锁定技，当你使用小防防住他人攻击时，根据攻击重数获得等量的“鬼道”次数；鬼道：技能出招，攻1，2级，油条防，电系; cost 0, target single; power 1; level 2; defense youtiao.
Primary request: 电流金属线绘; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 柠檬黄、钴蓝、石墨黑.
Materials/textures: 细金属线、亮黄油彩点、透明导线反光.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_37_68416 鬼道
Gameplay meaning: kind=attack / cost=0 / target=single / element=electric / power=1 / level=2.
Mechanic-specific cue: 锁定技，当你使用小防防住他人攻击时，根据攻击重数获得等量的“鬼道”次数；鬼道：技能出招，攻1，2级，油条防，电系; cost 0, target single; power 1; level 2; defense youtiao.
Primary request: 电流金属线绘; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "鬼道" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 柠檬黄、钴蓝、石墨黑.
Materials/textures: 细金属线、亮黄油彩点、透明导线反光.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_37_68416 "鬼道".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=attack / cost=0 / target=single / element=electric / power=1 / level=2. Trigger behavior: 在出招、目标确认、命中结算三段中播放。
Mechanic-specific cue: 锁定技，当你使用小防防住他人攻击时，根据攻击重数获得等量的“鬼道”次数；鬼道：技能出招，攻1，2级，油条防，电系; cost 0, target single; power 1; level 2; defense youtiao.
Visual language: thin metal wire vibration with lemon yellow oil paint sparks and cobalt blue pigment; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线绷紧并抖动，黄色颜料沿线路跳跃，命中时产生短促星状飞溅.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_38_81245：闪电护体

- 名称：闪电护体
- 分类：locked
- 时机：被动技能
- 描述：锁定技，当你受到多个攻击不超过无限的攻击时，只承受其中攻击最低的1个攻击
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=turn_hit_check, passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，当你受到多个攻击不超过无限的攻击时，只承受其中攻击最低的1个攻击
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_38_81245/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_38_81245 闪电护体
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，当你受到多个攻击不超过无限的攻击时，只承受其中攻击最低的1个攻击.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "闪电护体" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_38_81245 闪电护体
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，当你受到多个攻击不超过无限的攻击时，只承受其中攻击最低的1个攻击.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "闪电护体" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_38_81245 闪电护体
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，当你受到多个攻击不超过无限的攻击时，只承受其中攻击最低的1个攻击.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_38_81245 闪电护体
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，当你受到多个攻击不超过无限的攻击时，只承受其中攻击最低的1个攻击.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "闪电护体" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_38_81245 "闪电护体".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，当你受到多个攻击不超过无限的攻击时，只承受其中攻击最低的1个攻击.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_39_77400：大地之心

- 名称：大地之心
- 分类：locked
- 时机：被动技能
- 描述：锁定技，当你受到电系出招时，你免疫该出招，并+4防御值
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，当你受到电系出招时，你免疫该出招，并+4防御值
- 视觉原型：透明防御波纹
- 色彩：青绿、乳白、透明灰
- 材质：透明亚克力、水波、薄油膜
- 运动：青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_39_77400/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_39_77400 大地之心
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，当你受到电系出招时，你免疫该出招，并+4防御值.
Primary request: 透明防御波纹; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "大地之心" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_39_77400 大地之心
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，当你受到电系出招时，你免疫该出招，并+4防御值.
Primary request: 透明防御波纹; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "大地之心" motif reaches the strongest readable silhouette; 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_39_77400 大地之心
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，当你受到电系出招时，你免疫该出招，并+4防御值.
Primary request: 透明防御波纹; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_39_77400 大地之心
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，当你受到电系出招时，你免疫该出招，并+4防御值.
Primary request: 透明防御波纹; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "大地之心" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_39_77400 "大地之心".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，当你受到电系出招时，你免疫该出招，并+4防御值.
Visual language: teal translucent acrylic ripple shield, soft oil film, museum installation lighting; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_40_27274：碎石掌

- 名称：碎石掌
- 分类：attack
- 时机：出招
- 描述：技能攻击，3饼，攻3，2级，小防防，目标出石头时攻击变为6
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=attack / cost=3 / target=single / element=physical / power=3 / level=2
- 触发表现：在出招、目标确认、命中结算三段中播放。
- 机制视觉线索：技能攻击，3饼，攻3，2级，小防防，目标出石头时攻击变为6; cost 3, target single; power 3; level 2; defense small
- 视觉原型：红色油彩冲击
- 色彩：深红、赭石、少量黑色
- 材质：厚涂红色油彩、刮刀痕、画布颗粒
- 运动：红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_40_27274/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_40_27274 碎石掌
Gameplay meaning: kind=attack / cost=3 / target=single / element=physical / power=3 / level=2.
Mechanic-specific cue: 技能攻击，3饼，攻3，2级，小防防，目标出石头时攻击变为6; cost 3, target single; power 3; level 2; defense small.
Primary request: 红色油彩冲击; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "碎石掌" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity medium-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_40_27274 碎石掌
Gameplay meaning: kind=attack / cost=3 / target=single / element=physical / power=3 / level=2.
Mechanic-specific cue: 技能攻击，3饼，攻3，2级，小防防，目标出石头时攻击变为6; cost 3, target single; power 3; level 2; defense small.
Primary request: 红色油彩冲击; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "碎石掌" motif reaches the strongest readable silhouette; 红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射; emphasize medium-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_40_27274 碎石掌
Gameplay meaning: kind=attack / cost=3 / target=single / element=physical / power=3 / level=2.
Mechanic-specific cue: 技能攻击，3饼，攻3，2级，小防防，目标出石头时攻击变为6; cost 3, target single; power 3; level 2; defense small.
Primary request: 红色油彩冲击; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_40_27274 碎石掌
Gameplay meaning: kind=attack / cost=3 / target=single / element=physical / power=3 / level=2.
Mechanic-specific cue: 技能攻击，3饼，攻3，2级，小防防，目标出石头时攻击变为6; cost 3, target single; power 3; level 2; defense small.
Primary request: 红色油彩冲击; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "碎石掌" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_40_27274 "碎石掌".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=attack / cost=3 / target=single / element=physical / power=3 / level=2. Trigger behavior: 在出招、目标确认、命中结算三段中播放。
Mechanic-specific cue: 技能攻击，3饼，攻3，2级，小防防，目标出石头时攻击变为6; cost 3, target single; power 3; level 2; defense small.
Visual language: deep red oil paint impact splash, palette knife texture, canvas grain, shared dining installation; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_41_43495：裂山拳

- 名称：裂山拳
- 分类：attack
- 时机：出招
- 描述：技能攻击，3饼，攻2，3级，油条防，目标出石头时攻击变为4
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=attack / cost=3 / target=single / element=physical / power=2 / level=3
- 触发表现：在出招、目标确认、命中结算三段中播放。
- 机制视觉线索：技能攻击，3饼，攻2，3级，油条防，目标出石头时攻击变为4; cost 3, target single; power 2; level 3; defense youtiao
- 视觉原型：红色油彩冲击
- 色彩：深红、赭石、少量黑色
- 材质：厚涂红色油彩、刮刀痕、画布颗粒
- 运动：红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_41_43495/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_41_43495 裂山拳
Gameplay meaning: kind=attack / cost=3 / target=single / element=physical / power=2 / level=3.
Mechanic-specific cue: 技能攻击，3饼，攻2，3级，油条防，目标出石头时攻击变为4; cost 3, target single; power 2; level 3; defense youtiao.
Primary request: 红色油彩冲击; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "裂山拳" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity medium-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_41_43495 裂山拳
Gameplay meaning: kind=attack / cost=3 / target=single / element=physical / power=2 / level=3.
Mechanic-specific cue: 技能攻击，3饼，攻2，3级，油条防，目标出石头时攻击变为4; cost 3, target single; power 2; level 3; defense youtiao.
Primary request: 红色油彩冲击; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "裂山拳" motif reaches the strongest readable silhouette; 红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射; emphasize medium-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_41_43495 裂山拳
Gameplay meaning: kind=attack / cost=3 / target=single / element=physical / power=2 / level=3.
Mechanic-specific cue: 技能攻击，3饼，攻2，3级，油条防，目标出石头时攻击变为4; cost 3, target single; power 2; level 3; defense youtiao.
Primary request: 红色油彩冲击; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_41_43495 裂山拳
Gameplay meaning: kind=attack / cost=3 / target=single / element=physical / power=2 / level=3.
Mechanic-specific cue: 技能攻击，3饼，攻2，3级，油条防，目标出石头时攻击变为4; cost 3, target single; power 2; level 3; defense youtiao.
Primary request: 红色油彩冲击; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "裂山拳" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_41_43495 "裂山拳".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=attack / cost=3 / target=single / element=physical / power=2 / level=3. Trigger behavior: 在出招、目标确认、命中结算三段中播放。
Mechanic-specific cue: 技能攻击，3饼，攻2，3级，油条防，目标出石头时攻击变为4; cost 3, target single; power 2; level 3; defense youtiao.
Visual language: deep red oil paint impact splash, palette knife texture, canvas grain, shared dining installation; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_42_94266：破地之力

- 名称：破地之力
- 分类：locked
- 时机：被动技能
- 描述：锁定技，全场攻击大于2、小于6的攻击无效
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=turn_hit_check, passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，全场攻击大于2、小于6的攻击无效
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_42_94266/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_42_94266 破地之力
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，全场攻击大于2、小于6的攻击无效.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "破地之力" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_42_94266 破地之力
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，全场攻击大于2、小于6的攻击无效.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "破地之力" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_42_94266 破地之力
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，全场攻击大于2、小于6的攻击无效.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_42_94266 破地之力
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，全场攻击大于2、小于6的攻击无效.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "破地之力" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_42_94266 "破地之力".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，全场攻击大于2、小于6的攻击无效.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_43_74082：阳光普照

- 名称：阳光普照
- 分类：locked
- 时机：被动技能
- 描述：锁定技，全场攻击大于4的攻击无效
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=turn_hit_check, passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，全场攻击大于4的攻击无效
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_43_74082/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_43_74082 阳光普照
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，全场攻击大于4的攻击无效.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "阳光普照" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_43_74082 阳光普照
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，全场攻击大于4的攻击无效.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "阳光普照" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_43_74082 阳光普照
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，全场攻击大于4的攻击无效.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_43_74082 阳光普照
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，全场攻击大于4的攻击无效.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "阳光普照" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_43_74082 "阳光普照".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，全场攻击大于4的攻击无效.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_44_20092：永远之夜

- 名称：永远之夜
- 分类：locked
- 时机：被动技能
- 描述：锁定技，全场攻击小于4的攻击无效
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=turn_hit_check, passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，全场攻击小于4的攻击无效
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_44_20092/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_44_20092 永远之夜
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，全场攻击小于4的攻击无效.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "永远之夜" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_44_20092 永远之夜
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，全场攻击小于4的攻击无效.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "永远之夜" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_44_20092 永远之夜
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，全场攻击小于4的攻击无效.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_44_20092 永远之夜
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，全场攻击小于4的攻击无效.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "永远之夜" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_44_20092 "永远之夜".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，全场攻击小于4的攻击无效.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_45_30424：毁灭之力

- 名称：毁灭之力
- 分类：control
- 时机：变招阶段
- 描述：控制技，2轮限1次，变招阶段，当你攻击时，可以选择1项：攻击+1等级-1、攻击-1等级+1、攻击+2等级-2、攻击-2等级+2、攻击×3等级变为0、攻击变为0等级×4
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=no_direct_effect
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：控制技，2轮限1次，变招阶段，当你攻击时，可以选择1项：攻击+1等级-1、攻击-1等级+1、攻击+2等级-2、攻击-2等级+2、攻击×3等级变为0、攻击变为0等级×4; cost 0, target none
- 视觉原型：石墨线控场
- 色彩：石墨黑、灰蓝、少量青绿
- 材质：细金属支架线、铅笔线稿、透明胶片
- 运动：石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_45_30424/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_45_30424 毁灭之力
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，2轮限1次，变招阶段，当你攻击时，可以选择1项：攻击+1等级-1、攻击-1等级+1、攻击+2等级-2、攻击-2等级+2、攻击×3等级变为0、攻击变为0等级×4; cost 0, target none.
Primary request: 石墨线控场; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "毁灭之力" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_45_30424 毁灭之力
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，2轮限1次，变招阶段，当你攻击时，可以选择1项：攻击+1等级-1、攻击-1等级+1、攻击+2等级-2、攻击-2等级+2、攻击×3等级变为0、攻击变为0等级×4; cost 0, target none.
Primary request: 石墨线控场; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "毁灭之力" motif reaches the strongest readable silhouette; 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_45_30424 毁灭之力
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，2轮限1次，变招阶段，当你攻击时，可以选择1项：攻击+1等级-1、攻击-1等级+1、攻击+2等级-2、攻击-2等级+2、攻击×3等级变为0、攻击变为0等级×4; cost 0, target none.
Primary request: 石墨线控场; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_45_30424 毁灭之力
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，2轮限1次，变招阶段，当你攻击时，可以选择1项：攻击+1等级-1、攻击-1等级+1、攻击+2等级-2、攻击-2等级+2、攻击×3等级变为0、攻击变为0等级×4; cost 0, target none.
Primary request: 石墨线控场; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "毁灭之力" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_45_30424 "毁灭之力".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 控制技，2轮限1次，变招阶段，当你攻击时，可以选择1项：攻击+1等级-1、攻击-1等级+1、攻击+2等级-2、攻击-2等级+2、攻击×3等级变为0、攻击变为0等级×4; cost 0, target none.
Visual language: graphite linework and thin metal rods constricting, transparent installation control effect; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_46_3651：嗜血

- 名称：嗜血
- 分类：locked
- 时机：被动技能
- 描述：锁定技，当你的攻击造成x点伤害时，你+x/4（下取整）点生命
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，当你的攻击造成x点伤害时，你+x/4（下取整）点生命
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_46_3651/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_46_3651 嗜血
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，当你的攻击造成x点伤害时，你+x/4（下取整）点生命.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "嗜血" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_46_3651 嗜血
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，当你的攻击造成x点伤害时，你+x/4（下取整）点生命.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "嗜血" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_46_3651 嗜血
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，当你的攻击造成x点伤害时，你+x/4（下取整）点生命.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_46_3651 嗜血
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，当你的攻击造成x点伤害时，你+x/4（下取整）点生命.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "嗜血" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_46_3651 "嗜血".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，当你的攻击造成x点伤害时，你+x/4（下取整）点生命.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_47_94841：凝血之力

- 名称：凝血之力
- 分类：limited
- 时机：轮间阶段
- 描述：限定技，一局限2次，若你上一轮共受到x点伤害，本轮轮初+x饼，加饼上限为4
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=2
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：限定技，一局限2次，若你上一轮共受到x点伤害，本轮轮初+x饼，加饼上限为4; cost 0, target none; limited 2 use(s)
- 视觉原型：石墨线控场
- 色彩：石墨黑、灰蓝、少量青绿
- 材质：细金属支架线、铅笔线稿、透明胶片
- 运动：石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_47_94841/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_47_94841 凝血之力
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=2.
Mechanic-specific cue: 限定技，一局限2次，若你上一轮共受到x点伤害，本轮轮初+x饼，加饼上限为4; cost 0, target none; limited 2 use(s).
Primary request: 石墨线控场; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "凝血之力" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_47_94841 凝血之力
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=2.
Mechanic-specific cue: 限定技，一局限2次，若你上一轮共受到x点伤害，本轮轮初+x饼，加饼上限为4; cost 0, target none; limited 2 use(s).
Primary request: 石墨线控场; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "凝血之力" motif reaches the strongest readable silhouette; 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_47_94841 凝血之力
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=2.
Mechanic-specific cue: 限定技，一局限2次，若你上一轮共受到x点伤害，本轮轮初+x饼，加饼上限为4; cost 0, target none; limited 2 use(s).
Primary request: 石墨线控场; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_47_94841 凝血之力
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=2.
Mechanic-specific cue: 限定技，一局限2次，若你上一轮共受到x点伤害，本轮轮初+x饼，加饼上限为4; cost 0, target none; limited 2 use(s).
Primary request: 石墨线控场; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "凝血之力" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_47_94841 "凝血之力".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=2. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 限定技，一局限2次，若你上一轮共受到x点伤害，本轮轮初+x饼，加饼上限为4; cost 0, target none; limited 2 use(s).
Visual language: graphite linework and thin metal rods constricting, transparent installation control effect; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_48_26455：血水屏障

- 名称：血水屏障
- 分类：limited
- 时机：随时可用
- 描述：限定技，一局限2次，你-1血，+4防御值
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=gain_defense_value / selfDamage=1 / uses=2
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：限定技，一局限2次，你-1血，+4防御值; cost 0, target none; limited 2 use(s)
- 视觉原型：透明防御波纹
- 色彩：青绿、乳白、透明灰
- 材质：透明亚克力、水波、薄油膜
- 运动：青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_48_26455/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_48_26455 血水屏障
Gameplay meaning: kind=effect / cost=0 / target=none / effect=gain_defense_value / selfDamage=1 / uses=2.
Mechanic-specific cue: 限定技，一局限2次，你-1血，+4防御值; cost 0, target none; limited 2 use(s).
Primary request: 透明防御波纹; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "血水屏障" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_48_26455 血水屏障
Gameplay meaning: kind=effect / cost=0 / target=none / effect=gain_defense_value / selfDamage=1 / uses=2.
Mechanic-specific cue: 限定技，一局限2次，你-1血，+4防御值; cost 0, target none; limited 2 use(s).
Primary request: 透明防御波纹; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "血水屏障" motif reaches the strongest readable silhouette; 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_48_26455 血水屏障
Gameplay meaning: kind=effect / cost=0 / target=none / effect=gain_defense_value / selfDamage=1 / uses=2.
Mechanic-specific cue: 限定技，一局限2次，你-1血，+4防御值; cost 0, target none; limited 2 use(s).
Primary request: 透明防御波纹; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_48_26455 血水屏障
Gameplay meaning: kind=effect / cost=0 / target=none / effect=gain_defense_value / selfDamage=1 / uses=2.
Mechanic-specific cue: 限定技，一局限2次，你-1血，+4防御值; cost 0, target none; limited 2 use(s).
Primary request: 透明防御波纹; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "血水屏障" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_48_26455 "血水屏障".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=gain_defense_value / selfDamage=1 / uses=2. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 限定技，一局限2次，你-1血，+4防御值; cost 0, target none; limited 2 use(s).
Visual language: teal translucent acrylic ripple shield, soft oil film, museum installation lighting; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_49_75347：遗计

- 名称：遗计
- 分类：locked
- 时机：被动技能
- 描述：锁定技，当你上一轮受到过伤害时，本轮轮初+2饼
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=round_start_check, passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，当你上一轮受到过伤害时，本轮轮初+2饼
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_49_75347/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_49_75347 遗计
Gameplay meaning: visual-only / phases=round_start_check, passive_check.
Mechanic-specific cue: 锁定技，当你上一轮受到过伤害时，本轮轮初+2饼.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "遗计" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_49_75347 遗计
Gameplay meaning: visual-only / phases=round_start_check, passive_check.
Mechanic-specific cue: 锁定技，当你上一轮受到过伤害时，本轮轮初+2饼.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "遗计" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_49_75347 遗计
Gameplay meaning: visual-only / phases=round_start_check, passive_check.
Mechanic-specific cue: 锁定技，当你上一轮受到过伤害时，本轮轮初+2饼.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_49_75347 遗计
Gameplay meaning: visual-only / phases=round_start_check, passive_check.
Mechanic-specific cue: 锁定技，当你上一轮受到过伤害时，本轮轮初+2饼.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "遗计" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_49_75347 "遗计".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=round_start_check, passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，当你上一轮受到过伤害时，本轮轮初+2饼.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_50_50034：八卦阵

- 名称：八卦阵
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你受到攻击时，受到的攻击伤害-1
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=turn_damage_check, passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你受到攻击时，受到的攻击伤害-1
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_50_50034/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_50_50034 八卦阵
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check.
Mechanic-specific cue: 锁定技，你受到攻击时，受到的攻击伤害-1.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "八卦阵" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_50_50034 八卦阵
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check.
Mechanic-specific cue: 锁定技，你受到攻击时，受到的攻击伤害-1.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "八卦阵" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_50_50034 八卦阵
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check.
Mechanic-specific cue: 锁定技，你受到攻击时，受到的攻击伤害-1.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_50_50034 八卦阵
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check.
Mechanic-specific cue: 锁定技，你受到攻击时，受到的攻击伤害-1.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "八卦阵" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_50_50034 "八卦阵".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你受到攻击时，受到的攻击伤害-1.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_51_92674：藤甲

- 名称：藤甲
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你免疫杀、万箭齐发、南蛮入侵，但当攻击为火系时无法免疫；你受到火系伤害时，受伤+1
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=turn_damage_check, passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你免疫杀、万箭齐发、南蛮入侵，但当攻击为火系时无法免疫；你受到火系伤害时，受伤+1
- 视觉原型：透明防御波纹
- 色彩：青绿、乳白、透明灰
- 材质：透明亚克力、水波、薄油膜
- 运动：青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_51_92674/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_51_92674 藤甲
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check.
Mechanic-specific cue: 锁定技，你免疫杀、万箭齐发、南蛮入侵，但当攻击为火系时无法免疫；你受到火系伤害时，受伤+1.
Primary request: 透明防御波纹; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "藤甲" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_51_92674 藤甲
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check.
Mechanic-specific cue: 锁定技，你免疫杀、万箭齐发、南蛮入侵，但当攻击为火系时无法免疫；你受到火系伤害时，受伤+1.
Primary request: 透明防御波纹; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "藤甲" motif reaches the strongest readable silhouette; 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_51_92674 藤甲
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check.
Mechanic-specific cue: 锁定技，你免疫杀、万箭齐发、南蛮入侵，但当攻击为火系时无法免疫；你受到火系伤害时，受伤+1.
Primary request: 透明防御波纹; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_51_92674 藤甲
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check.
Mechanic-specific cue: 锁定技，你免疫杀、万箭齐发、南蛮入侵，但当攻击为火系时无法免疫；你受到火系伤害时，受伤+1.
Primary request: 透明防御波纹; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "藤甲" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_51_92674 "藤甲".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你免疫杀、万箭齐发、南蛮入侵，但当攻击为火系时无法免疫；你受到火系伤害时，受伤+1.
Visual language: teal translucent acrylic ripple shield, soft oil film, museum installation lighting; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_52_22171：克己

- 名称：克己
- 分类：locked
- 时机：被动技能
- 描述：锁定技，当你本轮未使用过攻击时，保留1/3（向下取整）的饼至下轮轮初
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=round_end_check, passive_check, round_start_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，当你本轮未使用过攻击时，保留1/3（向下取整）的饼至下轮轮初
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_52_22171/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_52_22171 克己
Gameplay meaning: visual-only / phases=round_end_check, passive_check, round_start_check.
Mechanic-specific cue: 锁定技，当你本轮未使用过攻击时，保留1/3（向下取整）的饼至下轮轮初.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "克己" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_52_22171 克己
Gameplay meaning: visual-only / phases=round_end_check, passive_check, round_start_check.
Mechanic-specific cue: 锁定技，当你本轮未使用过攻击时，保留1/3（向下取整）的饼至下轮轮初.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "克己" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_52_22171 克己
Gameplay meaning: visual-only / phases=round_end_check, passive_check, round_start_check.
Mechanic-specific cue: 锁定技，当你本轮未使用过攻击时，保留1/3（向下取整）的饼至下轮轮初.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_52_22171 克己
Gameplay meaning: visual-only / phases=round_end_check, passive_check, round_start_check.
Mechanic-specific cue: 锁定技，当你本轮未使用过攻击时，保留1/3（向下取整）的饼至下轮轮初.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "克己" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_52_22171 "克己".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=round_end_check, passive_check, round_start_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，当你本轮未使用过攻击时，保留1/3（向下取整）的饼至下轮轮初.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_53_62958：独裁

- 名称：独裁
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你每轮轮初+1饼
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=round_start_check, passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你每轮轮初+1饼
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_53_62958/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_53_62958 独裁
Gameplay meaning: visual-only / phases=round_start_check, passive_check.
Mechanic-specific cue: 锁定技，你每轮轮初+1饼.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "独裁" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_53_62958 独裁
Gameplay meaning: visual-only / phases=round_start_check, passive_check.
Mechanic-specific cue: 锁定技，你每轮轮初+1饼.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "独裁" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_53_62958 独裁
Gameplay meaning: visual-only / phases=round_start_check, passive_check.
Mechanic-specific cue: 锁定技，你每轮轮初+1饼.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_53_62958 独裁
Gameplay meaning: visual-only / phases=round_start_check, passive_check.
Mechanic-specific cue: 锁定技，你每轮轮初+1饼.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "独裁" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_53_62958 "独裁".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=round_start_check, passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你每轮轮初+1饼.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_54_99719：乱舞

- 名称：乱舞
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你所有以他人为目标的出招，目标变更为除你外所有人
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你所有以他人为目标的出招，目标变更为除你外所有人
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_54_99719/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_54_99719 乱舞
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你所有以他人为目标的出招，目标变更为除你外所有人.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "乱舞" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_54_99719 乱舞
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你所有以他人为目标的出招，目标变更为除你外所有人.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "乱舞" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_54_99719 乱舞
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你所有以他人为目标的出招，目标变更为除你外所有人.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_54_99719 乱舞
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你所有以他人为目标的出招，目标变更为除你外所有人.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "乱舞" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_54_99719 "乱舞".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你所有以他人为目标的出招，目标变更为除你外所有人.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_55_96047：神罩

- 名称：神罩
- 分类：limited
- 时机：变招阶段
- 描述：限定技，一局限3次，抵挡本回合受到的普通攻击
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=shield_normal / uses=3
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：限定技，一局限3次，抵挡本回合受到的普通攻击; cost 0, target none; limited 3 use(s)
- 视觉原型：透明防御波纹
- 色彩：青绿、乳白、透明灰
- 材质：透明亚克力、水波、薄油膜
- 运动：青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_55_96047/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_55_96047 神罩
Gameplay meaning: kind=effect / cost=0 / target=none / effect=shield_normal / uses=3.
Mechanic-specific cue: 限定技，一局限3次，抵挡本回合受到的普通攻击; cost 0, target none; limited 3 use(s).
Primary request: 透明防御波纹; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "神罩" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_55_96047 神罩
Gameplay meaning: kind=effect / cost=0 / target=none / effect=shield_normal / uses=3.
Mechanic-specific cue: 限定技，一局限3次，抵挡本回合受到的普通攻击; cost 0, target none; limited 3 use(s).
Primary request: 透明防御波纹; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "神罩" motif reaches the strongest readable silhouette; 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_55_96047 神罩
Gameplay meaning: kind=effect / cost=0 / target=none / effect=shield_normal / uses=3.
Mechanic-specific cue: 限定技，一局限3次，抵挡本回合受到的普通攻击; cost 0, target none; limited 3 use(s).
Primary request: 透明防御波纹; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_55_96047 神罩
Gameplay meaning: kind=effect / cost=0 / target=none / effect=shield_normal / uses=3.
Mechanic-specific cue: 限定技，一局限3次，抵挡本回合受到的普通攻击; cost 0, target none; limited 3 use(s).
Primary request: 透明防御波纹; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "神罩" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_55_96047 "神罩".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=shield_normal / uses=3. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 限定技，一局限3次，抵挡本回合受到的普通攻击; cost 0, target none; limited 3 use(s).
Visual language: teal translucent acrylic ripple shield, soft oil film, museum installation lighting; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_56_42637：鬼罩

- 名称：鬼罩
- 分类：limited
- 时机：变招阶段
- 描述：限定技，一局限3次，抵挡本回合受到的技能出招
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=shield_skill / uses=3
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：限定技，一局限3次，抵挡本回合受到的技能出招; cost 0, target none; limited 3 use(s)
- 视觉原型：透明防御波纹
- 色彩：青绿、乳白、透明灰
- 材质：透明亚克力、水波、薄油膜
- 运动：青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_56_42637/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_56_42637 鬼罩
Gameplay meaning: kind=effect / cost=0 / target=none / effect=shield_skill / uses=3.
Mechanic-specific cue: 限定技，一局限3次，抵挡本回合受到的技能出招; cost 0, target none; limited 3 use(s).
Primary request: 透明防御波纹; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "鬼罩" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_56_42637 鬼罩
Gameplay meaning: kind=effect / cost=0 / target=none / effect=shield_skill / uses=3.
Mechanic-specific cue: 限定技，一局限3次，抵挡本回合受到的技能出招; cost 0, target none; limited 3 use(s).
Primary request: 透明防御波纹; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "鬼罩" motif reaches the strongest readable silhouette; 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_56_42637 鬼罩
Gameplay meaning: kind=effect / cost=0 / target=none / effect=shield_skill / uses=3.
Mechanic-specific cue: 限定技，一局限3次，抵挡本回合受到的技能出招; cost 0, target none; limited 3 use(s).
Primary request: 透明防御波纹; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_56_42637 鬼罩
Gameplay meaning: kind=effect / cost=0 / target=none / effect=shield_skill / uses=3.
Mechanic-specific cue: 限定技，一局限3次，抵挡本回合受到的技能出招; cost 0, target none; limited 3 use(s).
Primary request: 透明防御波纹; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "鬼罩" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_56_42637 "鬼罩".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=shield_skill / uses=3. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 限定技，一局限3次，抵挡本回合受到的技能出招; cost 0, target none; limited 3 use(s).
Visual language: teal translucent acrylic ripple shield, soft oil film, museum installation lighting; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_57_59843：绝弹

- 名称：绝弹
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你的反弹可以反弹核爆、超核爆、技能攻击
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check, turn_action
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你的反弹可以反弹核爆、超核爆、技能攻击
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_57_59843/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_57_59843 绝弹
Gameplay meaning: visual-only / phases=passive_check, turn_action.
Mechanic-specific cue: 锁定技，你的反弹可以反弹核爆、超核爆、技能攻击.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "绝弹" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_57_59843 绝弹
Gameplay meaning: visual-only / phases=passive_check, turn_action.
Mechanic-specific cue: 锁定技，你的反弹可以反弹核爆、超核爆、技能攻击.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "绝弹" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_57_59843 绝弹
Gameplay meaning: visual-only / phases=passive_check, turn_action.
Mechanic-specific cue: 锁定技，你的反弹可以反弹核爆、超核爆、技能攻击.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_57_59843 绝弹
Gameplay meaning: visual-only / phases=passive_check, turn_action.
Mechanic-specific cue: 锁定技，你的反弹可以反弹核爆、超核爆、技能攻击.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "绝弹" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_57_59843 "绝弹".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check, turn_action. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你的反弹可以反弹核爆、超核爆、技能攻击.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_58_88471：散弹

- 名称：散弹
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你的反弹会将受到的攻击反弹给除你外所有人
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你的反弹会将受到的攻击反弹给除你外所有人
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_58_88471/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_58_88471 散弹
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你的反弹会将受到的攻击反弹给除你外所有人.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "散弹" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_58_88471 散弹
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你的反弹会将受到的攻击反弹给除你外所有人.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "散弹" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_58_88471 散弹
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你的反弹会将受到的攻击反弹给除你外所有人.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_58_88471 散弹
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你的反弹会将受到的攻击反弹给除你外所有人.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "散弹" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_58_88471 "散弹".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你的反弹会将受到的攻击反弹给除你外所有人.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_59_79990：火眼金睛

- 名称：火眼金睛
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你的所有非反弹防的出招破弹
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你的所有非反弹防的出招破弹
- 视觉原型：透明防御波纹
- 色彩：青绿、乳白、透明灰
- 材质：透明亚克力、水波、薄油膜
- 运动：青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_59_79990/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_59_79990 火眼金睛
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你的所有非反弹防的出招破弹.
Primary request: 透明防御波纹; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "火眼金睛" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_59_79990 火眼金睛
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你的所有非反弹防的出招破弹.
Primary request: 透明防御波纹; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "火眼金睛" motif reaches the strongest readable silhouette; 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_59_79990 火眼金睛
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你的所有非反弹防的出招破弹.
Primary request: 透明防御波纹; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_59_79990 火眼金睛
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你的所有非反弹防的出招破弹.
Primary request: 透明防御波纹; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "火眼金睛" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_59_79990 "火眼金睛".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你的所有非反弹防的出招破弹.
Visual language: teal translucent acrylic ripple shield, soft oil film, museum installation lighting; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_60_57192：烈弓

- 名称：烈弓
- 分类：control
- 时机：变招阶段
- 描述：控制技，当你的攻击和他人的目标包含你的出招相撞时，你可以让两者交错而过，不视为补刀
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=no_direct_effect
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：控制技，当你的攻击和他人的目标包含你的出招相撞时，你可以让两者交错而过，不视为补刀; cost 0, target none
- 视觉原型：石墨线控场
- 色彩：石墨黑、灰蓝、少量青绿
- 材质：细金属支架线、铅笔线稿、透明胶片
- 运动：石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_60_57192/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_60_57192 烈弓
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，当你的攻击和他人的目标包含你的出招相撞时，你可以让两者交错而过，不视为补刀; cost 0, target none.
Primary request: 石墨线控场; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "烈弓" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_60_57192 烈弓
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，当你的攻击和他人的目标包含你的出招相撞时，你可以让两者交错而过，不视为补刀; cost 0, target none.
Primary request: 石墨线控场; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "烈弓" motif reaches the strongest readable silhouette; 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_60_57192 烈弓
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，当你的攻击和他人的目标包含你的出招相撞时，你可以让两者交错而过，不视为补刀; cost 0, target none.
Primary request: 石墨线控场; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_60_57192 烈弓
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，当你的攻击和他人的目标包含你的出招相撞时，你可以让两者交错而过，不视为补刀; cost 0, target none.
Primary request: 石墨线控场; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "烈弓" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_60_57192 "烈弓".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 控制技，当你的攻击和他人的目标包含你的出招相撞时，你可以让两者交错而过，不视为补刀; cost 0, target none.
Visual language: graphite linework and thin metal rods constricting, transparent installation control effect; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_61_59049：圣

- 名称：圣
- 分类：raw
- 时机：出招
- 描述：技能出招，x饼，+2x饼
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=resource / cost=1 / target=none
- 触发表现：在资源变化确认时播放，动画要短，避免遮挡饼数。
- 机制视觉线索：技能出招，x饼，+2x饼; cost 1, target none; resource gain 2 per stack
- 视觉原型：餐桌资源沉积
- 色彩：蜂蜜黄、面包金、浅棕
- 材质：厚涂面包屑、蜂蜜状颜料、餐桌油彩
- 运动：金色颜料像食物碎屑落入盘面，聚成一枚柔软资源印记
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_61_59049/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_61_59049 圣
Gameplay meaning: kind=resource / cost=1 / target=none.
Mechanic-specific cue: 技能出招，x饼，+2x饼; cost 1, target none; resource gain 2 per stack.
Primary request: 餐桌资源沉积; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "圣" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蜂蜜黄、面包金、浅棕.
Materials/textures: 厚涂面包屑、蜂蜜状颜料、餐桌油彩.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_61_59049 圣
Gameplay meaning: kind=resource / cost=1 / target=none.
Mechanic-specific cue: 技能出招，x饼，+2x饼; cost 1, target none; resource gain 2 per stack.
Primary request: 餐桌资源沉积; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "圣" motif reaches the strongest readable silhouette; 金色颜料像食物碎屑落入盘面，聚成一枚柔软资源印记; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蜂蜜黄、面包金、浅棕.
Materials/textures: 厚涂面包屑、蜂蜜状颜料、餐桌油彩.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_61_59049 圣
Gameplay meaning: kind=resource / cost=1 / target=none.
Mechanic-specific cue: 技能出招，x饼，+2x饼; cost 1, target none; resource gain 2 per stack.
Primary request: 餐桌资源沉积; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蜂蜜黄、面包金、浅棕.
Materials/textures: 厚涂面包屑、蜂蜜状颜料、餐桌油彩.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_61_59049 圣
Gameplay meaning: kind=resource / cost=1 / target=none.
Mechanic-specific cue: 技能出招，x饼，+2x饼; cost 1, target none; resource gain 2 per stack.
Primary request: 餐桌资源沉积; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "圣" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蜂蜜黄、面包金、浅棕.
Materials/textures: 厚涂面包屑、蜂蜜状颜料、餐桌油彩.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_61_59049 "圣".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=resource / cost=1 / target=none. Trigger behavior: 在资源变化确认时播放，动画要短，避免遮挡饼数。
Mechanic-specific cue: 技能出招，x饼，+2x饼; cost 1, target none; resource gain 2 per stack.
Visual language: honey yellow oil paint crumbs settling into a shared dining plate, painterly resource gain; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 金色颜料像食物碎屑落入盘面，聚成一枚柔软资源印记.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_62_8008：齐天大圣

- 名称：齐天大圣
- 分类：raw
- 时机：出招
- 描述：技能出招，x饼，+3x饼，出圣且受到攻击伤害时，直接变为0血，已经0血时该效果不触发
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=resource / cost=1 / target=none
- 触发表现：在资源变化确认时播放，动画要短，避免遮挡饼数。
- 机制视觉线索：技能出招，x饼，+3x饼，出圣且受到攻击伤害时，直接变为0血，已经0血时该效果不触发; cost 1, target none; resource gain 3 per stack
- 视觉原型：餐桌资源沉积
- 色彩：蜂蜜黄、面包金、浅棕
- 材质：厚涂面包屑、蜂蜜状颜料、餐桌油彩
- 运动：金色颜料像食物碎屑落入盘面，聚成一枚柔软资源印记
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_62_8008/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_62_8008 齐天大圣
Gameplay meaning: kind=resource / cost=1 / target=none.
Mechanic-specific cue: 技能出招，x饼，+3x饼，出圣且受到攻击伤害时，直接变为0血，已经0血时该效果不触发; cost 1, target none; resource gain 3 per stack.
Primary request: 餐桌资源沉积; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "齐天大圣" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蜂蜜黄、面包金、浅棕.
Materials/textures: 厚涂面包屑、蜂蜜状颜料、餐桌油彩.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_62_8008 齐天大圣
Gameplay meaning: kind=resource / cost=1 / target=none.
Mechanic-specific cue: 技能出招，x饼，+3x饼，出圣且受到攻击伤害时，直接变为0血，已经0血时该效果不触发; cost 1, target none; resource gain 3 per stack.
Primary request: 餐桌资源沉积; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "齐天大圣" motif reaches the strongest readable silhouette; 金色颜料像食物碎屑落入盘面，聚成一枚柔软资源印记; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蜂蜜黄、面包金、浅棕.
Materials/textures: 厚涂面包屑、蜂蜜状颜料、餐桌油彩.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_62_8008 齐天大圣
Gameplay meaning: kind=resource / cost=1 / target=none.
Mechanic-specific cue: 技能出招，x饼，+3x饼，出圣且受到攻击伤害时，直接变为0血，已经0血时该效果不触发; cost 1, target none; resource gain 3 per stack.
Primary request: 餐桌资源沉积; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蜂蜜黄、面包金、浅棕.
Materials/textures: 厚涂面包屑、蜂蜜状颜料、餐桌油彩.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_62_8008 齐天大圣
Gameplay meaning: kind=resource / cost=1 / target=none.
Mechanic-specific cue: 技能出招，x饼，+3x饼，出圣且受到攻击伤害时，直接变为0血，已经0血时该效果不触发; cost 1, target none; resource gain 3 per stack.
Primary request: 餐桌资源沉积; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "齐天大圣" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蜂蜜黄、面包金、浅棕.
Materials/textures: 厚涂面包屑、蜂蜜状颜料、餐桌油彩.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_62_8008 "齐天大圣".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=resource / cost=1 / target=none. Trigger behavior: 在资源变化确认时播放，动画要短，避免遮挡饼数。
Mechanic-specific cue: 技能出招，x饼，+3x饼，出圣且受到攻击伤害时，直接变为0血，已经0血时该效果不触发; cost 1, target none; resource gain 3 per stack.
Visual language: honey yellow oil paint crumbs settling into a shared dining plate, painterly resource gain; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 金色颜料像食物碎屑落入盘面，聚成一枚柔软资源印记.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_63_72549：圣水收集器

- 名称：圣水收集器
- 分类：locked
- 时机：被动技能
- 描述：锁定技，第4x回合回合初+1饼
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=turn_start_check, passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，第4x回合回合初+1饼
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_63_72549/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_63_72549 圣水收集器
Gameplay meaning: visual-only / phases=turn_start_check, passive_check.
Mechanic-specific cue: 锁定技，第4x回合回合初+1饼.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "圣水收集器" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_63_72549 圣水收集器
Gameplay meaning: visual-only / phases=turn_start_check, passive_check.
Mechanic-specific cue: 锁定技，第4x回合回合初+1饼.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "圣水收集器" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_63_72549 圣水收集器
Gameplay meaning: visual-only / phases=turn_start_check, passive_check.
Mechanic-specific cue: 锁定技，第4x回合回合初+1饼.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_63_72549 圣水收集器
Gameplay meaning: visual-only / phases=turn_start_check, passive_check.
Mechanic-specific cue: 锁定技，第4x回合回合初+1饼.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "圣水收集器" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_63_72549 "圣水收集器".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=turn_start_check, passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，第4x回合回合初+1饼.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_64_60978：治愈术

- 名称：治愈术
- 分类：limited
- 时机：复活阶段
- 描述：限定技，限1次，满血复活
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=1
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：限定技，限1次，满血复活; cost 0, target none; limited 1 use(s)
- 视觉原型：石墨线控场
- 色彩：石墨黑、灰蓝、少量青绿
- 材质：细金属支架线、铅笔线稿、透明胶片
- 运动：石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_64_60978/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_64_60978 治愈术
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，限1次，满血复活; cost 0, target none; limited 1 use(s).
Primary request: 石墨线控场; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "治愈术" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_64_60978 治愈术
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，限1次，满血复活; cost 0, target none; limited 1 use(s).
Primary request: 石墨线控场; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "治愈术" motif reaches the strongest readable silhouette; 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_64_60978 治愈术
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，限1次，满血复活; cost 0, target none; limited 1 use(s).
Primary request: 石墨线控场; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_64_60978 治愈术
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，限1次，满血复活; cost 0, target none; limited 1 use(s).
Primary request: 石墨线控场; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "治愈术" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_64_60978 "治愈术".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=1. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 限定技，限1次，满血复活; cost 0, target none; limited 1 use(s).
Visual language: graphite linework and thin metal rods constricting, transparent installation control effect; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_65_71994：浴火重生

- 名称：浴火重生
- 分类：locked
- 时机：被动技能
- 描述：锁定技，当你受到致死伤害时，若该伤害为火系，或者若此时你有4饼，满血复活
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check, revival_action
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，当你受到致死伤害时，若该伤害为火系，或者若此时你有4饼，满血复活
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_65_71994/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_65_71994 浴火重生
Gameplay meaning: visual-only / phases=passive_check, revival_action.
Mechanic-specific cue: 锁定技，当你受到致死伤害时，若该伤害为火系，或者若此时你有4饼，满血复活.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "浴火重生" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_65_71994 浴火重生
Gameplay meaning: visual-only / phases=passive_check, revival_action.
Mechanic-specific cue: 锁定技，当你受到致死伤害时，若该伤害为火系，或者若此时你有4饼，满血复活.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "浴火重生" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_65_71994 浴火重生
Gameplay meaning: visual-only / phases=passive_check, revival_action.
Mechanic-specific cue: 锁定技，当你受到致死伤害时，若该伤害为火系，或者若此时你有4饼，满血复活.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_65_71994 浴火重生
Gameplay meaning: visual-only / phases=passive_check, revival_action.
Mechanic-specific cue: 锁定技，当你受到致死伤害时，若该伤害为火系，或者若此时你有4饼，满血复活.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "浴火重生" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_65_71994 "浴火重生".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check, revival_action. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，当你受到致死伤害时，若该伤害为火系，或者若此时你有4饼，满血复活.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_66_82448：天佑之魂

- 名称：天佑之魂
- 分类：limited
- 时机：随时可用，复活阶段可用
- 描述：限定技，限1次，对当前血量取绝对值后再+6，视为复活
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=abs_plus / selfHeal=6 / uses=1
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：限定技，限1次，对当前血量取绝对值后再+6，视为复活; cost 0, target none; limited 1 use(s); self heal 6
- 视觉原型：暖白治愈晕染
- 色彩：暖白、淡黄、浅粉
- 材质：柔软油彩晕染、薄纱状透明颜料
- 运动：暖白颜料从中心慢慢开花，淡黄光斑浮起，末尾融入画布
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_66_82448/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_66_82448 天佑之魂
Gameplay meaning: kind=effect / cost=0 / target=none / effect=abs_plus / selfHeal=6 / uses=1.
Mechanic-specific cue: 限定技，限1次，对当前血量取绝对值后再+6，视为复活; cost 0, target none; limited 1 use(s); self heal 6.
Primary request: 暖白治愈晕染; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "天佑之魂" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 暖白、淡黄、浅粉.
Materials/textures: 柔软油彩晕染、薄纱状透明颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_66_82448 天佑之魂
Gameplay meaning: kind=effect / cost=0 / target=none / effect=abs_plus / selfHeal=6 / uses=1.
Mechanic-specific cue: 限定技，限1次，对当前血量取绝对值后再+6，视为复活; cost 0, target none; limited 1 use(s); self heal 6.
Primary request: 暖白治愈晕染; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "天佑之魂" motif reaches the strongest readable silhouette; 暖白颜料从中心慢慢开花，淡黄光斑浮起，末尾融入画布; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 暖白、淡黄、浅粉.
Materials/textures: 柔软油彩晕染、薄纱状透明颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_66_82448 天佑之魂
Gameplay meaning: kind=effect / cost=0 / target=none / effect=abs_plus / selfHeal=6 / uses=1.
Mechanic-specific cue: 限定技，限1次，对当前血量取绝对值后再+6，视为复活; cost 0, target none; limited 1 use(s); self heal 6.
Primary request: 暖白治愈晕染; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 暖白、淡黄、浅粉.
Materials/textures: 柔软油彩晕染、薄纱状透明颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_66_82448 天佑之魂
Gameplay meaning: kind=effect / cost=0 / target=none / effect=abs_plus / selfHeal=6 / uses=1.
Mechanic-specific cue: 限定技，限1次，对当前血量取绝对值后再+6，视为复活; cost 0, target none; limited 1 use(s); self heal 6.
Primary request: 暖白治愈晕染; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "天佑之魂" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 暖白、淡黄、浅粉.
Materials/textures: 柔软油彩晕染、薄纱状透明颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_66_82448 "天佑之魂".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=abs_plus / selfHeal=6 / uses=1. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 限定技，限1次，对当前血量取绝对值后再+6，视为复活; cost 0, target none; limited 1 use(s); self heal 6.
Visual language: warm white and pale yellow oil paint bloom, gentle healing pigment spreading on canvas; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 暖白颜料从中心慢慢开花，淡黄光斑浮起，末尾融入画布.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_67_31717：沐浴圣光

- 名称：沐浴圣光
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你的初始血量×3
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=game_start_check, passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你的初始血量×3
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_67_31717/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_67_31717 沐浴圣光
Gameplay meaning: visual-only / phases=game_start_check, passive_check.
Mechanic-specific cue: 锁定技，你的初始血量×3.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "沐浴圣光" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_67_31717 沐浴圣光
Gameplay meaning: visual-only / phases=game_start_check, passive_check.
Mechanic-specific cue: 锁定技，你的初始血量×3.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "沐浴圣光" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_67_31717 沐浴圣光
Gameplay meaning: visual-only / phases=game_start_check, passive_check.
Mechanic-specific cue: 锁定技，你的初始血量×3.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_67_31717 沐浴圣光
Gameplay meaning: visual-only / phases=game_start_check, passive_check.
Mechanic-specific cue: 锁定技，你的初始血量×3.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "沐浴圣光" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_67_31717 "沐浴圣光".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=game_start_check, passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你的初始血量×3.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_68_57581：离殇

- 名称：离殇
- 分类：limited
- 时机：复活阶段
- 描述：限定技，限1次，选取对你造成致死伤害的玩家之一，若他有x血，他变为x/2（向下取整）血，你x/2（向上取整）血复活，并丢弃他一条指定的已暴露小技能
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=1
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：限定技，限1次，选取对你造成致死伤害的玩家之一，若他有x血，他变为x/2（向下取整）血，你x/2（向上取整）血复活，并丢弃他一条指定的已暴露小技能; cost 0, target single; limited 1 use(s)
- 视觉原型：石墨线控场
- 色彩：石墨黑、灰蓝、少量青绿
- 材质：细金属支架线、铅笔线稿、透明胶片
- 运动：石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_68_57581/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_68_57581 离殇
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，限1次，选取对你造成致死伤害的玩家之一，若他有x血，他变为x/2（向下取整）血，你x/2（向上取整）血复活，并丢弃他一条指定的已暴露小技能; cost 0, target single; limited 1 use(s).
Primary request: 石墨线控场; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "离殇" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_68_57581 离殇
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，限1次，选取对你造成致死伤害的玩家之一，若他有x血，他变为x/2（向下取整）血，你x/2（向上取整）血复活，并丢弃他一条指定的已暴露小技能; cost 0, target single; limited 1 use(s).
Primary request: 石墨线控场; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "离殇" motif reaches the strongest readable silhouette; 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_68_57581 离殇
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，限1次，选取对你造成致死伤害的玩家之一，若他有x血，他变为x/2（向下取整）血，你x/2（向上取整）血复活，并丢弃他一条指定的已暴露小技能; cost 0, target single; limited 1 use(s).
Primary request: 石墨线控场; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_68_57581 离殇
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，限1次，选取对你造成致死伤害的玩家之一，若他有x血，他变为x/2（向下取整）血，你x/2（向上取整）血复活，并丢弃他一条指定的已暴露小技能; cost 0, target single; limited 1 use(s).
Primary request: 石墨线控场; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "离殇" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_68_57581 "离殇".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=1. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 限定技，限1次，选取对你造成致死伤害的玩家之一，若他有x血，他变为x/2（向下取整）血，你x/2（向上取整）血复活，并丢弃他一条指定的已暴露小技能; cost 0, target single; limited 1 use(s).
Visual language: graphite linework and thin metal rods constricting, transparent installation control effect; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_69_22138：绝对值

- 名称：绝对值
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你的血量变为负数时，立即取绝对值，视为复活。你的血量变为0时，你死亡
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check, revival_action
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你的血量变为负数时，立即取绝对值，视为复活。你的血量变为0时，你死亡
- 视觉原型：墨色虚空裂隙
- 色彩：蓝黑、紫灰、象牙白
- 材质：稀释油墨、刮擦裂纹、半透明烟状颜料
- 运动：蓝黑墨痕在画布上裂开，吸入周围颜料后迅速闭合
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_69_22138/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_69_22138 绝对值
Gameplay meaning: visual-only / phases=passive_check, revival_action.
Mechanic-specific cue: 锁定技，你的血量变为负数时，立即取绝对值，视为复活。你的血量变为0时，你死亡.
Primary request: 墨色虚空裂隙; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "绝对值" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_69_22138 绝对值
Gameplay meaning: visual-only / phases=passive_check, revival_action.
Mechanic-specific cue: 锁定技，你的血量变为负数时，立即取绝对值，视为复活。你的血量变为0时，你死亡.
Primary request: 墨色虚空裂隙; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "绝对值" motif reaches the strongest readable silhouette; 蓝黑墨痕在画布上裂开，吸入周围颜料后迅速闭合; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_69_22138 绝对值
Gameplay meaning: visual-only / phases=passive_check, revival_action.
Mechanic-specific cue: 锁定技，你的血量变为负数时，立即取绝对值，视为复活。你的血量变为0时，你死亡.
Primary request: 墨色虚空裂隙; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_69_22138 绝对值
Gameplay meaning: visual-only / phases=passive_check, revival_action.
Mechanic-specific cue: 锁定技，你的血量变为负数时，立即取绝对值，视为复活。你的血量变为0时，你死亡.
Primary request: 墨色虚空裂隙; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "绝对值" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_69_22138 "绝对值".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check, revival_action. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你的血量变为负数时，立即取绝对值，视为复活。你的血量变为0时，你死亡.
Visual language: blue black diluted oil ink fissure, violet gray smoke pigment, canvas scratch texture; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 蓝黑墨痕在画布上裂开，吸入周围颜料后迅速闭合.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_70_79685：死神之镰

- 名称：死神之镰
- 分类：locked
- 时机：被动技能
- 描述：锁定技，当场上除你外玩家死亡时，每个伤害为x的致死伤害使你+x/2（向下取整）血
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check, revival_action
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，当场上除你外玩家死亡时，每个伤害为x的致死伤害使你+x/2（向下取整）血
- 视觉原型：墨色虚空裂隙
- 色彩：蓝黑、紫灰、象牙白
- 材质：稀释油墨、刮擦裂纹、半透明烟状颜料
- 运动：蓝黑墨痕在画布上裂开，吸入周围颜料后迅速闭合
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_70_79685/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_70_79685 死神之镰
Gameplay meaning: visual-only / phases=passive_check, revival_action.
Mechanic-specific cue: 锁定技，当场上除你外玩家死亡时，每个伤害为x的致死伤害使你+x/2（向下取整）血.
Primary request: 墨色虚空裂隙; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "死神之镰" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_70_79685 死神之镰
Gameplay meaning: visual-only / phases=passive_check, revival_action.
Mechanic-specific cue: 锁定技，当场上除你外玩家死亡时，每个伤害为x的致死伤害使你+x/2（向下取整）血.
Primary request: 墨色虚空裂隙; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "死神之镰" motif reaches the strongest readable silhouette; 蓝黑墨痕在画布上裂开，吸入周围颜料后迅速闭合; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_70_79685 死神之镰
Gameplay meaning: visual-only / phases=passive_check, revival_action.
Mechanic-specific cue: 锁定技，当场上除你外玩家死亡时，每个伤害为x的致死伤害使你+x/2（向下取整）血.
Primary request: 墨色虚空裂隙; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_70_79685 死神之镰
Gameplay meaning: visual-only / phases=passive_check, revival_action.
Mechanic-specific cue: 锁定技，当场上除你外玩家死亡时，每个伤害为x的致死伤害使你+x/2（向下取整）血.
Primary request: 墨色虚空裂隙; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "死神之镰" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_70_79685 "死神之镰".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check, revival_action. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，当场上除你外玩家死亡时，每个伤害为x的致死伤害使你+x/2（向下取整）血.
Visual language: blue black diluted oil ink fissure, violet gray smoke pigment, canvas scratch texture; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 蓝黑墨痕在画布上裂开，吸入周围颜料后迅速闭合.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_71_40087：圣域

- 名称：圣域
- 分类：locked
- 时机：被动技能
- 描述：锁定技，第3x轮轮末，你+3血
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=round_end_check, passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，第3x轮轮末，你+3血
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_71_40087/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_71_40087 圣域
Gameplay meaning: visual-only / phases=round_end_check, passive_check.
Mechanic-specific cue: 锁定技，第3x轮轮末，你+3血.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "圣域" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_71_40087 圣域
Gameplay meaning: visual-only / phases=round_end_check, passive_check.
Mechanic-specific cue: 锁定技，第3x轮轮末，你+3血.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "圣域" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_71_40087 圣域
Gameplay meaning: visual-only / phases=round_end_check, passive_check.
Mechanic-specific cue: 锁定技，第3x轮轮末，你+3血.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_71_40087 圣域
Gameplay meaning: visual-only / phases=round_end_check, passive_check.
Mechanic-specific cue: 锁定技，第3x轮轮末，你+3血.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "圣域" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_71_40087 "圣域".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=round_end_check, passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，第3x轮轮末，你+3血.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_72_53933：邪域

- 名称：邪域
- 分类：locked
- 时机：被动技能
- 描述：锁定技，第3x轮轮末，你选取1名玩家，吸取他1血
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=single / effect=no_direct_effect
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：锁定技，第3x轮轮末，你选取1名玩家，吸取他1血; cost 0, target single
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_72_53933/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_72_53933 邪域
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect.
Mechanic-specific cue: 锁定技，第3x轮轮末，你选取1名玩家，吸取他1血; cost 0, target single.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "邪域" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_72_53933 邪域
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect.
Mechanic-specific cue: 锁定技，第3x轮轮末，你选取1名玩家，吸取他1血; cost 0, target single.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "邪域" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_72_53933 邪域
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect.
Mechanic-specific cue: 锁定技，第3x轮轮末，你选取1名玩家，吸取他1血; cost 0, target single.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_72_53933 邪域
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect.
Mechanic-specific cue: 锁定技，第3x轮轮末，你选取1名玩家，吸取他1血; cost 0, target single.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "邪域" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_72_53933 "邪域".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 锁定技，第3x轮轮末，你选取1名玩家，吸取他1血; cost 0, target single.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_73_76567：十字守护

- 名称：十字守护
- 分类：control
- 时机：被动技能；印记使用：变伤阶段
- 描述：控制技，当你受到攻击伤害时，获得1层“护佑”印记与1层“十字”印记；回合中，当你受到攻击伤害时，你可消耗1层“护佑”印记，使受到伤害÷2（下取整）；回合中，当与你相邻的玩家受到攻击伤害时，你可消耗1层“十字”印记，使其受到伤害×2
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=no_direct_effect
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：控制技，当你受到攻击伤害时，获得1层“护佑”印记与1层“十字”印记；回合中，当你受到攻击伤害时，你可消耗1层“护佑”印记，使受到伤害÷2（下取整）；回合中，当与你相邻的玩家受到攻击伤害时，你可消耗1层“十字”印记，使其受到伤害×2; cost 0, target none
- 视觉原型：石墨线控场
- 色彩：石墨黑、灰蓝、少量青绿
- 材质：细金属支架线、铅笔线稿、透明胶片
- 运动：石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_73_76567/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_73_76567 十字守护
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，当你受到攻击伤害时，获得1层“护佑”印记与1层“十字”印记；回合中，当你受到攻击伤害时，你可消耗1层“护佑”印记，使受到伤害÷2（下取整）；回合中，当与你相邻的玩家受到攻击伤害时，你可消耗1层“十字”印记，使其受到伤害×2; cost 0, target none.
Primary request: 石墨线控场; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "十字守护" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_73_76567 十字守护
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，当你受到攻击伤害时，获得1层“护佑”印记与1层“十字”印记；回合中，当你受到攻击伤害时，你可消耗1层“护佑”印记，使受到伤害÷2（下取整）；回合中，当与你相邻的玩家受到攻击伤害时，你可消耗1层“十字”印记，使其受到伤害×2; cost 0, target none.
Primary request: 石墨线控场; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "十字守护" motif reaches the strongest readable silhouette; 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_73_76567 十字守护
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，当你受到攻击伤害时，获得1层“护佑”印记与1层“十字”印记；回合中，当你受到攻击伤害时，你可消耗1层“护佑”印记，使受到伤害÷2（下取整）；回合中，当与你相邻的玩家受到攻击伤害时，你可消耗1层“十字”印记，使其受到伤害×2; cost 0, target none.
Primary request: 石墨线控场; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_73_76567 十字守护
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，当你受到攻击伤害时，获得1层“护佑”印记与1层“十字”印记；回合中，当你受到攻击伤害时，你可消耗1层“护佑”印记，使受到伤害÷2（下取整）；回合中，当与你相邻的玩家受到攻击伤害时，你可消耗1层“十字”印记，使其受到伤害×2; cost 0, target none.
Primary request: 石墨线控场; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "十字守护" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_73_76567 "十字守护".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 控制技，当你受到攻击伤害时，获得1层“护佑”印记与1层“十字”印记；回合中，当你受到攻击伤害时，你可消耗1层“护佑”印记，使受到伤害÷2（下取整）；回合中，当与你相邻的玩家受到攻击伤害时，你可消耗1层“十字”印记，使其受到伤害×2; cost 0, target none.
Visual language: graphite linework and thin metal rods constricting, transparent installation control effect; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_74_34920：绝对守护

- 名称：绝对守护
- 分类：control
- 时机：变招阶段
- 描述：控制技，对场上耗饼为x的非群体攻击，你可消耗x/2（向上取整）饼使其变为群体攻击；对场上耗饼为x的群体攻击，你可消耗x/2（向上取整）饼使其变为对你一人的单体攻击
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=no_direct_effect
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：控制技，对场上耗饼为x的非群体攻击，你可消耗x/2（向上取整）饼使其变为群体攻击；对场上耗饼为x的群体攻击，你可消耗x/2（向上取整）饼使其变为对你一人的单体攻击; cost 0, target none
- 视觉原型：石墨线控场
- 色彩：石墨黑、灰蓝、少量青绿
- 材质：细金属支架线、铅笔线稿、透明胶片
- 运动：石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_74_34920/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_74_34920 绝对守护
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，对场上耗饼为x的非群体攻击，你可消耗x/2（向上取整）饼使其变为群体攻击；对场上耗饼为x的群体攻击，你可消耗x/2（向上取整）饼使其变为对你一人的单体攻击; cost 0, target none.
Primary request: 石墨线控场; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "绝对守护" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_74_34920 绝对守护
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，对场上耗饼为x的非群体攻击，你可消耗x/2（向上取整）饼使其变为群体攻击；对场上耗饼为x的群体攻击，你可消耗x/2（向上取整）饼使其变为对你一人的单体攻击; cost 0, target none.
Primary request: 石墨线控场; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "绝对守护" motif reaches the strongest readable silhouette; 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_74_34920 绝对守护
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，对场上耗饼为x的非群体攻击，你可消耗x/2（向上取整）饼使其变为群体攻击；对场上耗饼为x的群体攻击，你可消耗x/2（向上取整）饼使其变为对你一人的单体攻击; cost 0, target none.
Primary request: 石墨线控场; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_74_34920 绝对守护
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，对场上耗饼为x的非群体攻击，你可消耗x/2（向上取整）饼使其变为群体攻击；对场上耗饼为x的群体攻击，你可消耗x/2（向上取整）饼使其变为对你一人的单体攻击; cost 0, target none.
Primary request: 石墨线控场; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "绝对守护" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_74_34920 "绝对守护".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 控制技，对场上耗饼为x的非群体攻击，你可消耗x/2（向上取整）饼使其变为群体攻击；对场上耗饼为x的群体攻击，你可消耗x/2（向上取整）饼使其变为对你一人的单体攻击; cost 0, target none.
Visual language: graphite linework and thin metal rods constricting, transparent installation control effect; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_75_68329：圣灵之境

- 名称：圣灵之境
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你免疫属性伤害和效果（冰、火、电、毒等）
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你免疫属性伤害和效果（冰、火、电、毒等）
- 视觉原型：透明防御波纹
- 色彩：青绿、乳白、透明灰
- 材质：透明亚克力、水波、薄油膜
- 运动：青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_75_68329/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_75_68329 圣灵之境
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你免疫属性伤害和效果（冰、火、电、毒等）.
Primary request: 透明防御波纹; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "圣灵之境" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_75_68329 圣灵之境
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你免疫属性伤害和效果（冰、火、电、毒等）.
Primary request: 透明防御波纹; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "圣灵之境" motif reaches the strongest readable silhouette; 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_75_68329 圣灵之境
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你免疫属性伤害和效果（冰、火、电、毒等）.
Primary request: 透明防御波纹; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_75_68329 圣灵之境
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你免疫属性伤害和效果（冰、火、电、毒等）.
Primary request: 透明防御波纹; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "圣灵之境" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_75_68329 "圣灵之境".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你免疫属性伤害和效果（冰、火、电、毒等）.
Visual language: teal translucent acrylic ripple shield, soft oil film, museum installation lighting; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_76_76044：帝炎之境

- 名称：帝炎之境
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你受伤时，使所有对你造成伤害的玩家受到1点火系伤害
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check, turn_damage_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你受伤时，使所有对你造成伤害的玩家受到1点火系伤害
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_76_76044/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_76_76044 帝炎之境
Gameplay meaning: visual-only / phases=passive_check, turn_damage_check.
Mechanic-specific cue: 锁定技，你受伤时，使所有对你造成伤害的玩家受到1点火系伤害.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "帝炎之境" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_76_76044 帝炎之境
Gameplay meaning: visual-only / phases=passive_check, turn_damage_check.
Mechanic-specific cue: 锁定技，你受伤时，使所有对你造成伤害的玩家受到1点火系伤害.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "帝炎之境" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_76_76044 帝炎之境
Gameplay meaning: visual-only / phases=passive_check, turn_damage_check.
Mechanic-specific cue: 锁定技，你受伤时，使所有对你造成伤害的玩家受到1点火系伤害.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_76_76044 帝炎之境
Gameplay meaning: visual-only / phases=passive_check, turn_damage_check.
Mechanic-specific cue: 锁定技，你受伤时，使所有对你造成伤害的玩家受到1点火系伤害.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "帝炎之境" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_76_76044 "帝炎之境".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check, turn_damage_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你受伤时，使所有对你造成伤害的玩家受到1点火系伤害.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_77_30612：森林的低吟

- 名称：森林的低吟
- 分类：raw
- 时机：出招
- 描述：技能出招，3饼，此回合无敌，+3血
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=3 / target=none / effect=invulnerable_turn / selfHeal=3
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：技能出招，3饼，此回合无敌，+3血; cost 3, target none; self heal 3
- 视觉原型：暖白治愈晕染
- 色彩：暖白、淡黄、浅粉
- 材质：柔软油彩晕染、薄纱状透明颜料
- 运动：暖白颜料从中心慢慢开花，淡黄光斑浮起，末尾融入画布
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_77_30612/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_77_30612 森林的低吟
Gameplay meaning: kind=effect / cost=3 / target=none / effect=invulnerable_turn / selfHeal=3.
Mechanic-specific cue: 技能出招，3饼，此回合无敌，+3血; cost 3, target none; self heal 3.
Primary request: 暖白治愈晕染; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "森林的低吟" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 暖白、淡黄、浅粉.
Materials/textures: 柔软油彩晕染、薄纱状透明颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_77_30612 森林的低吟
Gameplay meaning: kind=effect / cost=3 / target=none / effect=invulnerable_turn / selfHeal=3.
Mechanic-specific cue: 技能出招，3饼，此回合无敌，+3血; cost 3, target none; self heal 3.
Primary request: 暖白治愈晕染; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "森林的低吟" motif reaches the strongest readable silhouette; 暖白颜料从中心慢慢开花，淡黄光斑浮起，末尾融入画布; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 暖白、淡黄、浅粉.
Materials/textures: 柔软油彩晕染、薄纱状透明颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_77_30612 森林的低吟
Gameplay meaning: kind=effect / cost=3 / target=none / effect=invulnerable_turn / selfHeal=3.
Mechanic-specific cue: 技能出招，3饼，此回合无敌，+3血; cost 3, target none; self heal 3.
Primary request: 暖白治愈晕染; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 暖白、淡黄、浅粉.
Materials/textures: 柔软油彩晕染、薄纱状透明颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_77_30612 森林的低吟
Gameplay meaning: kind=effect / cost=3 / target=none / effect=invulnerable_turn / selfHeal=3.
Mechanic-specific cue: 技能出招，3饼，此回合无敌，+3血; cost 3, target none; self heal 3.
Primary request: 暖白治愈晕染; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "森林的低吟" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 暖白、淡黄、浅粉.
Materials/textures: 柔软油彩晕染、薄纱状透明颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_77_30612 "森林的低吟".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=3 / target=none / effect=invulnerable_turn / selfHeal=3. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 技能出招，3饼，此回合无敌，+3血; cost 3, target none; self heal 3.
Visual language: warm white and pale yellow oil paint bloom, gentle healing pigment spreading on canvas; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 暖白颜料从中心慢慢开花，淡黄光斑浮起，末尾融入画布.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_78_18866：火球

- 名称：火球
- 分类：attack
- 时机：出招
- 描述：技能攻击，2饼，攻4，2级，油条防，火系，若未防住对目标相邻玩家溅射1点火系伤害，若相邻玩家出招为石头则不受该伤害，你不受来自自己的溅射伤害
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=attack / cost=2 / target=single / element=fire / power=4 / level=2
- 触发表现：在出招、目标确认、命中结算三段中播放。
- 机制视觉线索：技能攻击，2饼，攻4，2级，油条防，火系，若未防住对目标相邻玩家溅射1点火系伤害，若相邻玩家出招为石头则不受该伤害，你不受来自自己的溅射伤害; cost 2, target single; power 4; level 2; defense youtiao
- 视觉原型：火焰油彩攻击
- 色彩：镉红、朱砂橙、少量焦黑
- 材质：厚涂油彩、热蜡裂纹、透明亚克力反光
- 运动：红橙颜料从起点压缩后冲出，命中时溅成放射状油彩颗粒，末尾留下热色拖痕
- 当前资产：已有 keyframe-01.png、keyframe-02.png、keyframe-03.png、keyframe-04.png、poster.png；缺少 effect.webm、effect.mp4
- 资产目录：`apps/client/public/assets/effects/skill_78_18866/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_78_18866 火球
Gameplay meaning: kind=attack / cost=2 / target=single / element=fire / power=4 / level=2.
Mechanic-specific cue: 技能攻击，2饼，攻4，2级，油条防，火系，若未防住对目标相邻玩家溅射1点火系伤害，若相邻玩家出招为石头则不受该伤害，你不受来自自己的溅射伤害; cost 2, target single; power 4; level 2; defense youtiao.
Primary request: 火焰油彩攻击; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "火球" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity medium-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 镉红、朱砂橙、少量焦黑.
Materials/textures: 厚涂油彩、热蜡裂纹、透明亚克力反光.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_78_18866 火球
Gameplay meaning: kind=attack / cost=2 / target=single / element=fire / power=4 / level=2.
Mechanic-specific cue: 技能攻击，2饼，攻4，2级，油条防，火系，若未防住对目标相邻玩家溅射1点火系伤害，若相邻玩家出招为石头则不受该伤害，你不受来自自己的溅射伤害; cost 2, target single; power 4; level 2; defense youtiao.
Primary request: 火焰油彩攻击; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "火球" motif reaches the strongest readable silhouette; 红橙颜料从起点压缩后冲出，命中时溅成放射状油彩颗粒，末尾留下热色拖痕; emphasize medium-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 镉红、朱砂橙、少量焦黑.
Materials/textures: 厚涂油彩、热蜡裂纹、透明亚克力反光.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_78_18866 火球
Gameplay meaning: kind=attack / cost=2 / target=single / element=fire / power=4 / level=2.
Mechanic-specific cue: 技能攻击，2饼，攻4，2级，油条防，火系，若未防住对目标相邻玩家溅射1点火系伤害，若相邻玩家出招为石头则不受该伤害，你不受来自自己的溅射伤害; cost 2, target single; power 4; level 2; defense youtiao.
Primary request: 火焰油彩攻击; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 镉红、朱砂橙、少量焦黑.
Materials/textures: 厚涂油彩、热蜡裂纹、透明亚克力反光.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_78_18866 火球
Gameplay meaning: kind=attack / cost=2 / target=single / element=fire / power=4 / level=2.
Mechanic-specific cue: 技能攻击，2饼，攻4，2级，油条防，火系，若未防住对目标相邻玩家溅射1点火系伤害，若相邻玩家出招为石头则不受该伤害，你不受来自自己的溅射伤害; cost 2, target single; power 4; level 2; defense youtiao.
Primary request: 火焰油彩攻击; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "火球" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 镉红、朱砂橙、少量焦黑.
Materials/textures: 厚涂油彩、热蜡裂纹、透明亚克力反光.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_78_18866 "火球".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=attack / cost=2 / target=single / element=fire / power=4 / level=2. Trigger behavior: 在出招、目标确认、命中结算三段中播放。
Mechanic-specific cue: 技能攻击，2饼，攻4，2级，油条防，火系，若未防住对目标相邻玩家溅射1点火系伤害，若相邻玩家出招为石头则不受该伤害，你不受来自自己的溅射伤害; cost 2, target single; power 4; level 2; defense youtiao.
Visual language: fiery cadmium red and orange oil paint splash, painterly impasto, warm transparent acrylic reflections; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 红橙颜料从起点压缩后冲出，命中时溅成放射状油彩颗粒，末尾留下热色拖痕.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_79_36319：火箭

- 名称：火箭
- 分类：limited
- 时机：出招
- 描述：限定技，一局限1次，技能攻击，攻6，6级，石头防，破弹，火系，可选取连续的1到2名玩家作为目标
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=attack / cost=0 / target=single / element=fire / power=6 / level=6 / uses=1
- 触发表现：在出招、目标确认、命中结算三段中播放。
- 机制视觉线索：限定技，一局限1次，技能攻击，攻6，6级，石头防，破弹，火系，可选取连续的1到2名玩家作为目标; cost 0, target single; power 6; level 6; defense stone; limited 1 use(s)
- 视觉原型：火焰油彩攻击
- 色彩：镉红、朱砂橙、少量焦黑
- 材质：厚涂油彩、热蜡裂纹、透明亚克力反光
- 运动：红橙颜料从起点压缩后冲出，命中时溅成放射状油彩颗粒，末尾留下热色拖痕
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_79_36319/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_79_36319 火箭
Gameplay meaning: kind=attack / cost=0 / target=single / element=fire / power=6 / level=6 / uses=1.
Mechanic-specific cue: 限定技，一局限1次，技能攻击，攻6，6级，石头防，破弹，火系，可选取连续的1到2名玩家作为目标; cost 0, target single; power 6; level 6; defense stone; limited 1 use(s).
Primary request: 火焰油彩攻击; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "火箭" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity high-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 镉红、朱砂橙、少量焦黑.
Materials/textures: 厚涂油彩、热蜡裂纹、透明亚克力反光.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_79_36319 火箭
Gameplay meaning: kind=attack / cost=0 / target=single / element=fire / power=6 / level=6 / uses=1.
Mechanic-specific cue: 限定技，一局限1次，技能攻击，攻6，6级，石头防，破弹，火系，可选取连续的1到2名玩家作为目标; cost 0, target single; power 6; level 6; defense stone; limited 1 use(s).
Primary request: 火焰油彩攻击; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "火箭" motif reaches the strongest readable silhouette; 红橙颜料从起点压缩后冲出，命中时溅成放射状油彩颗粒，末尾留下热色拖痕; emphasize high-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 镉红、朱砂橙、少量焦黑.
Materials/textures: 厚涂油彩、热蜡裂纹、透明亚克力反光.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_79_36319 火箭
Gameplay meaning: kind=attack / cost=0 / target=single / element=fire / power=6 / level=6 / uses=1.
Mechanic-specific cue: 限定技，一局限1次，技能攻击，攻6，6级，石头防，破弹，火系，可选取连续的1到2名玩家作为目标; cost 0, target single; power 6; level 6; defense stone; limited 1 use(s).
Primary request: 火焰油彩攻击; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 镉红、朱砂橙、少量焦黑.
Materials/textures: 厚涂油彩、热蜡裂纹、透明亚克力反光.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_79_36319 火箭
Gameplay meaning: kind=attack / cost=0 / target=single / element=fire / power=6 / level=6 / uses=1.
Mechanic-specific cue: 限定技，一局限1次，技能攻击，攻6，6级，石头防，破弹，火系，可选取连续的1到2名玩家作为目标; cost 0, target single; power 6; level 6; defense stone; limited 1 use(s).
Primary request: 火焰油彩攻击; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "火箭" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 镉红、朱砂橙、少量焦黑.
Materials/textures: 厚涂油彩、热蜡裂纹、透明亚克力反光.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_79_36319 "火箭".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=attack / cost=0 / target=single / element=fire / power=6 / level=6 / uses=1. Trigger behavior: 在出招、目标确认、命中结算三段中播放。
Mechanic-specific cue: 限定技，一局限1次，技能攻击，攻6，6级，石头防，破弹，火系，可选取连续的1到2名玩家作为目标; cost 0, target single; power 6; level 6; defense stone; limited 1 use(s).
Visual language: fiery cadmium red and orange oil paint splash, painterly impasto, warm transparent acrylic reflections; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 红橙颜料从起点压缩后冲出，命中时溅成放射状油彩颗粒，末尾留下热色拖痕.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_80_20445：核反应堆

- 名称：核反应堆
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你的核爆和超核爆消耗饼数-3
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你的核爆和超核爆消耗饼数-3
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_80_20445/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_80_20445 核反应堆
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你的核爆和超核爆消耗饼数-3.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "核反应堆" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_80_20445 核反应堆
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你的核爆和超核爆消耗饼数-3.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "核反应堆" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_80_20445 核反应堆
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你的核爆和超核爆消耗饼数-3.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_80_20445 核反应堆
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你的核爆和超核爆消耗饼数-3.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "核反应堆" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_80_20445 "核反应堆".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你的核爆和超核爆消耗饼数-3.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_81_59663：撸

- 名称：撸
- 分类：attack
- 时机：出招
- 描述：技能攻击，1饼，攻1，1级，小防防
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=attack / cost=1 / target=single / element=physical / power=1 / level=1
- 触发表现：在出招、目标确认、命中结算三段中播放。
- 机制视觉线索：技能攻击，1饼，攻1，1级，小防防; cost 1, target single; power 1; level 1; defense small
- 视觉原型：红色油彩冲击
- 色彩：深红、赭石、少量黑色
- 材质：厚涂红色油彩、刮刀痕、画布颗粒
- 运动：红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_81_59663/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_81_59663 撸
Gameplay meaning: kind=attack / cost=1 / target=single / element=physical / power=1 / level=1.
Mechanic-specific cue: 技能攻击，1饼，攻1，1级，小防防; cost 1, target single; power 1; level 1; defense small.
Primary request: 红色油彩冲击; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "撸" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_81_59663 撸
Gameplay meaning: kind=attack / cost=1 / target=single / element=physical / power=1 / level=1.
Mechanic-specific cue: 技能攻击，1饼，攻1，1级，小防防; cost 1, target single; power 1; level 1; defense small.
Primary request: 红色油彩冲击; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "撸" motif reaches the strongest readable silhouette; 红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_81_59663 撸
Gameplay meaning: kind=attack / cost=1 / target=single / element=physical / power=1 / level=1.
Mechanic-specific cue: 技能攻击，1饼，攻1，1级，小防防; cost 1, target single; power 1; level 1; defense small.
Primary request: 红色油彩冲击; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_81_59663 撸
Gameplay meaning: kind=attack / cost=1 / target=single / element=physical / power=1 / level=1.
Mechanic-specific cue: 技能攻击，1饼，攻1，1级，小防防; cost 1, target single; power 1; level 1; defense small.
Primary request: 红色油彩冲击; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "撸" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_81_59663 "撸".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=attack / cost=1 / target=single / element=physical / power=1 / level=1. Trigger behavior: 在出招、目标确认、命中结算三段中播放。
Mechanic-specific cue: 技能攻击，1饼，攻1，1级，小防防; cost 1, target single; power 1; level 1; defense small.
Visual language: deep red oil paint impact splash, palette knife texture, canvas grain, shared dining installation; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_82_45540：日

- 名称：日
- 分类：attack
- 时机：出招
- 描述：技能攻击，1饼，攻1，2级，油条防
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=attack / cost=1 / target=single / element=physical / power=1 / level=2
- 触发表现：在出招、目标确认、命中结算三段中播放。
- 机制视觉线索：技能攻击，1饼，攻1，2级，油条防; cost 1, target single; power 1; level 2; defense youtiao
- 视觉原型：红色油彩冲击
- 色彩：深红、赭石、少量黑色
- 材质：厚涂红色油彩、刮刀痕、画布颗粒
- 运动：红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_82_45540/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_82_45540 日
Gameplay meaning: kind=attack / cost=1 / target=single / element=physical / power=1 / level=2.
Mechanic-specific cue: 技能攻击，1饼，攻1，2级，油条防; cost 1, target single; power 1; level 2; defense youtiao.
Primary request: 红色油彩冲击; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "日" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_82_45540 日
Gameplay meaning: kind=attack / cost=1 / target=single / element=physical / power=1 / level=2.
Mechanic-specific cue: 技能攻击，1饼，攻1，2级，油条防; cost 1, target single; power 1; level 2; defense youtiao.
Primary request: 红色油彩冲击; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "日" motif reaches the strongest readable silhouette; 红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_82_45540 日
Gameplay meaning: kind=attack / cost=1 / target=single / element=physical / power=1 / level=2.
Mechanic-specific cue: 技能攻击，1饼，攻1，2级，油条防; cost 1, target single; power 1; level 2; defense youtiao.
Primary request: 红色油彩冲击; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_82_45540 日
Gameplay meaning: kind=attack / cost=1 / target=single / element=physical / power=1 / level=2.
Mechanic-specific cue: 技能攻击，1饼，攻1，2级，油条防; cost 1, target single; power 1; level 2; defense youtiao.
Primary request: 红色油彩冲击; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "日" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_82_45540 "日".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=attack / cost=1 / target=single / element=physical / power=1 / level=2. Trigger behavior: 在出招、目标确认、命中结算三段中播放。
Mechanic-specific cue: 技能攻击，1饼，攻1，2级，油条防; cost 1, target single; power 1; level 2; defense youtiao.
Visual language: deep red oil paint impact splash, palette knife texture, canvas grain, shared dining installation; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_83_32356：丁

- 名称：丁
- 分类：attack
- 时机：出招
- 描述：技能攻击，1饼，攻1，饼防，与攻击对撞则完全抵消，与抠对撞则你被退游
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=attack / cost=1 / target=single / element=physical / power=1 / level=1
- 触发表现：在出招、目标确认、命中结算三段中播放。
- 机制视觉线索：技能攻击，1饼，攻1，饼防，与攻击对撞则完全抵消，与抠对撞则你被退游; cost 1, target single; power 1; level 1; defense cake
- 视觉原型：红色油彩冲击
- 色彩：深红、赭石、少量黑色
- 材质：厚涂红色油彩、刮刀痕、画布颗粒
- 运动：红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_83_32356/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_83_32356 丁
Gameplay meaning: kind=attack / cost=1 / target=single / element=physical / power=1 / level=1.
Mechanic-specific cue: 技能攻击，1饼，攻1，饼防，与攻击对撞则完全抵消，与抠对撞则你被退游; cost 1, target single; power 1; level 1; defense cake.
Primary request: 红色油彩冲击; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "丁" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_83_32356 丁
Gameplay meaning: kind=attack / cost=1 / target=single / element=physical / power=1 / level=1.
Mechanic-specific cue: 技能攻击，1饼，攻1，饼防，与攻击对撞则完全抵消，与抠对撞则你被退游; cost 1, target single; power 1; level 1; defense cake.
Primary request: 红色油彩冲击; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "丁" motif reaches the strongest readable silhouette; 红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_83_32356 丁
Gameplay meaning: kind=attack / cost=1 / target=single / element=physical / power=1 / level=1.
Mechanic-specific cue: 技能攻击，1饼，攻1，饼防，与攻击对撞则完全抵消，与抠对撞则你被退游; cost 1, target single; power 1; level 1; defense cake.
Primary request: 红色油彩冲击; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_83_32356 丁
Gameplay meaning: kind=attack / cost=1 / target=single / element=physical / power=1 / level=1.
Mechanic-specific cue: 技能攻击，1饼，攻1，饼防，与攻击对撞则完全抵消，与抠对撞则你被退游; cost 1, target single; power 1; level 1; defense cake.
Primary request: 红色油彩冲击; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "丁" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_83_32356 "丁".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=attack / cost=1 / target=single / element=physical / power=1 / level=1. Trigger behavior: 在出招、目标确认、命中结算三段中播放。
Mechanic-specific cue: 技能攻击，1饼，攻1，饼防，与攻击对撞则完全抵消，与抠对撞则你被退游; cost 1, target single; power 1; level 1; defense cake.
Visual language: deep red oil paint impact splash, palette knife texture, canvas grain, shared dining installation; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_84_6114：抠

- 名称：抠
- 分类：attack
- 时机：出招
- 描述：技能攻击：2饼，攻1，3级，石头防，若目标出招为反弹，且反弹对象包含你，则你受到3点伤害，若与丁对撞，则使目标退游
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=attack / cost=2 / target=single / element=physical / power=1 / level=3
- 触发表现：在出招、目标确认、命中结算三段中播放。
- 机制视觉线索：技能攻击：2饼，攻1，3级，石头防，若目标出招为反弹，且反弹对象包含你，则你受到3点伤害，若与丁对撞，则使目标退游; cost 2, target single; power 1; level 3; defense stone
- 视觉原型：红色油彩冲击
- 色彩：深红、赭石、少量黑色
- 材质：厚涂红色油彩、刮刀痕、画布颗粒
- 运动：红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_84_6114/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_84_6114 抠
Gameplay meaning: kind=attack / cost=2 / target=single / element=physical / power=1 / level=3.
Mechanic-specific cue: 技能攻击：2饼，攻1，3级，石头防，若目标出招为反弹，且反弹对象包含你，则你受到3点伤害，若与丁对撞，则使目标退游; cost 2, target single; power 1; level 3; defense stone.
Primary request: 红色油彩冲击; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "抠" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity medium-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_84_6114 抠
Gameplay meaning: kind=attack / cost=2 / target=single / element=physical / power=1 / level=3.
Mechanic-specific cue: 技能攻击：2饼，攻1，3级，石头防，若目标出招为反弹，且反弹对象包含你，则你受到3点伤害，若与丁对撞，则使目标退游; cost 2, target single; power 1; level 3; defense stone.
Primary request: 红色油彩冲击; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "抠" motif reaches the strongest readable silhouette; 红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射; emphasize medium-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_84_6114 抠
Gameplay meaning: kind=attack / cost=2 / target=single / element=physical / power=1 / level=3.
Mechanic-specific cue: 技能攻击：2饼，攻1，3级，石头防，若目标出招为反弹，且反弹对象包含你，则你受到3点伤害，若与丁对撞，则使目标退游; cost 2, target single; power 1; level 3; defense stone.
Primary request: 红色油彩冲击; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_84_6114 抠
Gameplay meaning: kind=attack / cost=2 / target=single / element=physical / power=1 / level=3.
Mechanic-specific cue: 技能攻击：2饼，攻1，3级，石头防，若目标出招为反弹，且反弹对象包含你，则你受到3点伤害，若与丁对撞，则使目标退游; cost 2, target single; power 1; level 3; defense stone.
Primary request: 红色油彩冲击; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "抠" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_84_6114 "抠".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=attack / cost=2 / target=single / element=physical / power=1 / level=3. Trigger behavior: 在出招、目标确认、命中结算三段中播放。
Mechanic-specific cue: 技能攻击：2饼，攻1，3级，石头防，若目标出招为反弹，且反弹对象包含你，则你受到3点伤害，若与丁对撞，则使目标退游; cost 2, target single; power 1; level 3; defense stone.
Visual language: deep red oil paint impact splash, palette knife texture, canvas grain, shared dining installation; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_85_26345：钟

- 名称：钟
- 分类：attack
- 时机：出招
- 描述：技能攻击，1饼，攻1，2级，小防防，命中则获得1个对目标的“金钟罩”护盾，对同一名玩家的“金钟罩”最多持有1个；你受到来自他人的攻击时，若你未防住，且你有对他的“金钟罩”，则消耗这个金钟罩，抵挡这次攻击
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=attack / cost=1 / target=single / effect=zhong_shield / element=physical / power=1 / level=2
- 触发表现：在出招、目标确认、命中结算三段中播放。
- 机制视觉线索：技能攻击，1饼，攻1，2级，小防防，命中则获得1个对目标的“金钟罩”护盾，对同一名玩家的“金钟罩”最多持有1个；你受到来自他人的攻击时，若你未防住，且你有对他的“金钟罩”，则消耗这个金钟罩，抵挡这次攻击; cost 1, target single; power 1; level 2; defense small
- 视觉原型：红色油彩冲击
- 色彩：深红、赭石、少量黑色
- 材质：厚涂红色油彩、刮刀痕、画布颗粒
- 运动：红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_85_26345/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_85_26345 钟
Gameplay meaning: kind=attack / cost=1 / target=single / effect=zhong_shield / element=physical / power=1 / level=2.
Mechanic-specific cue: 技能攻击，1饼，攻1，2级，小防防，命中则获得1个对目标的“金钟罩”护盾，对同一名玩家的“金钟罩”最多持有1个；你受到来自他人的攻击时，若你未防住，且你有对他的“金钟罩”，则消耗这个金钟罩，抵挡这次攻击; cost 1, target single; power 1; level 2; defense small.
Primary request: 红色油彩冲击; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "钟" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_85_26345 钟
Gameplay meaning: kind=attack / cost=1 / target=single / effect=zhong_shield / element=physical / power=1 / level=2.
Mechanic-specific cue: 技能攻击，1饼，攻1，2级，小防防，命中则获得1个对目标的“金钟罩”护盾，对同一名玩家的“金钟罩”最多持有1个；你受到来自他人的攻击时，若你未防住，且你有对他的“金钟罩”，则消耗这个金钟罩，抵挡这次攻击; cost 1, target single; power 1; level 2; defense small.
Primary request: 红色油彩冲击; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "钟" motif reaches the strongest readable silhouette; 红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_85_26345 钟
Gameplay meaning: kind=attack / cost=1 / target=single / effect=zhong_shield / element=physical / power=1 / level=2.
Mechanic-specific cue: 技能攻击，1饼，攻1，2级，小防防，命中则获得1个对目标的“金钟罩”护盾，对同一名玩家的“金钟罩”最多持有1个；你受到来自他人的攻击时，若你未防住，且你有对他的“金钟罩”，则消耗这个金钟罩，抵挡这次攻击; cost 1, target single; power 1; level 2; defense small.
Primary request: 红色油彩冲击; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_85_26345 钟
Gameplay meaning: kind=attack / cost=1 / target=single / effect=zhong_shield / element=physical / power=1 / level=2.
Mechanic-specific cue: 技能攻击，1饼，攻1，2级，小防防，命中则获得1个对目标的“金钟罩”护盾，对同一名玩家的“金钟罩”最多持有1个；你受到来自他人的攻击时，若你未防住，且你有对他的“金钟罩”，则消耗这个金钟罩，抵挡这次攻击; cost 1, target single; power 1; level 2; defense small.
Primary request: 红色油彩冲击; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "钟" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_85_26345 "钟".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=attack / cost=1 / target=single / effect=zhong_shield / element=physical / power=1 / level=2. Trigger behavior: 在出招、目标确认、命中结算三段中播放。
Mechanic-specific cue: 技能攻击，1饼，攻1，2级，小防防，命中则获得1个对目标的“金钟罩”护盾，对同一名玩家的“金钟罩”最多持有1个；你受到来自他人的攻击时，若你未防住，且你有对他的“金钟罩”，则消耗这个金钟罩，抵挡这次攻击; cost 1, target single; power 1; level 2; defense small.
Visual language: deep red oil paint impact splash, palette knife texture, canvas grain, shared dining installation; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_86_14131：梵

- 名称：梵
- 分类：attack
- 时机：出招
- 描述：技能攻击，2饼，攻1，2级，石头防，破弹
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=attack / cost=2 / target=single / element=physical / power=1 / level=2
- 触发表现：在出招、目标确认、命中结算三段中播放。
- 机制视觉线索：技能攻击，2饼，攻1，2级，石头防，破弹; cost 2, target single; power 1; level 2; defense stone
- 视觉原型：红色油彩冲击
- 色彩：深红、赭石、少量黑色
- 材质：厚涂红色油彩、刮刀痕、画布颗粒
- 运动：红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_86_14131/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_86_14131 梵
Gameplay meaning: kind=attack / cost=2 / target=single / element=physical / power=1 / level=2.
Mechanic-specific cue: 技能攻击，2饼，攻1，2级，石头防，破弹; cost 2, target single; power 1; level 2; defense stone.
Primary request: 红色油彩冲击; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "梵" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_86_14131 梵
Gameplay meaning: kind=attack / cost=2 / target=single / element=physical / power=1 / level=2.
Mechanic-specific cue: 技能攻击，2饼，攻1，2级，石头防，破弹; cost 2, target single; power 1; level 2; defense stone.
Primary request: 红色油彩冲击; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "梵" motif reaches the strongest readable silhouette; 红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_86_14131 梵
Gameplay meaning: kind=attack / cost=2 / target=single / element=physical / power=1 / level=2.
Mechanic-specific cue: 技能攻击，2饼，攻1，2级，石头防，破弹; cost 2, target single; power 1; level 2; defense stone.
Primary request: 红色油彩冲击; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_86_14131 梵
Gameplay meaning: kind=attack / cost=2 / target=single / element=physical / power=1 / level=2.
Mechanic-specific cue: 技能攻击，2饼，攻1，2级，石头防，破弹; cost 2, target single; power 1; level 2; defense stone.
Primary request: 红色油彩冲击; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "梵" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_86_14131 "梵".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=attack / cost=2 / target=single / element=physical / power=1 / level=2. Trigger behavior: 在出招、目标确认、命中结算三段中播放。
Mechanic-specific cue: 技能攻击，2饼，攻1，2级，石头防，破弹; cost 2, target single; power 1; level 2; defense stone.
Visual language: deep red oil paint impact splash, palette knife texture, canvas grain, shared dining installation; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_87_44771：连爆

- 名称：连爆
- 分类：attack
- 时机：出招
- 描述：技能攻击，2饼，攻1，2级，油条防，命中则获得1次免费“连爆”
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=attack / cost=2 / target=single / effect=lian_bao_free / element=physical / power=1 / level=2
- 触发表现：在出招、目标确认、命中结算三段中播放。
- 机制视觉线索：技能攻击，2饼，攻1，2级，油条防，命中则获得1次免费“连爆”; cost 2, target single; power 1; level 2; defense youtiao
- 视觉原型：红色油彩冲击
- 色彩：深红、赭石、少量黑色
- 材质：厚涂红色油彩、刮刀痕、画布颗粒
- 运动：红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_87_44771/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_87_44771 连爆
Gameplay meaning: kind=attack / cost=2 / target=single / effect=lian_bao_free / element=physical / power=1 / level=2.
Mechanic-specific cue: 技能攻击，2饼，攻1，2级，油条防，命中则获得1次免费“连爆”; cost 2, target single; power 1; level 2; defense youtiao.
Primary request: 红色油彩冲击; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "连爆" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_87_44771 连爆
Gameplay meaning: kind=attack / cost=2 / target=single / effect=lian_bao_free / element=physical / power=1 / level=2.
Mechanic-specific cue: 技能攻击，2饼，攻1，2级，油条防，命中则获得1次免费“连爆”; cost 2, target single; power 1; level 2; defense youtiao.
Primary request: 红色油彩冲击; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "连爆" motif reaches the strongest readable silhouette; 红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_87_44771 连爆
Gameplay meaning: kind=attack / cost=2 / target=single / effect=lian_bao_free / element=physical / power=1 / level=2.
Mechanic-specific cue: 技能攻击，2饼，攻1，2级，油条防，命中则获得1次免费“连爆”; cost 2, target single; power 1; level 2; defense youtiao.
Primary request: 红色油彩冲击; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_87_44771 连爆
Gameplay meaning: kind=attack / cost=2 / target=single / effect=lian_bao_free / element=physical / power=1 / level=2.
Mechanic-specific cue: 技能攻击，2饼，攻1，2级，油条防，命中则获得1次免费“连爆”; cost 2, target single; power 1; level 2; defense youtiao.
Primary request: 红色油彩冲击; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "连爆" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_87_44771 "连爆".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=attack / cost=2 / target=single / effect=lian_bao_free / element=physical / power=1 / level=2. Trigger behavior: 在出招、目标确认、命中结算三段中播放。
Mechanic-specific cue: 技能攻击，2饼，攻1，2级，油条防，命中则获得1次免费“连爆”; cost 2, target single; power 1; level 2; defense youtiao.
Visual language: deep red oil paint impact splash, palette knife texture, canvas grain, shared dining installation; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_88_62906：换防

- 名称：换防
- 分类：control
- 时机：变招阶段
- 描述：控制技，若你的出招为小防，你可以消耗1饼，切换为油条；若你的出招为油条，你可以消耗1饼，切换为小防；
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=1 / target=none / effect=no_direct_effect
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：控制技，若你的出招为小防，你可以消耗1饼，切换为油条；若你的出招为油条，你可以消耗1饼，切换为小防；; cost 1, target none
- 视觉原型：透明防御波纹
- 色彩：青绿、乳白、透明灰
- 材质：透明亚克力、水波、薄油膜
- 运动：青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_88_62906/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_88_62906 换防
Gameplay meaning: kind=effect / cost=1 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，若你的出招为小防，你可以消耗1饼，切换为油条；若你的出招为油条，你可以消耗1饼，切换为小防；; cost 1, target none.
Primary request: 透明防御波纹; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "换防" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_88_62906 换防
Gameplay meaning: kind=effect / cost=1 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，若你的出招为小防，你可以消耗1饼，切换为油条；若你的出招为油条，你可以消耗1饼，切换为小防；; cost 1, target none.
Primary request: 透明防御波纹; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "换防" motif reaches the strongest readable silhouette; 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_88_62906 换防
Gameplay meaning: kind=effect / cost=1 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，若你的出招为小防，你可以消耗1饼，切换为油条；若你的出招为油条，你可以消耗1饼，切换为小防；; cost 1, target none.
Primary request: 透明防御波纹; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_88_62906 换防
Gameplay meaning: kind=effect / cost=1 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，若你的出招为小防，你可以消耗1饼，切换为油条；若你的出招为油条，你可以消耗1饼，切换为小防；; cost 1, target none.
Primary request: 透明防御波纹; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "换防" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_88_62906 "换防".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=1 / target=none / effect=no_direct_effect. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 控制技，若你的出招为小防，你可以消耗1饼，切换为油条；若你的出招为油条，你可以消耗1饼，切换为小防；; cost 1, target none.
Visual language: teal translucent acrylic ripple shield, soft oil film, museum installation lighting; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_89_99375：幻防

- 名称：幻防
- 分类：control
- 时机：变招阶段
- 描述：幻防：控制技，若你的出招为小防，你可以消耗2饼，切换为油条；或者消耗3饼，切换为石头；若你的出招为油条，你可以消耗2饼，切换为小防或石头；若你的出招为石头，你可以消耗2饼，切换为油条；或者消耗3饼，切换为小防
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=2 / target=none / effect=no_direct_effect
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：幻防：控制技，若你的出招为小防，你可以消耗2饼，切换为油条；或者消耗3饼，切换为石头；若你的出招为油条，你可以消耗2饼，切换为小防或石头；若你的出招为石头，你可以消耗2饼，切换为油条；或者消耗3饼，切换为小防; cost 2, target none
- 视觉原型：透明防御波纹
- 色彩：青绿、乳白、透明灰
- 材质：透明亚克力、水波、薄油膜
- 运动：青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_89_99375/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_89_99375 幻防
Gameplay meaning: kind=effect / cost=2 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 幻防：控制技，若你的出招为小防，你可以消耗2饼，切换为油条；或者消耗3饼，切换为石头；若你的出招为油条，你可以消耗2饼，切换为小防或石头；若你的出招为石头，你可以消耗2饼，切换为油条；或者消耗3饼，切换为小防; cost 2, target none.
Primary request: 透明防御波纹; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "幻防" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_89_99375 幻防
Gameplay meaning: kind=effect / cost=2 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 幻防：控制技，若你的出招为小防，你可以消耗2饼，切换为油条；或者消耗3饼，切换为石头；若你的出招为油条，你可以消耗2饼，切换为小防或石头；若你的出招为石头，你可以消耗2饼，切换为油条；或者消耗3饼，切换为小防; cost 2, target none.
Primary request: 透明防御波纹; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "幻防" motif reaches the strongest readable silhouette; 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_89_99375 幻防
Gameplay meaning: kind=effect / cost=2 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 幻防：控制技，若你的出招为小防，你可以消耗2饼，切换为油条；或者消耗3饼，切换为石头；若你的出招为油条，你可以消耗2饼，切换为小防或石头；若你的出招为石头，你可以消耗2饼，切换为油条；或者消耗3饼，切换为小防; cost 2, target none.
Primary request: 透明防御波纹; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_89_99375 幻防
Gameplay meaning: kind=effect / cost=2 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 幻防：控制技，若你的出招为小防，你可以消耗2饼，切换为油条；或者消耗3饼，切换为石头；若你的出招为油条，你可以消耗2饼，切换为小防或石头；若你的出招为石头，你可以消耗2饼，切换为油条；或者消耗3饼，切换为小防; cost 2, target none.
Primary request: 透明防御波纹; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "幻防" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_89_99375 "幻防".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=2 / target=none / effect=no_direct_effect. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 幻防：控制技，若你的出招为小防，你可以消耗2饼，切换为油条；或者消耗3饼，切换为石头；若你的出招为油条，你可以消耗2饼，切换为小防或石头；若你的出招为石头，你可以消耗2饼，切换为油条；或者消耗3饼，切换为小防; cost 2, target none.
Visual language: teal translucent acrylic ripple shield, soft oil film, museum installation lighting; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_90_32911：杀换

- 名称：杀换
- 分类：control
- 时机：变招阶段
- 描述：控制技，若你的出招为x杀，你可以消耗1饼，将其变换为x擒；若你的出招为x擒，你可以消耗1饼，将其变换为x杀
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=1 / target=none / effect=no_direct_effect
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：控制技，若你的出招为x杀，你可以消耗1饼，将其变换为x擒；若你的出招为x擒，你可以消耗1饼，将其变换为x杀; cost 1, target none
- 视觉原型：石墨线控场
- 色彩：石墨黑、灰蓝、少量青绿
- 材质：细金属支架线、铅笔线稿、透明胶片
- 运动：石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_90_32911/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_90_32911 杀换
Gameplay meaning: kind=effect / cost=1 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，若你的出招为x杀，你可以消耗1饼，将其变换为x擒；若你的出招为x擒，你可以消耗1饼，将其变换为x杀; cost 1, target none.
Primary request: 石墨线控场; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "杀换" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_90_32911 杀换
Gameplay meaning: kind=effect / cost=1 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，若你的出招为x杀，你可以消耗1饼，将其变换为x擒；若你的出招为x擒，你可以消耗1饼，将其变换为x杀; cost 1, target none.
Primary request: 石墨线控场; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "杀换" motif reaches the strongest readable silhouette; 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_90_32911 杀换
Gameplay meaning: kind=effect / cost=1 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，若你的出招为x杀，你可以消耗1饼，将其变换为x擒；若你的出招为x擒，你可以消耗1饼，将其变换为x杀; cost 1, target none.
Primary request: 石墨线控场; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_90_32911 杀换
Gameplay meaning: kind=effect / cost=1 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，若你的出招为x杀，你可以消耗1饼，将其变换为x擒；若你的出招为x擒，你可以消耗1饼，将其变换为x杀; cost 1, target none.
Primary request: 石墨线控场; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "杀换" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_90_32911 "杀换".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=1 / target=none / effect=no_direct_effect. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 控制技，若你的出招为x杀，你可以消耗1饼，将其变换为x擒；若你的出招为x擒，你可以消耗1饼，将其变换为x杀; cost 1, target none.
Visual language: graphite linework and thin metal rods constricting, transparent installation control effect; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_91_89631：级换

- 名称：级换
- 分类：control
- 时机：变招阶段
- 描述：控制技，变招阶段，你可以将你的出招的攻击和等级交换
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=no_direct_effect
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：控制技，变招阶段，你可以将你的出招的攻击和等级交换; cost 0, target none
- 视觉原型：石墨线控场
- 色彩：石墨黑、灰蓝、少量青绿
- 材质：细金属支架线、铅笔线稿、透明胶片
- 运动：石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_91_89631/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_91_89631 级换
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，变招阶段，你可以将你的出招的攻击和等级交换; cost 0, target none.
Primary request: 石墨线控场; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "级换" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_91_89631 级换
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，变招阶段，你可以将你的出招的攻击和等级交换; cost 0, target none.
Primary request: 石墨线控场; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "级换" motif reaches the strongest readable silhouette; 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_91_89631 级换
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，变招阶段，你可以将你的出招的攻击和等级交换; cost 0, target none.
Primary request: 石墨线控场; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_91_89631 级换
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect.
Mechanic-specific cue: 控制技，变招阶段，你可以将你的出招的攻击和等级交换; cost 0, target none.
Primary request: 石墨线控场; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "级换" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_91_89631 "级换".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 控制技，变招阶段，你可以将你的出招的攻击和等级交换; cost 0, target none.
Visual language: graphite linework and thin metal rods constricting, transparent installation control effect; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_92_26484：文明人

- 名称：文明人
- 分类：locked
- 时机：被动技能
- 描述：锁定技，场上有人说脏话时，你+1血，不重开，不声明
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，场上有人说脏话时，你+1血，不重开，不声明
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_92_26484/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_92_26484 文明人
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，场上有人说脏话时，你+1血，不重开，不声明.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "文明人" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_92_26484 文明人
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，场上有人说脏话时，你+1血，不重开，不声明.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "文明人" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_92_26484 文明人
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，场上有人说脏话时，你+1血，不重开，不声明.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_92_26484 文明人
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，场上有人说脏话时，你+1血，不重开，不声明.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "文明人" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_92_26484 "文明人".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，场上有人说脏话时，你+1血，不重开，不声明.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_93_50224：逆转

- 名称：逆转
- 分类：limited
- 时机：变招阶段
- 描述：限定技，一局限1次，逆转所有出招的发出者和目标；可使用3个逆转将自己从退游状态逆转为进游，可使用5个逆转将1人的非常规胜利逆转为失败
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=reverse_actions / uses=1
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：限定技，一局限1次，逆转所有出招的发出者和目标；可使用3个逆转将自己从退游状态逆转为进游，可使用5个逆转将1人的非常规胜利逆转为失败; cost 0, target none; limited 1 use(s)
- 视觉原型：石墨线控场
- 色彩：石墨黑、灰蓝、少量青绿
- 材质：细金属支架线、铅笔线稿、透明胶片
- 运动：石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_93_50224/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_93_50224 逆转
Gameplay meaning: kind=effect / cost=0 / target=none / effect=reverse_actions / uses=1.
Mechanic-specific cue: 限定技，一局限1次，逆转所有出招的发出者和目标；可使用3个逆转将自己从退游状态逆转为进游，可使用5个逆转将1人的非常规胜利逆转为失败; cost 0, target none; limited 1 use(s).
Primary request: 石墨线控场; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "逆转" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_93_50224 逆转
Gameplay meaning: kind=effect / cost=0 / target=none / effect=reverse_actions / uses=1.
Mechanic-specific cue: 限定技，一局限1次，逆转所有出招的发出者和目标；可使用3个逆转将自己从退游状态逆转为进游，可使用5个逆转将1人的非常规胜利逆转为失败; cost 0, target none; limited 1 use(s).
Primary request: 石墨线控场; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "逆转" motif reaches the strongest readable silhouette; 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_93_50224 逆转
Gameplay meaning: kind=effect / cost=0 / target=none / effect=reverse_actions / uses=1.
Mechanic-specific cue: 限定技，一局限1次，逆转所有出招的发出者和目标；可使用3个逆转将自己从退游状态逆转为进游，可使用5个逆转将1人的非常规胜利逆转为失败; cost 0, target none; limited 1 use(s).
Primary request: 石墨线控场; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_93_50224 逆转
Gameplay meaning: kind=effect / cost=0 / target=none / effect=reverse_actions / uses=1.
Mechanic-specific cue: 限定技，一局限1次，逆转所有出招的发出者和目标；可使用3个逆转将自己从退游状态逆转为进游，可使用5个逆转将1人的非常规胜利逆转为失败; cost 0, target none; limited 1 use(s).
Primary request: 石墨线控场; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "逆转" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_93_50224 "逆转".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=reverse_actions / uses=1. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 限定技，一局限1次，逆转所有出招的发出者和目标；可使用3个逆转将自己从退游状态逆转为进游，可使用5个逆转将1人的非常规胜利逆转为失败; cost 0, target none; limited 1 use(s).
Visual language: graphite linework and thin metal rods constricting, transparent installation control effect; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_94_627：斗转星移

- 名称：斗转星移
- 分类：limited
- 时机：变伤阶段
- 描述：限定技，一局限2次，变伤阶段，选取你即将承受的1个不超过3的伤害，将其转移给选定玩家；可转移攻击伤害与法术伤害
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=2
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：限定技，一局限2次，变伤阶段，选取你即将承受的1个不超过3的伤害，将其转移给选定玩家；可转移攻击伤害与法术伤害; cost 0, target single; limited 2 use(s)
- 视觉原型：石墨线控场
- 色彩：石墨黑、灰蓝、少量青绿
- 材质：细金属支架线、铅笔线稿、透明胶片
- 运动：石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_94_627/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_94_627 斗转星移
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=2.
Mechanic-specific cue: 限定技，一局限2次，变伤阶段，选取你即将承受的1个不超过3的伤害，将其转移给选定玩家；可转移攻击伤害与法术伤害; cost 0, target single; limited 2 use(s).
Primary request: 石墨线控场; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "斗转星移" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_94_627 斗转星移
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=2.
Mechanic-specific cue: 限定技，一局限2次，变伤阶段，选取你即将承受的1个不超过3的伤害，将其转移给选定玩家；可转移攻击伤害与法术伤害; cost 0, target single; limited 2 use(s).
Primary request: 石墨线控场; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "斗转星移" motif reaches the strongest readable silhouette; 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_94_627 斗转星移
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=2.
Mechanic-specific cue: 限定技，一局限2次，变伤阶段，选取你即将承受的1个不超过3的伤害，将其转移给选定玩家；可转移攻击伤害与法术伤害; cost 0, target single; limited 2 use(s).
Primary request: 石墨线控场; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_94_627 斗转星移
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=2.
Mechanic-specific cue: 限定技，一局限2次，变伤阶段，选取你即将承受的1个不超过3的伤害，将其转移给选定玩家；可转移攻击伤害与法术伤害; cost 0, target single; limited 2 use(s).
Primary request: 石墨线控场; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "斗转星移" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_94_627 "斗转星移".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=2. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 限定技，一局限2次，变伤阶段，选取你即将承受的1个不超过3的伤害，将其转移给选定玩家；可转移攻击伤害与法术伤害; cost 0, target single; limited 2 use(s).
Visual language: graphite linework and thin metal rods constricting, transparent installation control effect; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_95_91337：卷子

- 名称：卷子
- 分类：attack
- 时机：出招
- 描述：限定技，一局限1次，技能攻击，攻退游，等同，任意防，破弹
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=attack / cost=0 / target=single / element=physical / power=100000 / level=100000 / uses=1
- 触发表现：在出招、目标确认、命中结算三段中播放。
- 机制视觉线索：限定技，一局限1次，技能攻击，攻退游，等同，任意防，破弹; cost 0, target single; power 100000; level 100000; defense any; limited 1 use(s)
- 视觉原型：红色油彩冲击
- 色彩：深红、赭石、少量黑色
- 材质：厚涂红色油彩、刮刀痕、画布颗粒
- 运动：红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_95_91337/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_95_91337 卷子
Gameplay meaning: kind=attack / cost=0 / target=single / element=physical / power=100000 / level=100000 / uses=1.
Mechanic-specific cue: 限定技，一局限1次，技能攻击，攻退游，等同，任意防，破弹; cost 0, target single; power 100000; level 100000; defense any; limited 1 use(s).
Primary request: 红色油彩冲击; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "卷子" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity high-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_95_91337 卷子
Gameplay meaning: kind=attack / cost=0 / target=single / element=physical / power=100000 / level=100000 / uses=1.
Mechanic-specific cue: 限定技，一局限1次，技能攻击，攻退游，等同，任意防，破弹; cost 0, target single; power 100000; level 100000; defense any; limited 1 use(s).
Primary request: 红色油彩冲击; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "卷子" motif reaches the strongest readable silhouette; 红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射; emphasize high-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_95_91337 卷子
Gameplay meaning: kind=attack / cost=0 / target=single / element=physical / power=100000 / level=100000 / uses=1.
Mechanic-specific cue: 限定技，一局限1次，技能攻击，攻退游，等同，任意防，破弹; cost 0, target single; power 100000; level 100000; defense any; limited 1 use(s).
Primary request: 红色油彩冲击; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_95_91337 卷子
Gameplay meaning: kind=attack / cost=0 / target=single / element=physical / power=100000 / level=100000 / uses=1.
Mechanic-specific cue: 限定技，一局限1次，技能攻击，攻退游，等同，任意防，破弹; cost 0, target single; power 100000; level 100000; defense any; limited 1 use(s).
Primary request: 红色油彩冲击; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "卷子" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 深红、赭石、少量黑色.
Materials/textures: 厚涂红色油彩、刮刀痕、画布颗粒.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_95_91337 "卷子".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=attack / cost=0 / target=single / element=physical / power=100000 / level=100000 / uses=1. Trigger behavior: 在出招、目标确认、命中结算三段中播放。
Mechanic-specific cue: 限定技，一局限1次，技能攻击，攻退游，等同，任意防，破弹; cost 0, target single; power 100000; level 100000; defense any; limited 1 use(s).
Visual language: deep red oil paint impact splash, palette knife texture, canvas grain, shared dining installation; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 红色颜料团向目标甩出，命中时像餐盘上的颜料被拍散，留下椭圆溅射.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_96_33279：暴风雪

- 名称：暴风雪
- 分类：attack
- 时机：出招
- 描述：技能攻击，2饼，攻2+2，2级，油条防，冰系
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=attack / cost=2 / target=single / effect=blizzard_double_hit / element=ice / power=2 / level=2
- 触发表现：在出招、目标确认、命中结算三段中播放。
- 机制视觉线索：技能攻击，2饼，攻2+2，2级，油条防，冰系; cost 2, target single; power 2; level 2; defense youtiao
- 视觉原型：冰霜蛋彩攻击
- 色彩：雾蓝、灰白、淡青
- 材质：冷色蛋彩、薄涂刮痕、冰晶状颜料边缘
- 运动：淡蓝颜料凝成细线后快速刺出，命中时扩成霜花状薄涂纹理，末尾轻微碎裂
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_96_33279/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_96_33279 暴风雪
Gameplay meaning: kind=attack / cost=2 / target=single / effect=blizzard_double_hit / element=ice / power=2 / level=2.
Mechanic-specific cue: 技能攻击，2饼，攻2+2，2级，油条防，冰系; cost 2, target single; power 2; level 2; defense youtiao.
Primary request: 冰霜蛋彩攻击; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "暴风雪" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity medium-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 雾蓝、灰白、淡青.
Materials/textures: 冷色蛋彩、薄涂刮痕、冰晶状颜料边缘.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_96_33279 暴风雪
Gameplay meaning: kind=attack / cost=2 / target=single / effect=blizzard_double_hit / element=ice / power=2 / level=2.
Mechanic-specific cue: 技能攻击，2饼，攻2+2，2级，油条防，冰系; cost 2, target single; power 2; level 2; defense youtiao.
Primary request: 冰霜蛋彩攻击; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "暴风雪" motif reaches the strongest readable silhouette; 淡蓝颜料凝成细线后快速刺出，命中时扩成霜花状薄涂纹理，末尾轻微碎裂; emphasize medium-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 雾蓝、灰白、淡青.
Materials/textures: 冷色蛋彩、薄涂刮痕、冰晶状颜料边缘.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_96_33279 暴风雪
Gameplay meaning: kind=attack / cost=2 / target=single / effect=blizzard_double_hit / element=ice / power=2 / level=2.
Mechanic-specific cue: 技能攻击，2饼，攻2+2，2级，油条防，冰系; cost 2, target single; power 2; level 2; defense youtiao.
Primary request: 冰霜蛋彩攻击; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 雾蓝、灰白、淡青.
Materials/textures: 冷色蛋彩、薄涂刮痕、冰晶状颜料边缘.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_96_33279 暴风雪
Gameplay meaning: kind=attack / cost=2 / target=single / effect=blizzard_double_hit / element=ice / power=2 / level=2.
Mechanic-specific cue: 技能攻击，2饼，攻2+2，2级，油条防，冰系; cost 2, target single; power 2; level 2; defense youtiao.
Primary request: 冰霜蛋彩攻击; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "暴风雪" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 雾蓝、灰白、淡青.
Materials/textures: 冷色蛋彩、薄涂刮痕、冰晶状颜料边缘.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_96_33279 "暴风雪".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=attack / cost=2 / target=single / effect=blizzard_double_hit / element=ice / power=2 / level=2. Trigger behavior: 在出招、目标确认、命中结算三段中播放。
Mechanic-specific cue: 技能攻击，2饼，攻2+2，2级，油条防，冰系; cost 2, target single; power 2; level 2; defense youtiao.
Visual language: pale blue ice-tempera paint streak, frost flower burst, delicate cold pigment scratches; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 淡蓝颜料凝成细线后快速刺出，命中时扩成霜花状薄涂纹理，末尾轻微碎裂.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_97_60773：狂风骤雪

- 名称：狂风骤雪
- 分类：limited
- 时机：出招
- 描述：限定技，一局限2次，技能攻击，群攻2，2级，油条防，冰系
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=attack / cost=0 / target=all / element=ice / power=2 / level=2 / uses=2
- 触发表现：在出招、目标确认、命中结算三段中播放。
- 机制视觉线索：限定技，一局限2次，技能攻击，群攻2，2级，油条防，冰系; cost 0, target all; power 2; level 2; defense youtiao; limited 2 use(s)
- 视觉原型：冰霜蛋彩攻击
- 色彩：雾蓝、灰白、淡青
- 材质：冷色蛋彩、薄涂刮痕、冰晶状颜料边缘
- 运动：淡蓝颜料凝成细线后快速刺出，命中时扩成霜花状薄涂纹理，末尾轻微碎裂
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_97_60773/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_97_60773 狂风骤雪
Gameplay meaning: kind=attack / cost=0 / target=all / element=ice / power=2 / level=2 / uses=2.
Mechanic-specific cue: 限定技，一局限2次，技能攻击，群攻2，2级，油条防，冰系; cost 0, target all; power 2; level 2; defense youtiao; limited 2 use(s).
Primary request: 冰霜蛋彩攻击; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "狂风骤雪" motif first appears as a small oil-paint emblem; radial table-wide spread with several separated landing stains; keep intensity medium-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 雾蓝、灰白、淡青.
Materials/textures: 冷色蛋彩、薄涂刮痕、冰晶状颜料边缘.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_97_60773 狂风骤雪
Gameplay meaning: kind=attack / cost=0 / target=all / element=ice / power=2 / level=2 / uses=2.
Mechanic-specific cue: 限定技，一局限2次，技能攻击，群攻2，2级，油条防，冰系; cost 0, target all; power 2; level 2; defense youtiao; limited 2 use(s).
Primary request: 冰霜蛋彩攻击; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "狂风骤雪" motif reaches the strongest readable silhouette; 淡蓝颜料凝成细线后快速刺出，命中时扩成霜花状薄涂纹理，末尾轻微碎裂; emphasize medium-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 雾蓝、灰白、淡青.
Materials/textures: 冷色蛋彩、薄涂刮痕、冰晶状颜料边缘.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_97_60773 狂风骤雪
Gameplay meaning: kind=attack / cost=0 / target=all / element=ice / power=2 / level=2 / uses=2.
Mechanic-specific cue: 限定技，一局限2次，技能攻击，群攻2，2级，油条防，冰系; cost 0, target all; power 2; level 2; defense youtiao; limited 2 use(s).
Primary request: 冰霜蛋彩攻击; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through radial table-wide spread with several separated landing stains; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 雾蓝、灰白、淡青.
Materials/textures: 冷色蛋彩、薄涂刮痕、冰晶状颜料边缘.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_97_60773 狂风骤雪
Gameplay meaning: kind=attack / cost=0 / target=all / element=ice / power=2 / level=2 / uses=2.
Mechanic-specific cue: 限定技，一局限2次，技能攻击，群攻2，2级，油条防，冰系; cost 0, target all; power 2; level 2; defense youtiao; limited 2 use(s).
Primary request: 冰霜蛋彩攻击; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "狂风骤雪" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 雾蓝、灰白、淡青.
Materials/textures: 冷色蛋彩、薄涂刮痕、冰晶状颜料边缘.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_97_60773 "狂风骤雪".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=attack / cost=0 / target=all / element=ice / power=2 / level=2 / uses=2. Trigger behavior: 在出招、目标确认、命中结算三段中播放。
Mechanic-specific cue: 限定技，一局限2次，技能攻击，群攻2，2级，油条防，冰系; cost 0, target all; power 2; level 2; defense youtiao; limited 2 use(s).
Visual language: pale blue ice-tempera paint streak, frost flower burst, delicate cold pigment scratches; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 淡蓝颜料凝成细线后快速刺出，命中时扩成霜花状薄涂纹理，末尾轻微碎裂.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_98_7182：普天同庆

- 名称：普天同庆
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你所有攻击变为群体攻击，但目标不包含距你最远的1或2人（3人及以下无效）；你的擒消耗1/2个饼
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你所有攻击变为群体攻击，但目标不包含距你最远的1或2人（3人及以下无效）；你的擒消耗1/2个饼
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_98_7182/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_98_7182 普天同庆
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你所有攻击变为群体攻击，但目标不包含距你最远的1或2人（3人及以下无效）；你的擒消耗1/2个饼.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "普天同庆" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_98_7182 普天同庆
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你所有攻击变为群体攻击，但目标不包含距你最远的1或2人（3人及以下无效）；你的擒消耗1/2个饼.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "普天同庆" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_98_7182 普天同庆
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你所有攻击变为群体攻击，但目标不包含距你最远的1或2人（3人及以下无效）；你的擒消耗1/2个饼.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_98_7182 普天同庆
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，你所有攻击变为群体攻击，但目标不包含距你最远的1或2人（3人及以下无效）；你的擒消耗1/2个饼.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "普天同庆" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_98_7182 "普天同庆".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你所有攻击变为群体攻击，但目标不包含距你最远的1或2人（3人及以下无效）；你的擒消耗1/2个饼.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_99_65551：无形之盾

- 名称：无形之盾
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你对身边2人无敌（3人及以下无效）
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=turn_hit_check, passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你对身边2人无敌（3人及以下无效）
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_99_65551/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_99_65551 无形之盾
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，你对身边2人无敌（3人及以下无效）.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "无形之盾" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_99_65551 无形之盾
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，你对身边2人无敌（3人及以下无效）.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "无形之盾" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_99_65551 无形之盾
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，你对身边2人无敌（3人及以下无效）.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_99_65551 无形之盾
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，你对身边2人无敌（3人及以下无效）.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "无形之盾" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_99_65551 "无形之盾".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你对身边2人无敌（3人及以下无效）.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_100_45717：顺手牵羊

- 名称：顺手牵羊
- 分类：locked
- 时机：被动技能
- 描述：锁定技，开局声明，使相邻玩家各告知你1个技能，选择其中1个获得
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=1
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：锁定技，开局声明，使相邻玩家各告知你1个技能，选择其中1个获得; cost 0, target none; limited 1 use(s)
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_100_45717/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_100_45717 顺手牵羊
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 锁定技，开局声明，使相邻玩家各告知你1个技能，选择其中1个获得; cost 0, target none; limited 1 use(s).
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "顺手牵羊" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_100_45717 顺手牵羊
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 锁定技，开局声明，使相邻玩家各告知你1个技能，选择其中1个获得; cost 0, target none; limited 1 use(s).
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "顺手牵羊" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_100_45717 顺手牵羊
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 锁定技，开局声明，使相邻玩家各告知你1个技能，选择其中1个获得; cost 0, target none; limited 1 use(s).
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_100_45717 顺手牵羊
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 锁定技，开局声明，使相邻玩家各告知你1个技能，选择其中1个获得; cost 0, target none; limited 1 use(s).
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "顺手牵羊" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_100_45717 "顺手牵羊".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=1. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 锁定技，开局声明，使相邻玩家各告知你1个技能，选择其中1个获得; cost 0, target none; limited 1 use(s).
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_101_4254：镜像法术

- 名称：镜像法术
- 分类：limited
- 时机：随时可用
- 描述：限定技，一局限1次，复制场上已暴露的1个技能
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=1
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：限定技，一局限1次，复制场上已暴露的1个技能; cost 0, target none; limited 1 use(s)
- 视觉原型：石墨线控场
- 色彩：石墨黑、灰蓝、少量青绿
- 材质：细金属支架线、铅笔线稿、透明胶片
- 运动：石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_101_4254/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_101_4254 镜像法术
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，一局限1次，复制场上已暴露的1个技能; cost 0, target none; limited 1 use(s).
Primary request: 石墨线控场; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "镜像法术" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_101_4254 镜像法术
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，一局限1次，复制场上已暴露的1个技能; cost 0, target none; limited 1 use(s).
Primary request: 石墨线控场; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "镜像法术" motif reaches the strongest readable silhouette; 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_101_4254 镜像法术
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，一局限1次，复制场上已暴露的1个技能; cost 0, target none; limited 1 use(s).
Primary request: 石墨线控场; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_101_4254 镜像法术
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，一局限1次，复制场上已暴露的1个技能; cost 0, target none; limited 1 use(s).
Primary request: 石墨线控场; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "镜像法术" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_101_4254 "镜像法术".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=no_direct_effect / uses=1. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 限定技，一局限1次，复制场上已暴露的1个技能; cost 0, target none; limited 1 use(s).
Visual language: graphite linework and thin metal rods constricting, transparent installation control effect; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_102_5546：自爆者死

- 名称：自爆者死
- 分类：locked
- 时机：被动技能
- 描述：锁定技，除你外自爆者退游，你每次自爆只-1血，你有1次后手自爆机会
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，除你外自爆者退游，你每次自爆只-1血，你有1次后手自爆机会
- 视觉原型：墨色虚空裂隙
- 色彩：蓝黑、紫灰、象牙白
- 材质：稀释油墨、刮擦裂纹、半透明烟状颜料
- 运动：蓝黑墨痕在画布上裂开，吸入周围颜料后迅速闭合
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_102_5546/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_102_5546 自爆者死
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，除你外自爆者退游，你每次自爆只-1血，你有1次后手自爆机会.
Primary request: 墨色虚空裂隙; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "自爆者死" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_102_5546 自爆者死
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，除你外自爆者退游，你每次自爆只-1血，你有1次后手自爆机会.
Primary request: 墨色虚空裂隙; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "自爆者死" motif reaches the strongest readable silhouette; 蓝黑墨痕在画布上裂开，吸入周围颜料后迅速闭合; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_102_5546 自爆者死
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，除你外自爆者退游，你每次自爆只-1血，你有1次后手自爆机会.
Primary request: 墨色虚空裂隙; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_102_5546 自爆者死
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，除你外自爆者退游，你每次自爆只-1血，你有1次后手自爆机会.
Primary request: 墨色虚空裂隙; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "自爆者死" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_102_5546 "自爆者死".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，除你外自爆者退游，你每次自爆只-1血，你有1次后手自爆机会.
Visual language: blue black diluted oil ink fissure, violet gray smoke pigment, canvas scratch texture; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 蓝黑墨痕在画布上裂开，吸入周围颜料后迅速闭合.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_103_56259：闪现

- 名称：闪现
- 分类：control
- 时机：变招阶段
- 描述：控制技，3轮限1次，回避此回合受到的所有不超过无限的攻击
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=flash_dodge
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：控制技，3轮限1次，回避此回合受到的所有不超过无限的攻击; cost 0, target none
- 视觉原型：石墨线控场
- 色彩：石墨黑、灰蓝、少量青绿
- 材质：细金属支架线、铅笔线稿、透明胶片
- 运动：石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_103_56259/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_103_56259 闪现
Gameplay meaning: kind=effect / cost=0 / target=none / effect=flash_dodge.
Mechanic-specific cue: 控制技，3轮限1次，回避此回合受到的所有不超过无限的攻击; cost 0, target none.
Primary request: 石墨线控场; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "闪现" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_103_56259 闪现
Gameplay meaning: kind=effect / cost=0 / target=none / effect=flash_dodge.
Mechanic-specific cue: 控制技，3轮限1次，回避此回合受到的所有不超过无限的攻击; cost 0, target none.
Primary request: 石墨线控场; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "闪现" motif reaches the strongest readable silhouette; 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_103_56259 闪现
Gameplay meaning: kind=effect / cost=0 / target=none / effect=flash_dodge.
Mechanic-specific cue: 控制技，3轮限1次，回避此回合受到的所有不超过无限的攻击; cost 0, target none.
Primary request: 石墨线控场; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_103_56259 闪现
Gameplay meaning: kind=effect / cost=0 / target=none / effect=flash_dodge.
Mechanic-specific cue: 控制技，3轮限1次，回避此回合受到的所有不超过无限的攻击; cost 0, target none.
Primary request: 石墨线控场; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "闪现" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_103_56259 "闪现".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=flash_dodge. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 控制技，3轮限1次，回避此回合受到的所有不超过无限的攻击; cost 0, target none.
Visual language: graphite linework and thin metal rods constricting, transparent installation control effect; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_104_71181：过往时空

- 名称：过往时空
- 分类：limited
- 时机：随时可用
- 描述：限定技，一局限1次，先手重开，进入小空间“过往时空”5轮
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=past_time_space / uses=1
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：限定技，一局限1次，先手重开，进入小空间“过往时空”5轮; cost 0, target none; limited 1 use(s)
- 视觉原型：石墨线控场
- 色彩：石墨黑、灰蓝、少量青绿
- 材质：细金属支架线、铅笔线稿、透明胶片
- 运动：石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_104_71181/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_104_71181 过往时空
Gameplay meaning: kind=effect / cost=0 / target=none / effect=past_time_space / uses=1.
Mechanic-specific cue: 限定技，一局限1次，先手重开，进入小空间“过往时空”5轮; cost 0, target none; limited 1 use(s).
Primary request: 石墨线控场; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "过往时空" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_104_71181 过往时空
Gameplay meaning: kind=effect / cost=0 / target=none / effect=past_time_space / uses=1.
Mechanic-specific cue: 限定技，一局限1次，先手重开，进入小空间“过往时空”5轮; cost 0, target none; limited 1 use(s).
Primary request: 石墨线控场; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "过往时空" motif reaches the strongest readable silhouette; 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_104_71181 过往时空
Gameplay meaning: kind=effect / cost=0 / target=none / effect=past_time_space / uses=1.
Mechanic-specific cue: 限定技，一局限1次，先手重开，进入小空间“过往时空”5轮; cost 0, target none; limited 1 use(s).
Primary request: 石墨线控场; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_104_71181 过往时空
Gameplay meaning: kind=effect / cost=0 / target=none / effect=past_time_space / uses=1.
Mechanic-specific cue: 限定技，一局限1次，先手重开，进入小空间“过往时空”5轮; cost 0, target none; limited 1 use(s).
Primary request: 石墨线控场; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "过往时空" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_104_71181 "过往时空".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=past_time_space / uses=1. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 限定技，一局限1次，先手重开，进入小空间“过往时空”5轮; cost 0, target none; limited 1 use(s).
Visual language: graphite linework and thin metal rods constricting, transparent installation control effect; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_105_48309：白板

- 名称：白板
- 分类：locked
- 时机：被动技能
- 描述：锁定技，场上剩余2人时，你胜利
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，场上剩余2人时，你胜利
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_105_48309/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_105_48309 白板
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，场上剩余2人时，你胜利.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "白板" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_105_48309 白板
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，场上剩余2人时，你胜利.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "白板" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_105_48309 白板
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，场上剩余2人时，你胜利.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_105_48309 白板
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，场上剩余2人时，你胜利.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "白板" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_105_48309 "白板".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，场上剩余2人时，你胜利.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_106_59962：黑板

- 名称：黑板
- 分类：locked
- 时机：被动技能
- 描述：锁定技，若白板胜利，你使其失败，你胜利
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，若白板胜利，你使其失败，你胜利
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_106_59962/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_106_59962 黑板
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，若白板胜利，你使其失败，你胜利.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "黑板" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_106_59962 黑板
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，若白板胜利，你使其失败，你胜利.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "黑板" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_106_59962 黑板
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，若白板胜利，你使其失败，你胜利.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_106_59962 黑板
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，若白板胜利，你使其失败，你胜利.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "黑板" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_106_59962 "黑板".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，若白板胜利，你使其失败，你胜利.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_107_53513：雷裂残阳

- 名称：雷裂残阳
- 分类：limited
- 时机：随时可用
- 描述：限定技，一局限1次，使除你外所有血量≤3的玩家退游，电系
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=all / effect=no_direct_effect / uses=1
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：限定技，一局限1次，使除你外所有血量≤3的玩家退游，电系; cost 0, target all; limited 1 use(s)
- 视觉原型：墨色虚空裂隙
- 色彩：蓝黑、紫灰、象牙白
- 材质：稀释油墨、刮擦裂纹、半透明烟状颜料
- 运动：蓝黑墨痕在画布上裂开，吸入周围颜料后迅速闭合
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_107_53513/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_107_53513 雷裂残阳
Gameplay meaning: kind=effect / cost=0 / target=all / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，一局限1次，使除你外所有血量≤3的玩家退游，电系; cost 0, target all; limited 1 use(s).
Primary request: 墨色虚空裂隙; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "雷裂残阳" motif first appears as a small oil-paint emblem; radial table-wide spread with several separated landing stains; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_107_53513 雷裂残阳
Gameplay meaning: kind=effect / cost=0 / target=all / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，一局限1次，使除你外所有血量≤3的玩家退游，电系; cost 0, target all; limited 1 use(s).
Primary request: 墨色虚空裂隙; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "雷裂残阳" motif reaches the strongest readable silhouette; 蓝黑墨痕在画布上裂开，吸入周围颜料后迅速闭合; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_107_53513 雷裂残阳
Gameplay meaning: kind=effect / cost=0 / target=all / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，一局限1次，使除你外所有血量≤3的玩家退游，电系; cost 0, target all; limited 1 use(s).
Primary request: 墨色虚空裂隙; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through radial table-wide spread with several separated landing stains; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_107_53513 雷裂残阳
Gameplay meaning: kind=effect / cost=0 / target=all / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，一局限1次，使除你外所有血量≤3的玩家退游，电系; cost 0, target all; limited 1 use(s).
Primary request: 墨色虚空裂隙; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "雷裂残阳" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_107_53513 "雷裂残阳".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=all / effect=no_direct_effect / uses=1. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 限定技，一局限1次，使除你外所有血量≤3的玩家退游，电系; cost 0, target all; limited 1 use(s).
Visual language: blue black diluted oil ink fissure, violet gray smoke pigment, canvas scratch texture; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 蓝黑墨痕在画布上裂开，吸入周围颜料后迅速闭合.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_108_76133：六芒星

- 名称：六芒星
- 分类：limited
- 时机：变伤阶段
- 描述：限定技，一局限1次，免疫此回合不超过无限的伤害，若此回合最高受到x点单次伤害，你+x+6血
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=none / effect=six_star / uses=1
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：限定技，一局限1次，免疫此回合不超过无限的伤害，若此回合最高受到x点单次伤害，你+x+6血; cost 0, target none; limited 1 use(s)
- 视觉原型：透明防御波纹
- 色彩：青绿、乳白、透明灰
- 材质：透明亚克力、水波、薄油膜
- 运动：青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_108_76133/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_108_76133 六芒星
Gameplay meaning: kind=effect / cost=0 / target=none / effect=six_star / uses=1.
Mechanic-specific cue: 限定技，一局限1次，免疫此回合不超过无限的伤害，若此回合最高受到x点单次伤害，你+x+6血; cost 0, target none; limited 1 use(s).
Primary request: 透明防御波纹; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "六芒星" motif first appears as a small oil-paint emblem; centered system mark with no target lane; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_108_76133 六芒星
Gameplay meaning: kind=effect / cost=0 / target=none / effect=six_star / uses=1.
Mechanic-specific cue: 限定技，一局限1次，免疫此回合不超过无限的伤害，若此回合最高受到x点单次伤害，你+x+6血; cost 0, target none; limited 1 use(s).
Primary request: 透明防御波纹; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "六芒星" motif reaches the strongest readable silhouette; 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_108_76133 六芒星
Gameplay meaning: kind=effect / cost=0 / target=none / effect=six_star / uses=1.
Mechanic-specific cue: 限定技，一局限1次，免疫此回合不超过无限的伤害，若此回合最高受到x点单次伤害，你+x+6血; cost 0, target none; limited 1 use(s).
Primary request: 透明防御波纹; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through centered system mark with no target lane; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_108_76133 六芒星
Gameplay meaning: kind=effect / cost=0 / target=none / effect=six_star / uses=1.
Mechanic-specific cue: 限定技，一局限1次，免疫此回合不超过无限的伤害，若此回合最高受到x点单次伤害，你+x+6血; cost 0, target none; limited 1 use(s).
Primary request: 透明防御波纹; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "六芒星" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_108_76133 "六芒星".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=none / effect=six_star / uses=1. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 限定技，一局限1次，免疫此回合不超过无限的伤害，若此回合最高受到x点单次伤害，你+x+6血; cost 0, target none; limited 1 use(s).
Visual language: teal translucent acrylic ripple shield, soft oil film, museum installation lighting; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_109_65084：传音入密

- 名称：传音入密
- 分类：locked
- 时机：被动技能
- 描述：锁定技，他人暴露1个技能时，对其造成2点法术伤害，不重开，对每个玩家最多触发1次
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，他人暴露1个技能时，对其造成2点法术伤害，不重开，对每个玩家最多触发1次
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_109_65084/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_109_65084 传音入密
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，他人暴露1个技能时，对其造成2点法术伤害，不重开，对每个玩家最多触发1次.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "传音入密" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_109_65084 传音入密
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，他人暴露1个技能时，对其造成2点法术伤害，不重开，对每个玩家最多触发1次.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "传音入密" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_109_65084 传音入密
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，他人暴露1个技能时，对其造成2点法术伤害，不重开，对每个玩家最多触发1次.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_109_65084 传音入密
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，他人暴露1个技能时，对其造成2点法术伤害，不重开，对每个玩家最多触发1次.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "传音入密" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_109_65084 "传音入密".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，他人暴露1个技能时，对其造成2点法术伤害，不重开，对每个玩家最多触发1次.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_110_2190：三千雷动

- 名称：三千雷动
- 分类：attack
- 时机：出招
- 描述：技能攻击，3饼，群攻4，4级，油条防，电系
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=attack / cost=3 / target=all / element=electric / power=4 / level=4
- 触发表现：在出招、目标确认、命中结算三段中播放。
- 机制视觉线索：技能攻击，3饼，群攻4，4级，油条防，电系; cost 3, target all; power 4; level 4; defense youtiao
- 视觉原型：电流金属线绘
- 色彩：柠檬黄、钴蓝、石墨黑
- 材质：细金属线、亮黄油彩点、透明导线反光
- 运动：细线绷紧并抖动，黄色颜料沿线路跳跃，命中时产生短促星状飞溅
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_110_2190/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_110_2190 三千雷动
Gameplay meaning: kind=attack / cost=3 / target=all / element=electric / power=4 / level=4.
Mechanic-specific cue: 技能攻击，3饼，群攻4，4级，油条防，电系; cost 3, target all; power 4; level 4; defense youtiao.
Primary request: 电流金属线绘; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "三千雷动" motif first appears as a small oil-paint emblem; radial table-wide spread with several separated landing stains; keep intensity high-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 柠檬黄、钴蓝、石墨黑.
Materials/textures: 细金属线、亮黄油彩点、透明导线反光.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_110_2190 三千雷动
Gameplay meaning: kind=attack / cost=3 / target=all / element=electric / power=4 / level=4.
Mechanic-specific cue: 技能攻击，3饼，群攻4，4级，油条防，电系; cost 3, target all; power 4; level 4; defense youtiao.
Primary request: 电流金属线绘; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "三千雷动" motif reaches the strongest readable silhouette; 细线绷紧并抖动，黄色颜料沿线路跳跃，命中时产生短促星状飞溅; emphasize high-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 柠檬黄、钴蓝、石墨黑.
Materials/textures: 细金属线、亮黄油彩点、透明导线反光.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_110_2190 三千雷动
Gameplay meaning: kind=attack / cost=3 / target=all / element=electric / power=4 / level=4.
Mechanic-specific cue: 技能攻击，3饼，群攻4，4级，油条防，电系; cost 3, target all; power 4; level 4; defense youtiao.
Primary request: 电流金属线绘; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through radial table-wide spread with several separated landing stains; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 柠檬黄、钴蓝、石墨黑.
Materials/textures: 细金属线、亮黄油彩点、透明导线反光.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_110_2190 三千雷动
Gameplay meaning: kind=attack / cost=3 / target=all / element=electric / power=4 / level=4.
Mechanic-specific cue: 技能攻击，3饼，群攻4，4级，油条防，电系; cost 3, target all; power 4; level 4; defense youtiao.
Primary request: 电流金属线绘; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "三千雷动" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 柠檬黄、钴蓝、石墨黑.
Materials/textures: 细金属线、亮黄油彩点、透明导线反光.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_110_2190 "三千雷动".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=attack / cost=3 / target=all / element=electric / power=4 / level=4. Trigger behavior: 在出招、目标确认、命中结算三段中播放。
Mechanic-specific cue: 技能攻击，3饼，群攻4，4级，油条防，电系; cost 3, target all; power 4; level 4; defense youtiao.
Visual language: thin metal wire vibration with lemon yellow oil paint sparks and cobalt blue pigment; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线绷紧并抖动，黄色颜料沿线路跳跃，命中时产生短促星状飞溅.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_111_51056：制衡

- 名称：制衡
- 分类：limited
- 时机：随时可用
- 描述：限定技，一局限1次，选择除你外2名玩家，设你和他们血量总和为x，若x mod 3=0或1，你的血量变为x/3（上取整），他们的血量变为x/3（下取整）；若x mod 3=2，你的血量变为x/3（下取整），他们的血量变为x/3（上取整）
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=1
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：限定技，一局限1次，选择除你外2名玩家，设你和他们血量总和为x，若x mod 3=0或1，你的血量变为x/3（上取整），他们的血量变为x/3（下取整）；若x mod 3=2，你的血量变为x/3（下取整），他们的血量变为x/3（上取整）; cost 0, target single; limited 1 use(s)
- 视觉原型：石墨线控场
- 色彩：石墨黑、灰蓝、少量青绿
- 材质：细金属支架线、铅笔线稿、透明胶片
- 运动：石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_111_51056/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_111_51056 制衡
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，一局限1次，选择除你外2名玩家，设你和他们血量总和为x，若x mod 3=0或1，你的血量变为x/3（上取整），他们的血量变为x/3（下取整）；若x mod 3=2，你的血量变为x/3（下取整），他们的血量变为x/3（上取整）; cost 0, target single; limited 1 use(s).
Primary request: 石墨线控场; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "制衡" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_111_51056 制衡
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，一局限1次，选择除你外2名玩家，设你和他们血量总和为x，若x mod 3=0或1，你的血量变为x/3（上取整），他们的血量变为x/3（下取整）；若x mod 3=2，你的血量变为x/3（下取整），他们的血量变为x/3（上取整）; cost 0, target single; limited 1 use(s).
Primary request: 石墨线控场; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "制衡" motif reaches the strongest readable silhouette; 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_111_51056 制衡
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，一局限1次，选择除你外2名玩家，设你和他们血量总和为x，若x mod 3=0或1，你的血量变为x/3（上取整），他们的血量变为x/3（下取整）；若x mod 3=2，你的血量变为x/3（下取整），他们的血量变为x/3（上取整）; cost 0, target single; limited 1 use(s).
Primary request: 石墨线控场; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_111_51056 制衡
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=1.
Mechanic-specific cue: 限定技，一局限1次，选择除你外2名玩家，设你和他们血量总和为x，若x mod 3=0或1，你的血量变为x/3（上取整），他们的血量变为x/3（下取整）；若x mod 3=2，你的血量变为x/3（下取整），他们的血量变为x/3（上取整）; cost 0, target single; limited 1 use(s).
Primary request: 石墨线控场; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "制衡" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_111_51056 "制衡".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=1. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 限定技，一局限1次，选择除你外2名玩家，设你和他们血量总和为x，若x mod 3=0或1，你的血量变为x/3（上取整），他们的血量变为x/3（下取整）；若x mod 3=2，你的血量变为x/3（下取整），他们的血量变为x/3（上取整）; cost 0, target single; limited 1 use(s).
Visual language: graphite linework and thin metal rods constricting, transparent installation control effect; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_112_59292：地狱主宰

- 名称：地狱主宰
- 分类：limited
- 时机：随时可用，复活阶段可用
- 描述：限定技，一局限2次，若场上有玩家死亡且没有复活，使其6血复活，无技能，成为你的傀儡；可对自己使用
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=single / effect=hell_overlord / uses=2
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：限定技，一局限2次，若场上有玩家死亡且没有复活，使其6血复活，无技能，成为你的傀儡；可对自己使用; cost 0, target single; limited 2 use(s)
- 视觉原型：墨色虚空裂隙
- 色彩：蓝黑、紫灰、象牙白
- 材质：稀释油墨、刮擦裂纹、半透明烟状颜料
- 运动：蓝黑墨痕在画布上裂开，吸入周围颜料后迅速闭合
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_112_59292/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_112_59292 地狱主宰
Gameplay meaning: kind=effect / cost=0 / target=single / effect=hell_overlord / uses=2.
Mechanic-specific cue: 限定技，一局限2次，若场上有玩家死亡且没有复活，使其6血复活，无技能，成为你的傀儡；可对自己使用; cost 0, target single; limited 2 use(s).
Primary request: 墨色虚空裂隙; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "地狱主宰" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_112_59292 地狱主宰
Gameplay meaning: kind=effect / cost=0 / target=single / effect=hell_overlord / uses=2.
Mechanic-specific cue: 限定技，一局限2次，若场上有玩家死亡且没有复活，使其6血复活，无技能，成为你的傀儡；可对自己使用; cost 0, target single; limited 2 use(s).
Primary request: 墨色虚空裂隙; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "地狱主宰" motif reaches the strongest readable silhouette; 蓝黑墨痕在画布上裂开，吸入周围颜料后迅速闭合; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_112_59292 地狱主宰
Gameplay meaning: kind=effect / cost=0 / target=single / effect=hell_overlord / uses=2.
Mechanic-specific cue: 限定技，一局限2次，若场上有玩家死亡且没有复活，使其6血复活，无技能，成为你的傀儡；可对自己使用; cost 0, target single; limited 2 use(s).
Primary request: 墨色虚空裂隙; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_112_59292 地狱主宰
Gameplay meaning: kind=effect / cost=0 / target=single / effect=hell_overlord / uses=2.
Mechanic-specific cue: 限定技，一局限2次，若场上有玩家死亡且没有复活，使其6血复活，无技能，成为你的傀儡；可对自己使用; cost 0, target single; limited 2 use(s).
Primary request: 墨色虚空裂隙; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "地狱主宰" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_112_59292 "地狱主宰".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=single / effect=hell_overlord / uses=2. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 限定技，一局限2次，若场上有玩家死亡且没有复活，使其6血复活，无技能，成为你的傀儡；可对自己使用; cost 0, target single; limited 2 use(s).
Visual language: blue black diluted oil ink fissure, violet gray smoke pigment, canvas scratch texture; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 蓝黑墨痕在画布上裂开，吸入周围颜料后迅速闭合.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_113_88141：无限战意

- 名称：无限战意
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你死亡且没有复活后，继续游戏2轮
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check, revival_action
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你死亡且没有复活后，继续游戏2轮
- 视觉原型：墨色虚空裂隙
- 色彩：蓝黑、紫灰、象牙白
- 材质：稀释油墨、刮擦裂纹、半透明烟状颜料
- 运动：蓝黑墨痕在画布上裂开，吸入周围颜料后迅速闭合
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_113_88141/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_113_88141 无限战意
Gameplay meaning: visual-only / phases=passive_check, revival_action.
Mechanic-specific cue: 锁定技，你死亡且没有复活后，继续游戏2轮.
Primary request: 墨色虚空裂隙; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "无限战意" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_113_88141 无限战意
Gameplay meaning: visual-only / phases=passive_check, revival_action.
Mechanic-specific cue: 锁定技，你死亡且没有复活后，继续游戏2轮.
Primary request: 墨色虚空裂隙; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "无限战意" motif reaches the strongest readable silhouette; 蓝黑墨痕在画布上裂开，吸入周围颜料后迅速闭合; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_113_88141 无限战意
Gameplay meaning: visual-only / phases=passive_check, revival_action.
Mechanic-specific cue: 锁定技，你死亡且没有复活后，继续游戏2轮.
Primary request: 墨色虚空裂隙; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_113_88141 无限战意
Gameplay meaning: visual-only / phases=passive_check, revival_action.
Mechanic-specific cue: 锁定技，你死亡且没有复活后，继续游戏2轮.
Primary request: 墨色虚空裂隙; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "无限战意" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 蓝黑、紫灰、象牙白.
Materials/textures: 稀释油墨、刮擦裂纹、半透明烟状颜料.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_113_88141 "无限战意".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check, revival_action. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你死亡且没有复活后，继续游戏2轮.
Visual language: blue black diluted oil ink fissure, violet gray smoke pigment, canvas scratch texture; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 蓝黑墨痕在画布上裂开，吸入周围颜料后迅速闭合.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_114_87583：不死金身

- 名称：不死金身
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你免疫伤害不为1的致死攻击伤害
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=turn_damage_check, passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你免疫伤害不为1的致死攻击伤害
- 视觉原型：透明防御波纹
- 色彩：青绿、乳白、透明灰
- 材质：透明亚克力、水波、薄油膜
- 运动：青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_114_87583/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_114_87583 不死金身
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check.
Mechanic-specific cue: 锁定技，你免疫伤害不为1的致死攻击伤害.
Primary request: 透明防御波纹; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "不死金身" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_114_87583 不死金身
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check.
Mechanic-specific cue: 锁定技，你免疫伤害不为1的致死攻击伤害.
Primary request: 透明防御波纹; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "不死金身" motif reaches the strongest readable silhouette; 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_114_87583 不死金身
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check.
Mechanic-specific cue: 锁定技，你免疫伤害不为1的致死攻击伤害.
Primary request: 透明防御波纹; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_114_87583 不死金身
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check.
Mechanic-specific cue: 锁定技，你免疫伤害不为1的致死攻击伤害.
Primary request: 透明防御波纹; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "不死金身" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 青绿、乳白、透明灰.
Materials/textures: 透明亚克力、水波、薄油膜.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_114_87583 "不死金身".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=turn_damage_check, passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你免疫伤害不为1的致死攻击伤害.
Visual language: teal translucent acrylic ripple shield, soft oil film, museum installation lighting; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 青绿色透明圆环从玩家周围扩散，挡住冲击后回弹成柔和波纹.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_115_74459：同生共死

- 名称：同生共死
- 分类：limited
- 时机：回合末阶段
- 描述：限定技，一局限2次，选取1名玩家，若你本回合受到x点伤害，使其受到等量法术伤害
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=2
- 触发表现：在技能确认或效果结算时播放，优先跟随技能卡和目标线。
- 机制视觉线索：限定技，一局限2次，选取1名玩家，若你本回合受到x点伤害，使其受到等量法术伤害; cost 0, target single; limited 2 use(s)
- 视觉原型：石墨线控场
- 色彩：石墨黑、灰蓝、少量青绿
- 材质：细金属支架线、铅笔线稿、透明胶片
- 运动：石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_115_74459/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_115_74459 同生共死
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=2.
Mechanic-specific cue: 限定技，一局限2次，选取1名玩家，若你本回合受到x点伤害，使其受到等量法术伤害; cost 0, target single; limited 2 use(s).
Primary request: 石墨线控场; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "同生共死" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_115_74459 同生共死
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=2.
Mechanic-specific cue: 限定技，一局限2次，选取1名玩家，若你本回合受到x点伤害，使其受到等量法术伤害; cost 0, target single; limited 2 use(s).
Primary request: 石墨线控场; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "同生共死" motif reaches the strongest readable silhouette; 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_115_74459 同生共死
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=2.
Mechanic-specific cue: 限定技，一局限2次，选取1名玩家，若你本回合受到x点伤害，使其受到等量法术伤害; cost 0, target single; limited 2 use(s).
Primary request: 石墨线控场; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_115_74459 同生共死
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=2.
Mechanic-specific cue: 限定技，一局限2次，选取1名玩家，若你本回合受到x点伤害，使其受到等量法术伤害; cost 0, target single; limited 2 use(s).
Primary request: 石墨线控场; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "同生共死" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 石墨黑、灰蓝、少量青绿.
Materials/textures: 细金属支架线、铅笔线稿、透明胶片.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_115_74459 "同生共死".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=effect / cost=0 / target=single / effect=no_direct_effect / uses=2. Trigger behavior: 在技能确认或效果结算时播放，优先跟随技能卡和目标线。
Mechanic-specific cue: 限定技，一局限2次，选取1名玩家，若你本回合受到x点伤害，使其受到等量法术伤害; cost 0, target single; limited 2 use(s).
Visual language: graphite linework and thin metal rods constricting, transparent installation control effect; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 石墨线框从四周收束，短暂锁定目标后像展览装置的线缆一样松开.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_116_97172：复仇之刃

- 名称：复仇之刃
- 分类：locked
- 时机：被动技能
- 描述：锁定技，当其他玩家对你造成攻击伤害后，若你对他造成攻击伤害，记为1次复仇；你复仇5次后胜利
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，当其他玩家对你造成攻击伤害后，若你对他造成攻击伤害，记为1次复仇；你复仇5次后胜利
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_116_97172/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_116_97172 复仇之刃
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，当其他玩家对你造成攻击伤害后，若你对他造成攻击伤害，记为1次复仇；你复仇5次后胜利.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "复仇之刃" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_116_97172 复仇之刃
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，当其他玩家对你造成攻击伤害后，若你对他造成攻击伤害，记为1次复仇；你复仇5次后胜利.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "复仇之刃" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_116_97172 复仇之刃
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，当其他玩家对你造成攻击伤害后，若你对他造成攻击伤害，记为1次复仇；你复仇5次后胜利.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_116_97172 复仇之刃
Gameplay meaning: visual-only / phases=passive_check.
Mechanic-specific cue: 锁定技，当其他玩家对你造成攻击伤害后，若你对他造成攻击伤害，记为1次复仇；你复仇5次后胜利.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "复仇之刃" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_116_97172 "复仇之刃".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，当其他玩家对你造成攻击伤害后，若你对他造成攻击伤害，记为1次复仇；你复仇5次后胜利.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_117_55768：百炼成神

- 名称：百炼成神
- 分类：locked
- 时机：被动技能
- 描述：锁定技，你在血量不超过初始血量的1/2（下取整）时累计攻击25次后，胜利
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=turn_hit_check, passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，你在血量不超过初始血量的1/2（下取整）时累计攻击25次后，胜利
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_117_55768/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_117_55768 百炼成神
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，你在血量不超过初始血量的1/2（下取整）时累计攻击25次后，胜利.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "百炼成神" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_117_55768 百炼成神
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，你在血量不超过初始血量的1/2（下取整）时累计攻击25次后，胜利.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "百炼成神" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_117_55768 百炼成神
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，你在血量不超过初始血量的1/2（下取整）时累计攻击25次后，胜利.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_117_55768 百炼成神
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check.
Mechanic-specific cue: 锁定技，你在血量不超过初始血量的1/2（下取整）时累计攻击25次后，胜利.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "百炼成神" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_117_55768 "百炼成神".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=turn_hit_check, passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，你在血量不超过初始血量的1/2（下取整）时累计攻击25次后，胜利.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_118_53580：冰漩决

- 名称：冰漩决
- 分类：attack
- 时机：出招
- 描述：技能攻击，3饼，攻1，3级，石头防，冰系，命中后赋予1回合“冰冻”，可选取连续的1到3名玩家作为目标；冰冻：无法出招
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=attack / cost=3 / target=single / element=ice / power=1 / level=3
- 触发表现：在出招、目标确认、命中结算三段中播放。
- 机制视觉线索：技能攻击，3饼，攻1，3级，石头防，冰系，命中后赋予1回合“冰冻”，可选取连续的1到3名玩家作为目标；冰冻：无法出招; cost 3, target single; power 1; level 3; defense stone
- 视觉原型：冰霜蛋彩攻击
- 色彩：雾蓝、灰白、淡青
- 材质：冷色蛋彩、薄涂刮痕、冰晶状颜料边缘
- 运动：淡蓝颜料凝成细线后快速刺出，命中时扩成霜花状薄涂纹理，末尾轻微碎裂
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_118_53580/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_118_53580 冰漩决
Gameplay meaning: kind=attack / cost=3 / target=single / element=ice / power=1 / level=3.
Mechanic-specific cue: 技能攻击，3饼，攻1，3级，石头防，冰系，命中后赋予1回合“冰冻”，可选取连续的1到3名玩家作为目标；冰冻：无法出招; cost 3, target single; power 1; level 3; defense stone.
Primary request: 冰霜蛋彩攻击; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "冰漩决" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity medium-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 雾蓝、灰白、淡青.
Materials/textures: 冷色蛋彩、薄涂刮痕、冰晶状颜料边缘.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_118_53580 冰漩决
Gameplay meaning: kind=attack / cost=3 / target=single / element=ice / power=1 / level=3.
Mechanic-specific cue: 技能攻击，3饼，攻1，3级，石头防，冰系，命中后赋予1回合“冰冻”，可选取连续的1到3名玩家作为目标；冰冻：无法出招; cost 3, target single; power 1; level 3; defense stone.
Primary request: 冰霜蛋彩攻击; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "冰漩决" motif reaches the strongest readable silhouette; 淡蓝颜料凝成细线后快速刺出，命中时扩成霜花状薄涂纹理，末尾轻微碎裂; emphasize medium-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 雾蓝、灰白、淡青.
Materials/textures: 冷色蛋彩、薄涂刮痕、冰晶状颜料边缘.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_118_53580 冰漩决
Gameplay meaning: kind=attack / cost=3 / target=single / element=ice / power=1 / level=3.
Mechanic-specific cue: 技能攻击，3饼，攻1，3级，石头防，冰系，命中后赋予1回合“冰冻”，可选取连续的1到3名玩家作为目标；冰冻：无法出招; cost 3, target single; power 1; level 3; defense stone.
Primary request: 冰霜蛋彩攻击; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 雾蓝、灰白、淡青.
Materials/textures: 冷色蛋彩、薄涂刮痕、冰晶状颜料边缘.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_118_53580 冰漩决
Gameplay meaning: kind=attack / cost=3 / target=single / element=ice / power=1 / level=3.
Mechanic-specific cue: 技能攻击，3饼，攻1，3级，石头防，冰系，命中后赋予1回合“冰冻”，可选取连续的1到3名玩家作为目标；冰冻：无法出招; cost 3, target single; power 1; level 3; defense stone.
Primary request: 冰霜蛋彩攻击; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "冰漩决" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 雾蓝、灰白、淡青.
Materials/textures: 冷色蛋彩、薄涂刮痕、冰晶状颜料边缘.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_118_53580 "冰漩决".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=attack / cost=3 / target=single / element=ice / power=1 / level=3. Trigger behavior: 在出招、目标确认、命中结算三段中播放。
Mechanic-specific cue: 技能攻击，3饼，攻1，3级，石头防，冰系，命中后赋予1回合“冰冻”，可选取连续的1到3名玩家作为目标；冰冻：无法出招; cost 3, target single; power 1; level 3; defense stone.
Visual language: pale blue ice-tempera paint streak, frost flower burst, delicate cold pigment scratches; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 淡蓝颜料凝成细线后快速刺出，命中时扩成霜花状薄涂纹理，末尾轻微碎裂.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_119_78843：火漩决

- 名称：火漩决
- 分类：attack
- 时机：出招
- 描述：技能攻击，3饼，攻3，3级，石头防，火系，可选取连续的1到3名玩家作为目标
- 播放状态：已接入 play，可由技能播放系统直接触发
- 玩法摘要：kind=attack / cost=3 / target=single / element=fire / power=3 / level=3
- 触发表现：在出招、目标确认、命中结算三段中播放。
- 机制视觉线索：技能攻击，3饼，攻3，3级，石头防，火系，可选取连续的1到3名玩家作为目标; cost 3, target single; power 3; level 3; defense stone
- 视觉原型：火焰油彩攻击
- 色彩：镉红、朱砂橙、少量焦黑
- 材质：厚涂油彩、热蜡裂纹、透明亚克力反光
- 运动：红橙颜料从起点压缩后冲出，命中时溅成放射状油彩颗粒，末尾留下热色拖痕
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_119_78843/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_119_78843 火漩决
Gameplay meaning: kind=attack / cost=3 / target=single / element=fire / power=3 / level=3.
Mechanic-specific cue: 技能攻击，3饼，攻3，3级，石头防，火系，可选取连续的1到3名玩家作为目标; cost 3, target single; power 3; level 3; defense stone.
Primary request: 火焰油彩攻击; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "火漩决" motif first appears as a small oil-paint emblem; one precise lane from source to target with a single impact point; keep intensity medium-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 镉红、朱砂橙、少量焦黑.
Materials/textures: 厚涂油彩、热蜡裂纹、透明亚克力反光.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_119_78843 火漩决
Gameplay meaning: kind=attack / cost=3 / target=single / element=fire / power=3 / level=3.
Mechanic-specific cue: 技能攻击，3饼，攻3，3级，石头防，火系，可选取连续的1到3名玩家作为目标; cost 3, target single; power 3; level 3; defense stone.
Primary request: 火焰油彩攻击; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "火漩决" motif reaches the strongest readable silhouette; 红橙颜料从起点压缩后冲出，命中时溅成放射状油彩颗粒，末尾留下热色拖痕; emphasize medium-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 镉红、朱砂橙、少量焦黑.
Materials/textures: 厚涂油彩、热蜡裂纹、透明亚克力反光.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_119_78843 火漩决
Gameplay meaning: kind=attack / cost=3 / target=single / element=fire / power=3 / level=3.
Mechanic-specific cue: 技能攻击，3饼，攻3，3级，石头防，火系，可选取连续的1到3名玩家作为目标; cost 3, target single; power 3; level 3; defense stone.
Primary request: 火焰油彩攻击; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through one precise lane from source to target with a single impact point; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 镉红、朱砂橙、少量焦黑.
Materials/textures: 厚涂油彩、热蜡裂纹、透明亚克力反光.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_119_78843 火漩决
Gameplay meaning: kind=attack / cost=3 / target=single / element=fire / power=3 / level=3.
Mechanic-specific cue: 技能攻击，3饼，攻3，3级，石头防，火系，可选取连续的1到3名玩家作为目标; cost 3, target single; power 3; level 3; defense stone.
Primary request: 火焰油彩攻击; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "火漩决" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 镉红、朱砂橙、少量焦黑.
Materials/textures: 厚涂油彩、热蜡裂纹、透明亚克力反光.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_119_78843 "火漩决".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: kind=attack / cost=3 / target=single / element=fire / power=3 / level=3. Trigger behavior: 在出招、目标确认、命中结算三段中播放。
Mechanic-specific cue: 技能攻击，3饼，攻3，3级，石头防，火系，可选取连续的1到3名玩家作为目标; cost 3, target single; power 3; level 3; defense stone.
Visual language: fiery cadmium red and orange oil paint splash, painterly impasto, warm transparent acrylic reflections; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 红橙颜料从起点压缩后冲出，命中时溅成放射状油彩颗粒，末尾留下热色拖痕.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_120_85509：创伤聚合

- 名称：创伤聚合
- 分类：locked
- 时机：被动技能
- 描述：锁定技，当你受到伤害后，3轮后+3血，该轮轮初+1饼
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=passive_check, round_start_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，当你受到伤害后，3轮后+3血，该轮轮初+1饼
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_120_85509/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_120_85509 创伤聚合
Gameplay meaning: visual-only / phases=passive_check, round_start_check.
Mechanic-specific cue: 锁定技，当你受到伤害后，3轮后+3血，该轮轮初+1饼.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "创伤聚合" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_120_85509 创伤聚合
Gameplay meaning: visual-only / phases=passive_check, round_start_check.
Mechanic-specific cue: 锁定技，当你受到伤害后，3轮后+3血，该轮轮初+1饼.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "创伤聚合" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_120_85509 创伤聚合
Gameplay meaning: visual-only / phases=passive_check, round_start_check.
Mechanic-specific cue: 锁定技，当你受到伤害后，3轮后+3血，该轮轮初+1饼.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_120_85509 创伤聚合
Gameplay meaning: visual-only / phases=passive_check, round_start_check.
Mechanic-specific cue: 锁定技，当你受到伤害后，3轮后+3血，该轮轮初+1饼.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "创伤聚合" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_120_85509 "创伤聚合".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=passive_check, round_start_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，当你受到伤害后，3轮后+3血，该轮轮初+1饼.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

### skill_121_59557：因果律认知

- 名称：因果律认知
- 分类：locked
- 时机：被动技能
- 描述：锁定技，开局声明，当场上玩家触发隐性技能效果时，使该技能暴露
- 播放状态：未接入 play，需要作为锁定/被动/系统触发视觉反馈补齐
- 玩法摘要：visual-only / phases=game_start_check, passive_check
- 触发表现：在锁定技条件生效时播放一枚短促被动印记。
- 机制视觉线索：锁定技，开局声明，当场上玩家触发隐性技能效果时，使该技能暴露
- 视觉原型：被动触发印记
- 色彩：象牙白、石墨灰、低饱和青绿
- 材质：薄涂标记、透明标签、细线装置
- 运动：细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出
- 当前资产：缺少全部 7 个文件
- 资产目录：`apps/client/public/assets/effects/skill_121_59557/`

#### imagegen 关键帧 prompt

**keyframe-01.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 1/4
Skill: skill_121_59557 因果律认知
Gameplay meaning: visual-only / phases=game_start_check, passive_check.
Mechanic-specific cue: 锁定技，开局声明，当场上玩家触发隐性技能效果时，使该技能暴露.
Primary request: 被动触发印记; 起势：颜料、透明装置和细线开始聚集，动作尚未爆发。
Frame direction: the "因果律认知" motif first appears as a small oil-paint emblem; subtle system feedback near the skill card; keep intensity low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-02.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 2/4
Skill: skill_121_59557 因果律认知
Gameplay meaning: visual-only / phases=game_start_check, passive_check.
Mechanic-specific cue: 锁定技，开局声明，当场上玩家触发隐性技能效果时，使该技能暴露.
Primary request: 被动触发印记; 爆发：主颜料、线缆或波纹冲出，画面动势最强。
Frame direction: the "因果律认知" motif reaches the strongest readable silhouette; 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出; emphasize low-impact.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-03.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 3/4
Skill: skill_121_59557 因果律认知
Gameplay meaning: visual-only / phases=game_start_check, passive_check.
Mechanic-specific cue: 锁定技，开局声明，当场上玩家触发隐性技能效果时，使该技能暴露.
Primary request: 被动触发印记; 扩散：颜料飞溅、波纹展开或线框锁定，保留中心留白。
Frame direction: The effect reveals gameplay information through subtle system feedback near the skill card; split or spread only if the skill targets multiple players.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

**keyframe-04.png**

```text
Use case: game VFX keyframe
Asset type: BING-game skill effect keyframe 4/4
Skill: skill_121_59557 因果律认知
Gameplay meaning: visual-only / phases=game_start_check, passive_check.
Mechanic-specific cue: 锁定技，开局声明，当场上玩家触发隐性技能效果时，使该技能暴露.
Primary request: 被动触发印记; 残留：颜料沉积、细线回落，可作为 poster frame。
Frame direction: Leave a quiet residue shaped like the "因果律认知" motif; keep final poster clean, readable, and not screen-filling.
Style/medium: hand-painted oil on canvas, contemporary shared dining installation, translucent acrylic apparatus, painterly impasto.
Color palette: 象牙白、石墨灰、低饱和青绿.
Materials/textures: 薄涂标记、透明标签、细线装置.
Composition/framing: centered effect on a warm ivory tabletop, generous transparent negative space around the effect, no UI text, no logo, no characters.
Lighting/mood: soft museum lighting, gentle wall-shadow feeling, refined art installation.
Constraints: readable game state must remain possible; avoid covering the entire frame; no text, no watermark.
Avoid: hard vector shapes, neon sci-fi HUD, black panels, plastic toy look, simple geometry, cartoon particles.
```

#### Seedance 动画 prompt

```text
Create a 0.8-1.6 second game VFX animation for BING-game skill skill_121_59557 "因果律认知".
Use the four input keyframes in order: keyframe-01 start, keyframe-02 burst, keyframe-03 spread, keyframe-04 residue/poster.
Gameplay meaning: visual-only / phases=game_start_check, passive_check. Trigger behavior: 在锁定技条件生效时播放一枚短促被动印记。
Mechanic-specific cue: 锁定技，开局声明，当场上玩家触发隐性技能效果时，使该技能暴露.
Visual language: subtle passive trigger mark, ivory oil wash, graphite line label, translucent installation tag; oil painting on canvas, transparent acrylic shared dining installation, thin metal apparatus, soft museum lighting.
Motion: 细线和半透明颜料在角色旁短暂显现，像展签一样提示被动条件已触发，随后淡出.
Camera: locked top-down or slight three-quarter tabletop view; no camera shake unless the keyframe implies impact; no zoom that hides UI.
Timing: ease-in 0.18s, burst at 0.35-0.55s, dissipate by the end; preserve a clean final poster frame.
Output: 30fps, one-shot playback, no text, no logo, no watermark, no extra characters.
Readability constraint: keep the center and lower UI-readable area partially clear; do not cover HP, resource counters, target lines, or submit status for more than 500ms.
Avoid: neon lasers, sci-fi HUD, flat vector circles, generic particle systems, plastic 3D, dark black panels.
```

