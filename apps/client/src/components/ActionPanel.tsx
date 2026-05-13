import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Cookie, Plus, RotateCcw, Send, Shield, Sparkles, Swords, Trash2 } from "lucide-react";
import {
  ActionSubmission,
  AttackId,
  ATTACK_ORDER,
  BASE_ATTACKS,
  DEFENSE_LABELS,
  DEFENSE_TAG_LABELS,
  PublicGameState,
  SkillId,
  getSkill,
  getSkillAttackStats,
  getSkillPlay,
  getStackedAttackStats
} from "@bing/shared";

interface ActionPanelProps {
  state: PublicGameState;
  submitting: boolean;
  onSubmit: (action: ActionSubmission) => void;
}

type Mode = "gain_cake" | "defense" | "attack" | "skill";
interface AttackRow {
  id: string;
  kind: "attack" | "skill";
  attackId: AttackId;
  skillId: SkillId;
  stacks: number;
  targetId: string;
}
const FIRST_ATTACK_ID = ATTACK_ORDER[0]!;

export function ActionPanel({ state, submitting, onSubmit }: ActionPanelProps) {
  const viewer = useMemo(
    () => state.players.find((player) => player.id === state.viewerPlayerId),
    [state.players, state.viewerPlayerId]
  );
  const enemies = useMemo(
    () =>
      state.players.filter(
        (player) => player.id !== viewer?.id && player.status === "alive"
      ),
    [state.players, viewer?.id]
  );

  const [mode, setMode] = useState<Mode>("gain_cake");
  const [defense, setDefense] = useState<"small" | "youtiao" | "stone" | "rebound">("small");
  const [targetId, setTargetId] = useState(enemies[0]?.id ?? "");
  const [skillId, setSkillId] = useState<SkillId>("");
  const [skillStacks, setSkillStacks] = useState(1);
  const [skillTargetId, setSkillTargetId] = useState(enemies[0]?.id ?? "");
  const [attackRows, setAttackRows] = useState<AttackRow[]>([
    {
      id: "attack_1",
      kind: "attack",
      attackId: FIRST_ATTACK_ID,
      skillId: "",
      stacks: 1,
      targetId: enemies[0]?.id ?? ""
    }
  ]);

  const alreadySubmitted =
    Boolean(viewer?.id) && state.pendingActionPlayerIds.includes(viewer!.id);
  const canAct =
    state.phase === "collecting_actions" &&
    viewer?.status === "alive" &&
    !alreadySubmitted;

  const firstTurnAttackLocked =
    state.config.firstTurnNoAttack && state.turnNumber === 1;
  const playableSkills = useMemo(
    () =>
      (viewer?.skills ?? [])
        .map((id) => {
          const skill = getSkill(id);
          const play = getSkillPlay(id);
          return skill && play ? { skill, play } : undefined;
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [viewer?.skills]
  );
  const actionSkills = playableSkills.filter(
    ({ play }) => play.kind === "attack" || play.targetMode === "single"
  );
  const nonAttackSkills = playableSkills.filter(({ play }) => play.kind !== "attack");
  const selectedSkill = nonAttackSkills.find((item) => item.skill.id === skillId) ?? nonAttackSkills[0];
  const selectedSkillPlay = selectedSkill?.play;
  const selectedSkillStats =
    selectedSkillPlay?.kind === "attack" && selectedSkill
      ? getSkillAttackStats(selectedSkill.skill.id, skillStacks)
      : undefined;
  const skillMaxStacks =
    selectedSkillPlay && viewer
      ? Math.max(
          1,
          Math.min(
            selectedSkillPlay.maxStacks,
            selectedSkillPlay.cost > 0
              ? Math.floor(viewer.cakes / selectedSkillPlay.cost)
              : selectedSkillPlay.maxStacks
          )
        )
      : 1;
  const skillCost = selectedSkillPlay ? selectedSkillPlay.cost * skillStacks : 0;
  const attackCost = attackRows.reduce((sum, row) => {
    return sum + rowCost(row);
  }, 0);
  const attackCostTooHigh =
    mode === "attack" && viewer ? attackCost > viewer.cakes : false;
  const skillCostTooHigh =
    mode === "skill" && viewer ? skillCost > viewer.cakes : false;
  const reboundUnavailable =
    mode === "defense" && defense === "rebound" && (!viewer || viewer.cakes <= 0);
  const duplicatedTargets = new Set(
    attackRows.map((row) => row.targetId).filter(Boolean)
  ).size !== attackRows.filter((row) => Boolean(row.targetId)).length;
  const hasAreaMixed =
    attackRows.length > 1 && attackRows.some((row) => rowIsArea(row));
  const missingTarget =
    (mode === "attack" &&
      attackRows.some((row) => !rowIsArea(row) && !row.targetId)) ||
    (mode === "defense" && defense === "rebound" && !targetId) ||
    (mode === "skill" && selectedSkillPlay?.targetMode === "single" && !skillTargetId);
  const actionInvalid = Boolean(
    attackCostTooHigh ||
      skillCostTooHigh ||
      (mode === "skill" && (!selectedSkill || !selectedSkillPlay || firstTurnAttackLocked)) ||
      reboundUnavailable ||
      missingTarget ||
      duplicatedTargets ||
      hasAreaMixed
  );

  useEffect(() => {
    if (enemies[0] && !enemies.some((enemy) => enemy.id === targetId)) {
      setTargetId(enemies[0].id);
    }
    setAttackRows((rows) => {
      let changed = false;
      const nextRows = rows.map((row) => {
        if (!enemies[0] || enemies.some((enemy) => enemy.id === row.targetId)) {
          return row;
        }

        changed = true;
        return { ...row, targetId: enemies[0].id };
      });
      return changed ? nextRows : rows;
    });
    if (enemies[0] && !enemies.some((enemy) => enemy.id === skillTargetId)) {
      setSkillTargetId(enemies[0].id);
    }
  }, [enemies, skillTargetId, targetId]);

  useEffect(() => {
    if (!selectedSkill && nonAttackSkills[0]) {
      setSkillId(nonAttackSkills[0].skill.id);
      setSkillStacks(1);
      return;
    }

    if (skillStacks > skillMaxStacks) {
      setSkillStacks(skillMaxStacks);
    }
  }, [nonAttackSkills, selectedSkill, skillMaxStacks, skillStacks]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canAct || submitting) {
      return;
    }

    if (mode === "gain_cake") {
      onSubmit({ type: "gain_cake" });
      return;
    }

    if (mode === "defense") {
      if (defense === "rebound") {
        onSubmit({
          type: "defense",
          defense,
          targetId
        });
        return;
      }

      onSubmit({
        type: "defense",
        defense
      });
      return;
    }

    if (mode === "skill") {
      if (!selectedSkill || !selectedSkillPlay) {
        return;
      }

      if (selectedSkillPlay.targetMode === "single") {
        onSubmit({
          type: "skill",
          skillId: selectedSkill.skill.id,
          stacks: skillStacks,
          targetId: skillTargetId
        });
        return;
      }

      onSubmit({
        type: "skill",
        skillId: selectedSkill.skill.id,
        stacks: skillStacks
      });
      return;
    }

    const actions = attackRows.map((row) => {
      if (row.kind === "skill") {
        const play = getSkillPlay(row.skillId);
        if (play?.targetMode === "all") {
          return {
            type: "skill" as const,
            skillId: row.skillId,
            stacks: row.stacks
          };
        }

        return {
          type: "skill" as const,
          skillId: row.skillId,
          stacks: row.stacks,
          targetId: row.targetId
        };
      }

      if (BASE_ATTACKS[row.attackId].isArea) {
        return {
          type: "attack" as const,
          attackId: row.attackId,
          stacks: row.stacks
        };
      }

      return {
        type: "attack" as const,
        attackId: row.attackId,
        stacks: row.stacks,
        targetId: row.targetId
      };
    });

    if (actions.length === 0) {
      return;
    }

    if (actions.length === 1) {
      onSubmit(actions[0]!);
      return;
    }

    onSubmit({
      actions
    });
  }

  return (
    <section className="surface-card action-board p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-950">出招</h2>
          <p className="mt-1 text-sm text-gray-500">
            第 {state.roundNumber} 轮 · 本轮第 {state.roundTurnNumber} 回合
          </p>
        </div>
        {alreadySubmitted ? (
          <span className="status-pill border-emerald-200 bg-emerald-50 text-emerald-700">
            等待他人
          </span>
        ) : null}
      </div>

      <form className="mt-4 space-y-4" onSubmit={submit}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ModeButton
            active={mode === "gain_cake"}
            icon={<Cookie className="h-4 w-4" aria-hidden="true" />}
            label="饼"
            onClick={() => setMode("gain_cake")}
          />
          <ModeButton
            active={mode === "defense"}
            icon={<Shield className="h-4 w-4" aria-hidden="true" />}
            label="防御"
            onClick={() => setMode("defense")}
          />
          <ModeButton
            active={mode === "attack"}
            disabled={firstTurnAttackLocked}
            icon={<Swords className="h-4 w-4" aria-hidden="true" />}
            label="攻击"
            onClick={() => setMode("attack")}
          />
          <ModeButton
            active={mode === "skill"}
            disabled={firstTurnAttackLocked || nonAttackSkills.length === 0}
            icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
            label="技能"
            onClick={() => setMode("skill")}
          />
        </div>

        {mode === "defense" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">
              防御
              <select
                className="soft-input mt-1 w-full"
                value={defense}
                onChange={(event) => setDefense(event.target.value as typeof defense)}
              >
                {(["small", "youtiao", "stone", "rebound"] as const).map((item) => (
                  <option key={item} value={item}>
                    {DEFENSE_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
            {defense === "rebound" ? (
              <TargetSelect
                enemies={enemies}
                targetId={targetId}
                onChange={setTargetId}
                label="反弹目标"
              />
            ) : null}
          </div>
        ) : null}

        {mode === "attack" ? (
          <div className="space-y-3">
            {attackRows.map((row, index) => {
              const stats = rowStats(row);
              const play = row.kind === "skill" ? getSkillPlay(row.skillId) : undefined;
              const isArea = rowIsArea(row);
              const maxStacks = rowMaxStacks(row);
              return (
                <div key={row.id} className="action-row">
                  <div className="grid gap-3 md:grid-cols-[1fr_96px_1fr_auto]">
                    <label className="block text-sm font-medium text-gray-700">
                      攻击 / 技能
                      <select
                        className="soft-input mt-1 w-full"
                        value={rowValue(row)}
                        onChange={(event) => updateRowKind(row.id, event.target.value)}
                      >
                        <optgroup label="基础招式">
                          {ATTACK_ORDER.map((id) => {
                            const item = BASE_ATTACKS[id];
                            return (
                              <option key={id} value={`attack:${id}`}>
                                {item.name} · {item.cost}饼
                              </option>
                            );
                          })}
                        </optgroup>
                        {actionSkills.length > 0 ? (
                          <optgroup label="技能招式">
                            {actionSkills.map(({ skill, play }) => (
                              <option key={skill.id} value={`skill:${skill.id}`}>
                                {skill.name} · {play.cost}饼
                              </option>
                            ))}
                          </optgroup>
                        ) : null}
                      </select>
                    </label>
                    <label className="block text-sm font-medium text-gray-700">
                      重数
                      <input
                        className="soft-input mt-1 w-full"
                        min={1}
                        max={maxStacks}
                        type="number"
                        value={row.stacks}
                        onChange={(event) =>
                          updateAttackRow(row.id, {
                            stacks: Math.max(
                              1,
                              Math.min(maxStacks, Number(event.target.value))
                            )
                          })
                        }
                      />
                    </label>
                    {!isArea ? (
                      <TargetSelect
                        enemies={enemies}
                        targetId={row.targetId}
                        onChange={(nextTargetId) =>
                          updateAttackRow(row.id, { targetId: nextTargetId })
                        }
                        label="攻击目标"
                      />
                    ) : (
                      <div className="self-end rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        群攻全体
                      </div>
                    )}
                    <button
                      className="self-end rounded-lg border border-gray-200 bg-white p-2 text-gray-500 shadow-sm hover:border-red-200 hover:text-red-700 disabled:opacity-40"
                      disabled={attackRows.length === 1}
                      onClick={() => removeAttackRow(row.id)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-4">
                    <Stat label="消耗" value={`${rowCost(row)}饼`} />
                    {stats ? (
                      <>
                        <Stat label="攻击" value={stats.power >= 999 ? "∞" : String(stats.power)} />
                        <Stat label="等级" value={String(stats.level)} />
                        <Stat label="防御" value={DEFENSE_TAG_LABELS[stats.defenseTag]} />
                      </>
                    ) : (
                      <>
                        <Stat label="类型" value={play?.kind === "effect" ? "效果" : "技能"} />
                        <Stat label="目标" value="单体" />
                        <Stat label="说明" value={getSkill(row.skillId)?.name ?? "技能"} />
                      </>
                    )}
                  </div>
                  {duplicatedTargets && index === 0 ? (
                    <p className="mt-2 text-sm text-red-600">
                      一回合里不能对同一个人做多个招式。
                    </p>
                  ) : null}
                </div>
              );
            })}
            <div className="flex items-center justify-between gap-3">
              <button
                className="btn-secondary disabled:opacity-40"
                disabled={
                  attackRows.length >= enemies.length ||
                  attackRows.some((row) => rowIsArea(row))
                }
                onClick={addAttackRow}
                type="button"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                添加目标
              </button>
              <div className="text-sm font-medium text-gray-600">
                总消耗：{attackCost} 饼
              </div>
            </div>
            {hasAreaMixed ? (
              <p className="text-sm text-red-600">群攻招式必须单独使用。</p>
            ) : null}
          </div>
        ) : null}

        {mode === "skill" ? (
          <div className="action-row space-y-3">
            {nonAttackSkills.length > 0 ? (
              <>
                <div className="grid gap-3 md:grid-cols-[1fr_96px_1fr]">
                  <label className="block text-sm font-medium text-gray-700">
                    技能
                    <select
                      className="soft-input mt-1 w-full"
                      value={selectedSkill?.skill.id ?? ""}
                      onChange={(event) => {
                        setSkillId(event.target.value);
                        setSkillStacks(1);
                      }}
                    >
                      {nonAttackSkills.map(({ skill, play }) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name} · {play.cost}饼
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    重数
                    <input
                      className="soft-input mt-1 w-full"
                      min={1}
                      max={skillMaxStacks}
                      type="number"
                      value={skillStacks}
                      onChange={(event) =>
                        setSkillStacks(
                          Math.max(1, Math.min(skillMaxStacks, Number(event.target.value)))
                        )
                      }
                    />
                  </label>
                  {selectedSkillPlay?.targetMode === "single" ? (
                    <TargetSelect
                      enemies={enemies}
                      targetId={skillTargetId}
                      onChange={setSkillTargetId}
                      label="技能目标"
                    />
                  ) : (
                    <div className="self-end rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
                      {selectedSkillPlay?.targetMode === "all" ? "作用全体敌人" : "不需要目标"}
                    </div>
                  )}
                </div>
                <div className="grid gap-2 text-sm text-gray-600 sm:grid-cols-4">
                  <Stat label="消耗" value={`${skillCost}饼`} />
                  {selectedSkillPlay?.kind === "resource" ? (
                    <>
                      <Stat
                        label="获得"
                        value={`${(selectedSkillPlay.resourceGainPerStack ?? 0) * skillStacks}饼`}
                      />
                      <Stat label="类型" value="资源" />
                      <Stat label="目标" value="自身" />
                    </>
                  ) : selectedSkillStats ? (
                    <>
                      <Stat label="攻击" value={String(selectedSkillStats.power)} />
                      <Stat label="等级" value={String(selectedSkillStats.level)} />
                      <Stat label="防御" value={DEFENSE_TAG_LABELS[selectedSkillStats.defenseTag]} />
                    </>
                  ) : null}
                </div>
                <p className="text-sm leading-6 text-gray-600">
                  {selectedSkill?.skill.description}
                </p>
              </>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                你当前没有资源/效果型主动技能。攻击型技能请在“攻击”面板里和基础招式一起选择。
              </div>
            )}
          </div>
        ) : null}

        {mode === "gain_cake" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900 shadow-sm">
            本回合获得 1 个饼。若对方使用超核爆，出饼也能作为“饼防”。
          </div>
        ) : null}

        <button
          className="btn-primary w-full justify-center py-3 disabled:cursor-not-allowed disabled:bg-gray-300"
          disabled={!canAct || submitting || actionInvalid}
          type="submit"
        >
          {submitting ? (
            <RotateCcw className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          提交出招
        </button>
      </form>
    </section>
  );

  function addAttackRow() {
    const usedTargets = new Set(attackRows.map((row) => row.targetId));
    const nextTarget = enemies.find((enemy) => !usedTargets.has(enemy.id)) ?? enemies[0];
    if (!nextTarget) {
      return;
    }

    setAttackRows((rows) => [
      ...rows,
      {
        id: `attack_${Date.now()}`,
        kind: "attack",
        attackId: FIRST_ATTACK_ID,
        skillId: "",
        stacks: 1,
        targetId: nextTarget.id
      }
    ]);
  }

  function updateAttackRow(id: string, patch: Partial<AttackRow>) {
    setAttackRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  function removeAttackRow(id: string) {
    setAttackRows((rows) => rows.filter((row) => row.id !== id));
  }

  function updateRowKind(id: string, value: string) {
    const [kind, rawId] = value.split(":") as ["attack" | "skill", string];
    if (!rawId) {
      return;
    }

    if (kind === "skill") {
      updateAttackRow(id, {
        kind,
        skillId: rawId,
        stacks: 1
      });
      return;
    }

    updateAttackRow(id, {
      kind: "attack",
      attackId: rawId as AttackId,
      stacks: 1
    });
  }

  function rowValue(row: AttackRow): string {
    return row.kind === "skill" ? `skill:${row.skillId}` : `attack:${row.attackId}`;
  }

  function rowStats(row: AttackRow) {
    if (row.kind === "skill") {
      return getSkillAttackStats(row.skillId, row.stacks);
    }

    return getStackedAttackStats(BASE_ATTACKS[row.attackId], row.stacks);
  }

  function rowCost(row: AttackRow): number {
    if (row.kind === "skill") {
      const play = getSkillPlay(row.skillId);
      return (play?.cost ?? 0) * row.stacks;
    }

    return getStackedAttackStats(BASE_ATTACKS[row.attackId], row.stacks).cost;
  }

  function rowIsArea(row: AttackRow): boolean {
    if (row.kind === "skill") {
      return getSkillPlay(row.skillId)?.targetMode === "all";
    }

    return getStackedAttackStats(BASE_ATTACKS[row.attackId], row.stacks).isArea;
  }

  function rowMaxStacks(row: AttackRow): number {
    if (!viewer) {
      return 1;
    }

    const play = row.kind === "skill" ? getSkillPlay(row.skillId) : undefined;
    const limit = play?.maxStacks ?? 20;
    const cost = row.kind === "skill" ? play?.cost ?? 1 : BASE_ATTACKS[row.attackId].cost;
    if (cost <= 0) {
      return limit;
    }

    return Math.max(1, Math.min(limit, Math.floor(viewer.cakes / cost)));
  }
}

interface ModeButtonProps {
  active: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

function ModeButton({ active, disabled, icon, label, onClick }: ModeButtonProps) {
  return (
    <button
      className={[
        "mode-button",
        active ? "mode-button-active" : "",
        disabled ? "cursor-not-allowed opacity-45" : ""
      ].join(" ")}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

interface TargetSelectProps {
  enemies: Array<{ id: string; name: string }>;
  targetId: string;
  label: string;
  onChange: (targetId: string) => void;
}

function TargetSelect({ enemies, targetId, label, onChange }: TargetSelectProps) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <select
        className="soft-input mt-1 w-full"
        value={targetId}
        onChange={(event) => onChange(event.target.value)}
      >
        {enemies.map((enemy) => (
          <option key={enemy.id} value={enemy.id}>
            {enemy.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-chip">
      <span className="block text-xs text-gray-400">{label}</span>
      <span className="font-semibold text-gray-800">{value}</span>
    </div>
  );
}
