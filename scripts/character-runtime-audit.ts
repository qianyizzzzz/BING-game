import fs from "node:fs";
import path from "node:path";
import { CHARACTER_ROSTER } from "../apps/client/src/lib/characters.js";

type PngInfo = {
  height: number;
  width: number;
};

type GlbInfo = {
  animations: number;
  animationNames: string[];
  images: number;
  materials: number;
  meshes: number;
  nodes: number;
  skinnedNodes: number;
  skins: number;
  scenes: number;
  weightedMeshPrimitives: number;
};

const projectRoot = path.resolve(import.meta.dirname, "..");
const publicRoot = path.join(projectRoot, "apps", "client", "public");
const failures: string[] = [];
const warnings: string[] = [];
const expectedAnimationNames = ["idle", "attack", "defend", "skill", "hit", "down"];
const requiredCharacterImages = [
  ["mobile-avatar", "mobile-avatar.png", 768, 768],
  ["face-detail", "face-detail.png", 640, 640],
  ["turnaround-front", "turnaround-front.png", 768, 768],
  ["turnaround-side", "turnaround-side.png", 768, 768],
  ["turnaround-three-quarter", "turnaround-three-quarter.png", 768, 768],
  ["table-scale", "table-scale.png", 768, 768],
  ["rig-guide", "rig-guide.png", 512, 512],
  ["skin-preview-attack", "skin-preview-attack.png", 512, 512],
  ["skin-preview-skill", "skin-preview-skill.png", 512, 512],
  ["skin-preview-hit", "skin-preview-hit.png", 512, 512],
  ["skin-preview-down", "skin-preview-down.png", 512, 512]
] as const;
const requiredPbrTextureFiles = ["albedo.png", "normal.png", "roughness.png"] as const;

for (const character of CHARACTER_ROSTER) {
  const publicUrls = [
    ["avatar", character.avatarUrl],
    ["model-lod0", character.modelUrl],
    ["model-lod1", character.lod1ModelUrl],
    ...Object.entries(character.actionPoseUrls).map(([pose, url]) => [`pose-${pose}`, url] as const)
  ] as const;

  for (const [label, publicUrl] of publicUrls) {
    const filePath = resolvePublicUrl(publicUrl);
    if (!fs.existsSync(filePath)) {
      failures.push(`${character.id} ${label}: missing ${publicUrl}`);
      continue;
    }

    if (publicUrl.endsWith(".png")) {
      auditPng(character.id, label, filePath);
    } else if (publicUrl.endsWith(".glb")) {
      auditGlb(character.id, label, filePath);
    }
  }

  for (const [label, fileName, width, height] of requiredCharacterImages) {
    const filePath = path.join(publicRoot, "assets", "characters", character.id, fileName);
    if (!fs.existsSync(filePath)) {
      failures.push(`${character.id} ${label}: missing ${repoPath(filePath)}`);
      continue;
    }
    auditPng(character.id, label, filePath, { width, height });
  }
}

auditMaterialAssets();

if (warnings.length > 0) {
  console.warn("character runtime asset warnings:");
  for (const warning of warnings) {
    console.warn(`warn - ${warning}`);
  }
}

