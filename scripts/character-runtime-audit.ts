import fs from "node:fs";
import path from "node:path";
import { CHARACTER_ROSTER } from "../apps/client/src/lib/characters.js";

type PngInfo = {
  height: number;
  width: number;
};

type GlbInfo = {
  animations: number;
  images: number;
  materials: number;
  meshes: number;
  nodes: number;
  scenes: number;
};

const projectRoot = path.resolve(import.meta.dirname, "..");
const publicRoot = path.join(projectRoot, "apps", "client", "public");
const failures: string[] = [];
const warnings: string[] = [];

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
}

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

function auditPng(characterId: string, label: string, filePath: string): void {
  const info = readPngInfo(filePath);
  if (!info) {
    failures.push(`${characterId} ${label}: invalid PNG ${repoPath(filePath)}`);
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

  if (label === "model-lod1" && info.animations === 0) {
    warnings.push(`${characterId} ${label}: no runtime animation clips yet`);
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
  return {
    animations: Array.isArray(gltf.animations) ? gltf.animations.length : 0,
    images: Array.isArray(gltf.images) ? gltf.images.length : 0,
    materials: Array.isArray(gltf.materials) ? gltf.materials.length : 0,
    meshes: Array.isArray(gltf.meshes) ? gltf.meshes.length : 0,
    nodes: Array.isArray(gltf.nodes) ? gltf.nodes.length : 0,
    scenes: Array.isArray(gltf.scenes) ? gltf.scenes.length : 0
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
