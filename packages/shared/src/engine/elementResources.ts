import type { PlayerState } from "../types";

export function getElementAmount(player: Pick<PlayerState, "buffs"> | undefined, element: string): number {
  return player?.buffs.find((buff) => buff.id === `element:${element}`)?.stacks ?? 0;
}

export function changeElementAmount(player: Pick<PlayerState, "buffs">, element: string, delta: number): void {
  const id = `element:${element}`;
  const amount = getElementAmount(player, element) + delta;
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error(`${element}元素数量无效`);
  player.buffs = player.buffs.filter((buff) => buff.id !== id);
  if (amount > 0) player.buffs.push({ id, name: element, stateType: "element_resource", stacks: amount });
}
