import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  BIG_CARD_PACKS, createRoomPreset, getRandomBigCardIds, parseRoomPreset, type GameConfig
} from "@bing/shared";
import { MatchRecorder } from "../apps/server/src/matchRecorder";
import { RoomStore } from "../apps/server/src/roomStore";

function lobby() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bing-card-packs-"));
  const store = new RoomStore(new MatchRecorder(directory));
  const { state, player: host } = store.createRoom("房主");
  const roomId = state.id;
  const guest = store.joinRoom(roomId, "玩家").player;
  store.addAi(roomId);
  store.spectateRoom(roomId, "观战");
  return { store, roomId, host, guest };
}

test("card packs cover the requested ranges and a unique deal stays within the selected pool", () => {
  assert.equal(getRandomBigCardIds().length, 202);
  assert.deepEqual(BIG_CARD_PACKS.map(({ id }) => getRandomBigCardIds([id]).length),
    [30, 30, 25, 29, 20, 28, 15, 25]);
  const pool = new Set(getRandomBigCardIds(["royal", "supreme"]));
  assert.equal(pool.size, 55);
  assert.ok([...pool].every((id) => /^105(?:0[1-9]|[12]\d|30)$|^106(?:0[1-9]|1\d|2[0-5])$/.test(id)));

  const { store, roomId, host, guest } = lobby();
  const options = { bigCardPackIds: ["royal", "supreme"], allowDuplicateBigCards: false } satisfies Partial<GameConfig>;
  assert.throws(() => store.updateSettings(roomId, guest.id, options), /只有房主/);
  store.updateSettings(roomId, host.id, { skillMode: "big_random", skillCount: 6, ...options });
  const preset = createRoomPreset(store.publicState(roomId, host.id));
  const parsed = parseRoomPreset(JSON.parse(JSON.stringify(preset)));
  assert.deepEqual(parsed.config.bigCardPackIds, options.bigCardPackIds);
  assert.equal(parsed.config.allowDuplicateBigCards, false);
  assert.throws(() => parseRoomPreset({ ...preset, config: { ...preset.config, bigCardPackIds: ["10501"] } }), /卡包/);
  assert.throws(() => parseRoomPreset({ ...preset, config: { ...preset.config, allowDuplicateBigCards: "false" } }), /重复/);

  const state = store.start(roomId, host.id);
  const dealt = state.players.flatMap((player) => player.bigCards ?? []);
  assert.deepEqual(state.players.find((player) => player.kind === "spectator")!.bigCards, []);
  assert.equal(dealt.length, 18);
  assert.ok(dealt.every((card) => pool.has(card.cardId)));
  assert.equal(new Set(dealt.map((card) => card.cardId)).size, dealt.length);
});

test("empty and undersized pools leave the lobby intact and allowing repeats enables a retry", () => {
  const { store, roomId, host } = lobby();
  store.updateSettings(roomId, host.id, { skillMode: "big_random", skillCount: 6, bigCardPackIds: [], allowDuplicateBigCards: false });
  assert.throws(() => store.start(roomId, host.id), /至少勾选一个/);
  store.updateSettings(roomId, host.id, { bigCardPackIds: ["peerless"] });
  assert.throws(() => store.start(roomId, host.id), /只有 15 张.*需要 18 张/);
  assert.equal(store.get(roomId)!.phase, "lobby");
  assert.ok(store.get(roomId)!.players.every((player) => !player.bigCards?.length));

  store.updateSettings(roomId, host.id, { allowDuplicateBigCards: true });
  const players = store.start(roomId, host.id).players.filter((player) => player.kind !== "spectator");
  for (const player of players) {
    assert.equal(player.bigCards?.length, 6);
    assert.equal(new Set(player.bigCards!.map((card) => card.cardId)).size, 6);
  }
  assert.ok(new Set(players.flatMap((player) => player.bigCards!.map((card) => card.cardId))).size < 18);
});