if (failures.length > 0) {
  console.error("character runtime asset audit failed:");
  for (const failure of failures) {
    console.error(`fail - ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(`character runtime asset audit passed: ${CHARACTER_ROSTER.length} characters`);
}

function auditPng(characterId: string, label: string, filePath: string, expected?: PngInfo): void {
  const info = readPngInfo(filePath);
  if (!info) {
    failures.push(`${characterId} ${label}: invalid PNG ${repoPath(filePath)}`);
    return;
  }

  if (expected && (info.width !== expected.width || info.height !== expected.height)) {
    failures.push(
      `${characterId} ${label}: expected ${expected.width}x${expected.height} PNG, got ${info.width}x${info.height}`
    );
    return;
  }

  if (label.startsWith("pose-") && (info.width !== 512 || info.height !== 512)) {
    failures.push(`${characterId} ${label}: expected 512x512 PNG, got ${info.width}x${info.height}`);
    return;
  }

  if (info.width < 64 || info.height < 64) {
    failures.push(`${characterId} ${label}: PNG too small (${info.width}x${info.height})`);
  }
}

function auditGlb(characterId: string, label: string, filePath: string): void {
  const info = readGlbInfo(filePath);
  if (!info) {
    failures.push(`${characterId} ${label}: invalid GLB ${repoPath(filePath)}`);
    return;
  }

  if (info.scenes < 1 || info.nodes < 1 || info.meshes < 1) {
    failures.push(`${characterId} ${label}: GLB has incomplete scene graph ${JSON.stringify(info)}`);
  }

  if (label === "model-lod0" || label === "model-lod1") {
    if (info.skins < 1 || info.skinnedNodes < 1 || info.weightedMeshPrimitives < 1) {
      warnings.push(
        `${characterId} ${label}: skinned character GLB incomplete, got skins=${info.skins}, skinnedNodes=${info.skinnedNodes}, weightedMeshPrimitives=${info.weightedMeshPrimitives}`
      );
    }

    const missingAnimations = expectedAnimationNames.filter(
      (name) =>
        !info.animationNames.some(
          (animationName) =>
            animationName === name || animationName.startsWith(`${name}_`) || animationName.includes(`_${name}_`)
        )
    );
    if (missingAnimations.length > 0) {
      warnings.push(`${characterId} ${label}: missing preview animation clips ${missingAnimations.join(", ")}`);
    }
  }
}

function auditMaterialAssets(): void {
  const materialQaPath = path.join(publicRoot, "assets", "characters", "materials", "material-qa.png");
  if (!fs.existsSync(materialQaPath)) {
    failures.push(`materials material-qa: missing ${repoPath(materialQaPath)}`);
  } else {
    auditPng("materials", "material-qa", materialQaPath);
  }

  const pbrRoot = path.join(publicRoot, "assets", "characters", "materials", "pbr");
  if (!fs.existsSync(pbrRoot)) {
    failures.push(`materials pbr: missing ${repoPath(pbrRoot)}`);
    return;
  }

  const texturePacks = fs
    .readdirSync(pbrRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  if (texturePacks.length < 30) {
    warnings.push(`materials pbr: expected at least 30 texture packs, found ${texturePacks.length}`);
  }

  for (const packName of texturePacks) {
    for (const fileName of requiredPbrTextureFiles) {
      const filePath = path.join(pbrRoot, packName, fileName);
      if (!fs.existsSync(filePath)) {
        failures.push(`materials pbr/${packName}: missing ${fileName}`);
        continue;
      }
      auditPng("materials", `pbr/${packName}/${fileName}`, filePath);
    }
  }
}

function readPngInfo(filePath: string): PngInfo | undefined {
  const header = fs.readFileSync(filePath).subarray(0, 24);
  const pngSignature = "89504e470d0a1a0a";
  if (header.subarray(0, 8).toString("hex") !== pngSignature) {
    return undefined;
  }
  return {
    width: header.readUInt32BE(16),
    height: header.readUInt32BE(20)
  };
}

function readGlbInfo(filePath: string): GlbInfo | undefined {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 20 || buffer.subarray(0, 4).toString("utf8") !== "glTF") {
    return undefined;
  }

  const version = buffer.readUInt32LE(4);
  const declaredLength = buffer.readUInt32LE(8);
  const jsonChunkLength = buffer.readUInt32LE(12);
  const jsonChunkType = buffer.readUInt32LE(16);
  if (version !== 2 || declaredLength !== buffer.length || jsonChunkType !== 0x4e4f534a) {
    return undefined;
  }

  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonChunkLength;
  if (jsonEnd > buffer.length) {
    return undefined;
  }

  const gltf = JSON.parse(buffer.subarray(jsonStart, jsonEnd).toString("utf8").trim());
  const animationNames = Array.isArray(gltf.animations)
    ? gltf.animations.map((animation: { name?: unknown }) => String(animation.name ?? ""))
    : [];
  const meshes = Array.isArray(gltf.meshes) ? gltf.meshes : [];
  const nodes = Array.isArray(gltf.nodes) ? gltf.nodes : [];
  const weightedMeshPrimitives = meshes
    .flatMap((mesh: { primitives?: Array<{ attributes?: Record<string, unknown> }> }) => mesh.primitives ?? [])
    .filter((primitive: { attributes?: Record<string, unknown> }) => {
      const attributes = primitive.attributes ?? {};
      return attributes.JOINTS_0 !== undefined && attributes.WEIGHTS_0 !== undefined;
    }).length;
  return {
    animations: Array.isArray(gltf.animations) ? gltf.animations.length : 0,
    animationNames,
    images: Array.isArray(gltf.images) ? gltf.images.length : 0,
    materials: Array.isArray(gltf.materials) ? gltf.materials.length : 0,
    meshes: meshes.length,
    nodes: nodes.length,
    skinnedNodes: nodes.filter((node: { skin?: unknown }) => node.skin !== undefined).length,
    skins: Array.isArray(gltf.skins) ? gltf.skins.length : 0,
    scenes: Array.isArray(gltf.scenes) ? gltf.scenes.length : 0,
    weightedMeshPrimitives
  };
}

function resolvePublicUrl(publicUrl: string): string {
  const cleanUrl = publicUrl.split("?")[0] ?? "";
  if (!cleanUrl.startsWith("/")) {
    throw new Error(`Expected root-relative public URL, got ${publicUrl}`);
  }

  const filePath = path.normalize(path.join(publicRoot, cleanUrl.slice(1)));
  if (!filePath.startsWith(publicRoot)) {
    throw new Error(`Public URL escapes public root: ${publicUrl}`);
  }
  return filePath;
}

function repoPath(filePath: string): string {
  return path.relative(projectRoot, filePath).replaceAll(path.sep, "/");
}
