import { BookOpen, ChevronLeft, ChevronRight, GraduationCap, RotateCcw, SkipForward } from "lucide-react";
import { useState } from "react";

const TUTORIAL_STORAGE_KEY = "bing.tutorial.skipped.v1";

interface TutorialStep {
  title: string;
  goal: string;
  rule: string;
  practice: string;
  answer: string;
  checklist: string[];
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "1. 你每回合只能提交一次出招计划",
    goal: "先理解同时行动：你按下出招后不会立刻结算，要等所有存活玩家都出完。",
    rule: "每个玩家在同一回合提交出招。别人先出招时，界面只显示“已出招”，不会提前暴露内容。",
    practice: "如果 AI 1 已出招，但你还没出招，此时会不会已经造成伤害？",
    answer: "不会。真正的伤害、防御、反弹都在所有人亮招后统一结算。",
    checklist: ["观察玩家卡片右上角状态", "所有人已出招后才看播报动画", "不要被“已出招”误导成已经结算"]
  },
  {
    title: "2. 饼是本轮资源，不会跨轮保存",
    goal: "掌握最重要的资源节奏：攒饼、读防御、在轮内打出去。",
    rule: "出“饼”会获得 1 饼。一旦有人扣血或回血，本轮结束，所有玩家剩余饼清零。",
    practice: "你有 3 饼，准备继续攒到 6 饼；但本回合有人被擒命中掉血。你的 3 饼会怎样？",
    answer: "会清零。因为血量变化触发轮结束，下一轮所有人都从 0 饼重新开始。",
    checklist: ["想打高费招式需要在同一轮完成", "轮结束的触发点是血量变化", "出饼不能同时攻击或防御"]
  },
  {
    title: "3. 防御标签就是猜拳克制",
    goal: "知道为什么“出对防御”比“防御越贵越好”更重要。",
    rule: "杀和擒只怕小防，南蛮和闪电只怕油条，火舞和核爆只怕石头，超核爆只怕出饼，秒杀不能被普通防御挡住。",
    practice: "对方可能出“擒”。你应该优先用小防、油条还是石头？",
    answer: "小防。擒的防御标签是“小防防”，油条和石头都挡不住。",
    checklist: ["先看招式的防御标签", "任意防可以被小防、油条、石头挡住", "饼防表示出饼也能挡，同时获得 1 饼"]
  },
  {
    title: "4. 可以对不同目标提交多个招式",
    goal: "学会多人局的核心操作：一个目标最多一个招式，但可以同时打不同人。",
    rule: "一回合里可以对 A 出杀、对 B 出擒、对 C 出防御相关操作，但不能对同一个人叠多个不同招式。叠加同一种攻击仍用“重数”表达。",
    practice: "你有 2 饼，能不能同回合对 AI 1 出 1 杀、对 AI 2 出 1 擒？",
    answer: "可以，只要饼够并且每个目标只对应一个招式。若想对同一目标打 2 杀，应提交“2 杀”，不是两个杀动作。",
    checklist: ["多人局优先考虑补刀路线", "同目标多段同类攻击用重数", "提交前检查总耗饼"]
  },
  {
    title: "5. 反弹会沿路径继续传递",
    goal: "理解反弹不是简单换目标，而是一条可能成环的路径。",
    rule: "A 弹 B、B 弹 C 时，A 弹给 B 的攻击会继续被 B 弹给 C。若反弹路径成环，环上玩家都不受伤。带破弹的攻击会让反弹失效。",
    practice: "A 打 B，B 反弹给 C，C 又反弹给 B。谁受伤？",
    answer: "没有人受伤。B 和 C 形成反弹环，普通攻击会在环中抵消。",
    checklist: ["反弹必须消耗自身全部饼且饼数大于 0", "核爆、超核爆带破弹", "技能攻击默认会被反弹挡住但不会被转移"]
  },
  {
    title: "6. 第一张小技能会改变你的打法",
    goal: "从基础规则过渡到技能模式，知道技能是整局跟随你的独有能力。",
    rule: "开启“技能入门”后，每名玩家开局随机获得 1 张小技能。技能可能是攻击、资源放大、保命或特殊规则。",
    practice: "你抽到“圣”：消耗任意饼，获得双倍的饼。更适合在轮初、轮中还是快轮末使用？",
    answer: "通常更适合轮中且确认本轮还会继续时使用。因为轮结束会清空饼，快轮末放大资源可能浪费。",
    checklist: ["先读技能卡描述", "技能攻击也能叠加", "技能规则与基础规则冲突时，以技能描述为准"]
  },
  {
    title: "7. 看懂新版 3D 桌面",
    goal: "把注意力放回桌面：座位、角色动作、技能轨迹都在同一个对局场景里。",
    rule: "当前行动玩家会高亮；攻击、技能、防御、反弹会触发角色动作和桌面轨迹。右下角是你的出招区，不需要再上下滚动找按钮。",
    practice: "如果你看到某个座位闪紫色并有光束飞出，通常意味着什么？",
    answer: "通常表示该玩家本回合使用了技能，光束或爆点会指向受影响的目标。",
    checklist: ["先看高亮座位确认谁还没出招", "看轨迹判断技能目标", "右下角只保留当前可用操作"]
  },
  {
    title: "8. 技能阶段不是都在出招时发生",
    goal: "理解技能现在按阶段/判定点分类，不再只是一张说明卡。",
    rule: "有些技能开局生效，有些轮初或回合初自动判定，有些在亮招、命中、变伤、伤害结算、轮末才触发。技能列表会显示该技能对应的阶段标签。",
    practice: "“独裁”写着每轮轮初 +1 饼，你需要在出招面板手动点它吗？",
    answer: "不需要。它属于轮初判定点，会由结算引擎自动处理。",
    checklist: ["主动技能才会进出招面板", "锁定技会自动结算", "技能闪光表示本轮/本阶段刚触发"]
  },
  {
    title: "9. 限定技和次数上限",
    goal: "避免把一次性技能浪费在无效窗口。",
    rule: "限定技、一次性技能达到使用上限后不会再出现在可选出招里。AI 也会避开已用完的技能。",
    practice: "你已经用过 1 次“卷子”，它本局限 1 次。下一回合还能再点吗？",
    answer: "不能。出招面板会过滤掉已达到次数上限的主动技能。",
    checklist: ["先确认技能是否限次数", "高爆发限定技留给关键血线", "出招前看目标是否仍然存活"]
  },
  {
    title: "10. 反弹、破弹和散弹",
    goal: "掌握新版反弹相关技能的判定顺序。",
    rule: "普通反弹会改变攻击目标；破弹会让反弹失效；绝弹能反弹核爆、超核爆和技能攻击；散弹会把反弹扩散给除自己外所有人。",
    practice: "你有散弹并使用反弹，别人打你的普通攻击会只弹给一个人吗？",
    answer: "不会。散弹会把反弹结果扩散给除你外所有存活玩家。",
    checklist: ["先判断攻击是否破弹", "再判断是否有绝弹", "最后看是否触发散弹扩散"]
  },
  {
    title: "11. 复盘报告怎么读",
    goal: "每局结束后用复盘报告快速定位关键错误。",
    rule: "新版复盘 TXT 会先给快速结论、玩家终局、关键回合，再给完整事件流。先看最大伤害、承伤、反弹和轮结束原因。",
    practice: "如果你只想知道哪一回合开始崩盘，应该先看哪一段？",
    answer: "先看“关键回合”。那里会按亮招回合汇总伤害、防御、反弹和轮结束。",
    checklist: ["先读快速结论", "再看关键回合", "最后看完整事件流核对细节"]
  },
  {
    title: "12. 第一局推荐打法",
    goal: "给第一次上手一个稳定节奏，而不是盲猜。",
    rule: "前两回合多观察：先出饼攒资源，低饼时用杀/擒逼对方小防，高饼时用南蛮、闪电、火舞逼不同防御。",
    practice: "对方连续小防，你攒到 3 饼。下一次更适合继续杀，还是尝试南蛮？",
    answer: "可以尝试南蛮。连续小防说明对方在防杀/擒，南蛮需要油条防，能惩罚错误防御。",
    checklist: ["低费招式用来试探", "高费招式用来打防御错位", "不要把所有饼留到轮结束"]
  }
];

