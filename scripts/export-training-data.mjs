import fs from "node:fs";
import path from "node:path";

const rootDir = process.env.MATCH_DATA_DIR ?? "data";
const legacyRootDir = "apps/server/data";
const trainingDir = path.resolve(rootDir, "training");
const outFile = path.resolve(rootDir, "training-dataset.jsonl");
const legacyTrainingDir = path.resolve(legacyRootDir, "training");

const sourceTrainingDirs = [trainingDir, legacyTrainingDir].filter((dir, index, dirs) =>
  fs.existsSync(dir) && dirs.indexOf(dir) === index
);

if (sourceTrainingDirs.length === 0) {
  console.log(`No training directory found at ${trainingDir}`);
  process.exit(0);
}

let exported = 0;
fs.mkdirSync(path.dirname(outFile), { recursive: true });
const output = fs.createWriteStream(outFile, "utf-8");

for (const dir of sourceTrainingDirs) {
  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".jsonl"))
    .sort();

  for (const file of files) {
    const filePath = path.join(dir, file);
    const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const sample = JSON.parse(line);
      output.write(`${JSON.stringify(normalizeSample(sample))}\n`);
      exported += 1;
    }
  }
}

output.end();
console.log(`Exported ${exported} samples -> ${outFile}`);

function normalizeSample(sample) {
  const viewer = sample.state.players.find((player) => player.id === sample.playerId);
  const enemies = sample.state.players.filter(
    (player) => player.id !== sample.playerId && player.status === "alive"
  );

  return {
    gameId: sample.gameId,
    at: sample.at,
    playerKind: sample.playerKind,
    action: sample.action,
    features: {
      phase: sample.state.phase,
      roundNumber: sample.state.roundNumber,
      roundTurnNumber: sample.state.roundTurnNumber,
      turnNumber: sample.state.turnNumber,
      selfHp: viewer?.hp ?? 0,
      selfCakes: viewer?.cakes ?? 0,
      aliveEnemyCount: enemies.length,
      maxEnemyCakes: Math.max(0, ...enemies.map((enemy) => enemy.cakes)),
      minEnemyHp: Math.min(99, ...enemies.map((enemy) => enemy.hp)),
      pendingActionCount: sample.state.pendingActionPlayerIds.length
    }
  };
}