export function TutorialPanel() {
  const [skipped, setSkipped] = useState(() => readSkipped());
  const [stepIndex, setStepIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const step = TUTORIAL_STEPS[stepIndex]!;
  const progress = Math.round(((stepIndex + 1) / TUTORIAL_STEPS.length) * 100);

  function skipTutorial() {
    writeSkipped(true);
    setSkipped(true);
  }

  function reopenTutorial() {
    writeSkipped(false);
    setSkipped(false);
    setStepIndex(0);
    setShowAnswer(false);
  }

  function move(delta: number) {
    setStepIndex((current) => {
      const next = Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, current + delta));
      return next;
    });
    setShowAnswer(false);
  }

  if (skipped) {
    return (
      <section className="surface-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-teal-700" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold text-gray-900">新手入门指南</h2>
              <p className="text-sm text-gray-500">已跳过，可随时重新打开。</p>
            </div>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-100"
            onClick={reopenTutorial}
            type="button"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            打开
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="surface-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-teal-700" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">新手入门指南</h2>
            <p className="text-sm text-gray-500">跟着 {TUTORIAL_STEPS.length} 个步骤理解新版桌面和技能节奏。</p>
          </div>
        </div>
        <button
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:border-gray-300"
          onClick={skipTutorial}
          type="button"
        >
          <SkipForward className="h-4 w-4" aria-hidden="true" />
          一键跳过
        </button>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-teal-700 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <article className="rounded-lg border border-teal-100 bg-teal-50/50 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-teal-800">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          第 {stepIndex + 1} / {TUTORIAL_STEPS.length} 步
        </div>
        <h3 className="text-base font-black text-gray-950">{step.title}</h3>
        <p className="mt-2 text-sm leading-6 text-gray-700">{step.goal}</p>
        <p className="mt-2 rounded-lg border border-white bg-white/80 px-3 py-2 text-sm leading-6 text-gray-700">
          {step.rule}
        </p>
      </article>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="text-sm font-bold text-amber-900">你来判断</div>
        <p className="mt-2 text-sm leading-6 text-amber-950">{step.practice}</p>
        <button
          className="mt-3 rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-800"
          onClick={() => setShowAnswer((visible) => !visible)}
          type="button"
        >
          {showAnswer ? "收起答案" : "查看答案"}
        </button>
        {showAnswer ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm leading-6 text-gray-700">
            {step.answer}
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 text-sm text-gray-600">
        {step.checklist.map((item) => (
          <div key={item} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
            {item}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400 disabled:opacity-40"
          disabled={stepIndex === 0}
          onClick={() => move(-1)}
          type="button"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          上一步
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-gray-300"
          disabled={stepIndex === TUTORIAL_STEPS.length - 1}
          onClick={() => move(1)}
          type="button"
        >
          下一步
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function readSkipped(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(TUTORIAL_STORAGE_KEY) === "1";
}

function writeSkipped(skipped: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  if (skipped) {
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, "1");
  } else {
    window.localStorage.removeItem(TUTORIAL_STORAGE_KEY);
  }
}
