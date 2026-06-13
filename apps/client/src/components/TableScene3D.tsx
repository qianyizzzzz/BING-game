import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { PlayerId, PublicGameState } from "@bing/shared";
import type { BattlePresentationCue } from "../lib/battlePresentation";
import type { CharacterProfile } from "../lib/characters";
import { getCharacterByAvatarUrl, getCharacterBySeatIndex } from "../lib/characters";
import { SeatPosition } from "./PlayerSeat";

interface TableScene3DProps {
  directorCue?: BattlePresentationCue | undefined;
  players: PublicGameState["players"];
  seatPositions: Record<PlayerId, SeatPosition>;
  viewerPlayerId?: PlayerId | undefined;
}

const CHARACTER_COLORS = [
  "#e76f2f",
  "#1fb7a6",
  "#8d65d8",
  "#d84d4d",
  "#3aa7d8",
  "#c9a24f"
];
const MODEL_TARGET_HEIGHT = 0.92;
const MODEL_TABLETOP_Y = 0.54;
const CHARACTER_CLIP_IDS = ["idle", "attack", "defend", "skill", "hit", "down"] as const;

type CharacterClipId = (typeof CHARACTER_CLIP_IDS)[number];
type LoadedCharacterRuntime = {
  actions: Map<CharacterClipId, THREE.AnimationAction>;
  activeAction?: THREE.AnimationAction | undefined;
  activeClip?: CharacterClipId | undefined;
  isDead: boolean;
  lodTier: CharacterLodTier;
  mixer?: THREE.AnimationMixer | undefined;
  playerId: PlayerId;
  root: THREE.Group;
};

type CharacterLodTier = "lod0" | "lod1";

type OrganicSection = {
  offsetX?: number;
  offsetZ?: number;
  radiusX: number;
  radiusZ: number;
  twist?: number;
  y: number;
};

export function TableScene3D({
  directorCue,
  players,
  seatPositions,
  viewerPlayerId
}: TableScene3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const directorCueRef = useRef<BattlePresentationCue | undefined>(directorCue);
  const sceneKey = useMemo(
    () =>
      players
        .map((player) => (
          `${player.id}:${player.status}:${player.avatarUrl ?? ""}:${player.id === viewerPlayerId ? "self" : "other"}`
        ))
        .join("|"),
    [players, viewerPlayerId]
  );
  const seatKey = useMemo(
    () =>
      Object.entries(seatPositions)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([playerId, seat]) => `${playerId}:${seat.x}:${seat.y}:${seat.angle}`)
        .join("|"),
    [seatPositions]
  );

  useEffect(() => {
    directorCueRef.current = directorCue;
  }, [directorCue]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2("#07100f", 0.095);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    positionFirstPersonCamera(camera, seatPositions[viewerPlayerId ?? ""]);
    const baseCameraPosition = camera.position.clone();
    const baseCameraRotation = camera.rotation.clone();
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight(0xf8e7bd, 0x061112, 1.45);
    scene.add(ambient);

    const lantern = new THREE.PointLight(0xffc470, 3.1, 12, 1.7);
    lantern.position.set(0, 3.2, 1.2);
    lantern.castShadow = true;
    scene.add(lantern);

    const coldRim = new THREE.DirectionalLight(0x76d6ff, 1.25);
    coldRim.position.set(-5, 6, -5);
    scene.add(coldRim);

    const environment = createAbyssEnvironment();
    scene.add(environment);

    const table = createTableMesh();
    scene.add(table);

    const firstPersonRig = createFirstPersonRig();
    camera.add(firstPersonRig);

    const loader = new GLTFLoader();
    const loadedCharacters: LoadedCharacterRuntime[] = [];
    const characterLodTier = selectRuntimeCharacterLodTier();
    container.dataset.characterLod = characterLodTier;
    let disposed = false;

    players.forEach((player, index) => {
      const seat = seatPositions[player.id];
      if (!seat || player.id === viewerPlayerId) {
        return;
      }

      const profile = getCharacterByAvatarUrl(player.avatarUrl) ?? getCharacterBySeatIndex(index);
      const character = createCharacterMesh({
        color: profile.accent ?? CHARACTER_COLORS[index % CHARACTER_COLORS.length]!,
        isDead: player.status === "dead",
        name: player.name
      });
      const position = seatToScene(seat);
      const inward = new THREE.Vector3(-position.x, 0, -position.z).normalize();
      character.position.set(position.x + inward.x * 0.86, 0.05, position.z + inward.z * 0.86);
      character.lookAt(0, 0.46, 0);
      scene.add(character);

      loadCharacterAsset(loader, profile, characterLodTier, player.status === "dead", player.name, player.id)
        .then((runtime) => {
          if (disposed) {
            disposeObjectTree(runtime.root);
            runtime.mixer?.stopAllAction();
            return;
          }
          const asset = runtime.root;
          asset.position.copy(character.position);
          asset.position.y = MODEL_TABLETOP_Y;
          asset.quaternion.copy(character.quaternion);
          scene.remove(character);
          disposeObjectTree(character);
          scene.add(asset);
          loadedCharacters.push(runtime);
        })
        .catch(() => {
          // Keep the procedural fallback when a public GLB cannot be loaded.
        });
    });

    const startedAt = performance.now();
    let previousFrameAt = startedAt;
    let frameId = 0;

    const resize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    const render = () => {
      const now = performance.now();
      const deltaSeconds = Math.min((now - previousFrameAt) / 1000, 0.05);
      previousFrameAt = now;
      const time = (now - startedAt) / 1000;
      applyDirectorCameraPulse(
        camera,
        baseCameraPosition,
        baseCameraRotation,
        directorCueRef.current,
        time
      );
      table.rotation.y = Math.sin(time * 0.18) * 0.01;
      lantern.intensity = 2.75 + Math.sin(time * 2.1) * 0.28;
      const breath = Math.sin(time * 1.08);
      const pulse = Math.sin(time * 2.16 + 0.4);
      loadedCharacters.forEach((runtime) => {
        playCharacterClip(runtime, clipForRuntimeCharacter(runtime, directorCueRef.current));
        runtime.mixer?.update(deltaSeconds);
      });
      firstPersonRig.position.x = Math.sin(time * 0.38) * 0.006;
      firstPersonRig.position.y = breath * 0.016 + pulse * 0.003;
      firstPersonRig.position.z = Math.sin(time * 0.46 + 1.2) * 0.008;
      firstPersonRig.rotation.x = breath * 0.006;
      firstPersonRig.rotation.y = Math.sin(time * 0.34 + 0.7) * 0.004;
      firstPersonRig.rotation.z = Math.sin(time * 0.5) * 0.004;
      scene.traverse((object) => {
        if (object.userData.kind === "character") {
          object.position.y = 0.05 + Math.sin(time * 1.45 + object.userData.phase) * 0.026;
        }
        if (object.userData.kind === "crystal") {
          object.rotation.y += 0.004;
          object.scale.setScalar(1 + Math.sin(time * 1.8 + object.userData.phase) * 0.025);
        }
        if (object.userData.kind === "lantern") {
          object.rotation.y = Math.sin(time * 0.9 + object.userData.phase) * 0.12;
        }
        if (object.userData.kind === "scannerNeedle") {
          object.rotation.y = Math.sin(time * 1.1) * 0.36;
        }
        if (object.userData.kind === "lampBeam") {
          object.scale.z = 1 + Math.sin(time * 1.9) * 0.08;
          const material = (object as THREE.Mesh).material;
          if (material instanceof THREE.MeshBasicMaterial) {
            material.opacity = 0.12 + Math.sin(time * 2.4) * 0.035;
          }
        }
        if (object.userData.kind === "firstPersonArm") {
          object.position.y = object.userData.basePositionY + Math.sin(time * 0.82 + object.userData.phase) * 0.006;
          object.rotation.z = object.userData.baseRotationZ + Math.sin(time * 0.66 + object.userData.phase) * 0.012;
        }
        if (object.userData.kind === "firstPersonHand") {
          object.position.y = object.userData.basePositionY + Math.sin(time * 0.92 + object.userData.phase) * 0.004;
          object.position.z = object.userData.basePositionZ + Math.sin(time * 0.62 + object.userData.phase) * 0.006;
          object.rotation.z = object.userData.baseRotationZ + Math.sin(time * 0.72 + object.userData.phase) * 0.01;
        }
        if (object.userData.kind === "firstPersonFinger") {
          object.rotation.x = object.userData.baseRotationX + Math.sin(time * 1.12 + object.userData.phase) * 0.028;
          object.position.y = object.userData.basePositionY + Math.sin(time * 1.34 + object.userData.phase) * 0.003;
        }
        if (object.userData.kind === "firstPersonLeg") {
          object.position.y = object.userData.basePositionY + Math.sin(time * 0.74 + object.userData.phase) * 0.004;
        }
      });
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      disposed = true;
      observer.disconnect();
      window.cancelAnimationFrame(frameId);
      loadedCharacters.forEach((runtime) => runtime.mixer?.stopAllAction());
      container.removeChild(renderer.domElement);
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material;
        if (Array.isArray(material)) {
          material.forEach(disposeMaterial);
        } else {
          disposeMaterial(material);
        }
      });
      renderer.dispose();
    };
  }, [sceneKey, seatKey, viewerPlayerId, seatPositions]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="table-scene-3d table-scene-3d-first-person"
      data-director-beat={directorCue?.beat ?? "idle"}
      data-director-camera-cue={directorCue?.camera ?? "none"}
      data-director-hit-stop-ms={directorCue?.hitStopMs ?? 0}
      data-director-intensity={directorCue?.intensity ?? 0}
    />
  );
}

function applyDirectorCameraPulse(
  camera: THREE.PerspectiveCamera,
  basePosition: THREE.Vector3,
  baseRotation: THREE.Euler,
  cue: BattlePresentationCue | undefined,
  time: number
): void {
  camera.position.copy(basePosition);
  camera.rotation.copy(baseRotation);

  if (!cue || cue.camera === "none") {
    return;
  }

  const intensity = THREE.MathUtils.clamp(cue.intensity, 0, 1);
  const hitStopPush = Math.min(0.08, cue.hitStopMs / 1800) * intensity;
  if (cue.camera === "shake-light" || cue.camera === "shake-medium") {
    const shake = cue.camera === "shake-medium" ? 0.044 : 0.026;
    camera.position.x += Math.sin(time * 66) * shake * intensity;
    camera.position.y += Math.sin(time * 72 + 0.7) * shake * 0.42 * intensity;
    camera.position.z -= hitStopPush;
    return;
  }

  if (cue.camera === "nudge") {
    camera.position.x += Math.sin(time * 10) * 0.028 * intensity;
    camera.position.z -= 0.035 * intensity + hitStopPush;
    camera.rotation.z += Math.sin(time * 12) * 0.006 * intensity;
    return;
  }

  if (cue.camera === "zoom-source" || cue.camera === "zoom-target") {
    camera.position.z -= (cue.camera === "zoom-target" ? 0.13 : 0.09) * intensity + hitStopPush;
    camera.position.y += (cue.camera === "zoom-target" ? -0.018 : 0.014) * intensity;
  }
}

function positionFirstPersonCamera(
  camera: THREE.PerspectiveCamera,
  viewerSeat: SeatPosition | undefined
): void {
  if (!viewerSeat) {
    camera.position.set(0, 4.5, 6.2);
    camera.lookAt(0, 0.42, 0);
    return;
  }

  const seat = seatToScene(viewerSeat);
  const inward = new THREE.Vector3(-seat.x, 0, -seat.z).normalize();
  camera.position.set(
    seat.x + inward.x * 0.72,
    1.68,
    seat.z + inward.z * 0.72
  );
  camera.lookAt(0, 0.54, 0);
}

function seatToScene(seat: SeatPosition): { x: number; z: number } {
  return {
    x: THREE.MathUtils.clamp((seat.x - 50) * 0.088, -4.15, 4.15),
    z: THREE.MathUtils.clamp((seat.y - 50) * 0.066, -2.72, 2.72)
  };
}

function createAbyssEnvironment(): THREE.Group {
  const group = new THREE.Group();
  group.name = "abyss environment";

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(8.5, 128),
    new THREE.MeshStandardMaterial({
      color: "#1a261d",
      roughness: 0.96,
      metalness: 0.01
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.28;
  ground.receiveShadow = true;
  group.add(ground);

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(7.6, 6.2, 6.5, 96, 1, true),
    new THREE.MeshStandardMaterial({
      color: "#10211f",
      roughness: 0.92,
      metalness: 0.02,
      side: THREE.BackSide
    })
  );
  shaft.position.y = 2.45;
  group.add(shaft);

  const abyssGlow = new THREE.Mesh(
    new THREE.TorusGeometry(3.3, 0.035, 10, 140),
    new THREE.MeshStandardMaterial({
      color: "#88f7db",
      emissive: "#0f766e",
      emissiveIntensity: 0.82,
      roughness: 0.5,
      transparent: true,
      opacity: 0.86
    })
  );
  abyssGlow.rotation.x = Math.PI / 2;
  abyssGlow.position.y = -0.18;
  group.add(abyssGlow);

  for (let index = 0; index < 18; index += 1) {
    const angle = (index / 18) * Math.PI * 2;
    const radius = 4.8 + (index % 3) * 0.55;
    const crystal = new THREE.Mesh(
      new THREE.ConeGeometry(0.09 + (index % 4) * 0.02, 0.62 + (index % 5) * 0.12, 5),
      new THREE.MeshStandardMaterial({
        color: index % 2 ? "#7dd3fc" : "#f5d38b",
        emissive: index % 2 ? "#164e63" : "#854d0e",
        emissiveIntensity: 0.55,
        roughness: 0.28,
        metalness: 0.12
      })
    );
    crystal.userData.kind = "crystal";
    crystal.userData.phase = index * 0.39;
    crystal.position.set(Math.cos(angle) * radius, 0.14, Math.sin(angle) * radius * 0.72);
    crystal.rotation.z = Math.sin(angle) * 0.42;
    crystal.castShadow = true;
    group.add(crystal);
  }

  for (let index = 0; index < 5; index += 1) {
    const angle = (index / 5) * Math.PI * 2 + 0.3;
    const lantern = createHangingLantern(index);
    lantern.userData.kind = "lantern";
    lantern.userData.phase = index * 0.7;
    lantern.position.set(Math.cos(angle) * 3.9, 2.2 + (index % 2) * 0.45, Math.sin(angle) * 2.3);
    group.add(lantern);
  }

  return group;
}

function createHangingLantern(index: number): THREE.Group {
  const group = new THREE.Group();
  const chain = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 0.9, 8),
    new THREE.MeshStandardMaterial({ color: "#2f3428", roughness: 0.5 })
  );
  chain.position.y = 0.42;
  group.add(chain);

  const frame = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.17, 0.24, 6),
    new THREE.MeshStandardMaterial({
      color: "#2d2418",
      roughness: 0.48,
      metalness: 0.22
    })
  );
  frame.castShadow = true;
  group.add(frame);

  const light = new THREE.PointLight(index % 2 ? 0x7dd3fc : 0xffc470, 0.65, 2.8, 2);
  light.position.y = -0.02;
  group.add(light);

  return group;
}

function createTableMesh(): THREE.Group {
  const group = new THREE.Group();
  group.name = "relic table";

  const tabletop = new THREE.Mesh(
    new THREE.CylinderGeometry(3.25, 3.48, 0.42, 128),
    new THREE.MeshStandardMaterial({
      color: "#4b2f1d",
      roughness: 0.62,
      metalness: 0.08
    })
  );
  tabletop.scale.set(1.42, 1, 0.78);
  tabletop.position.y = 0.12;
  tabletop.castShadow = true;
  tabletop.receiveShadow = true;
  group.add(tabletop);

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(2.82, 2.92, 0.12, 128),
    new THREE.MeshStandardMaterial({
      color: "#12382f",
      roughness: 0.9,
      metalness: 0.02
    })
  );
  felt.scale.set(1.42, 1, 0.78);
  felt.position.y = 0.43;
  felt.receiveShadow = true;
  group.add(felt);

  const map = new THREE.Mesh(
    new THREE.PlaneGeometry(3.25, 1.78, 1, 1),
    new THREE.MeshStandardMaterial({
      color: "#d8c08a",
      roughness: 0.82,
      metalness: 0.01,
      transparent: true,
      opacity: 0.52
    })
  );
  map.rotation.x = -Math.PI / 2;
  map.position.set(0, 0.505, 0);
  group.add(map);
  group.add(createTableEtchings());

  const innerGlow = new THREE.Mesh(
    new THREE.TorusGeometry(1.28, 0.025, 10, 96),
    new THREE.MeshStandardMaterial({
      color: "#88f7db",
      emissive: "#0f766e",
      emissiveIntensity: 0.65,
      roughness: 0.38
    })
  );
  innerGlow.scale.set(1.45, 0.72, 0.52);
  innerGlow.position.y = 0.515;
  innerGlow.rotation.x = Math.PI / 2;
  group.add(innerGlow);

  const railHighlight = new THREE.Mesh(
    new THREE.TorusGeometry(3.12, 0.05, 10, 128),
    new THREE.MeshStandardMaterial({
      color: "#c9a24f",
      roughness: 0.52,
      metalness: 0.16,
      transparent: true,
      opacity: 0.88
    })
  );
  railHighlight.scale.set(1.43, 0.78, 0.78);
  railHighlight.position.y = 0.49;
  railHighlight.rotation.x = Math.PI / 2;
  group.add(railHighlight);

  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.17, 0.86, 16),
      new THREE.MeshStandardMaterial({
        color: "#2f1e14",
        roughness: 0.8
      })
    );
    leg.position.set(Math.cos(angle) * 3.9, -0.46, Math.sin(angle) * 2.1);
    leg.castShadow = true;
    group.add(leg);
  }

  return group;
}

function createTableEtchings(): THREE.Group {
  const group = new THREE.Group();
  group.name = "table etchings";

  const routeMaterial = new THREE.LineBasicMaterial({
    color: "#f8edd2",
    transparent: true,
    opacity: 0.38
  });
  const dangerRouteMaterial = new THREE.LineBasicMaterial({
    color: "#e76f2f",
    transparent: true,
    opacity: 0.42
  });

  [
    {
      material: routeMaterial,
      points: [
        [-1.42, -0.48],
        [-0.94, -0.18],
        [-0.36, -0.34],
        [0.2, 0.08],
        [0.82, -0.04],
        [1.28, 0.34]
      ]
    },
    {
      material: dangerRouteMaterial,
      points: [
        [-1.18, 0.38],
        [-0.56, 0.18],
        [0.08, 0.32],
        [0.66, 0.1],
        [1.18, -0.32]
      ]
    }
  ].forEach(({ material, points }) => {
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(
        points.map(([x, z]) => new THREE.Vector3(x, 0.575, z))
      ),
      material
    );
    group.add(line);
  });

  [
    { radius: 0.38, opacity: 0.26 },
    { radius: 0.58, opacity: 0.18 },
    { radius: 0.82, opacity: 0.13 }
  ].forEach(({ radius, opacity }) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.006, 8, 72),
      new THREE.MeshBasicMaterial({
        color: "#88f7db",
        transparent: true,
        opacity
      })
    );
    ring.scale.set(1.55, 0.72, 1);
    ring.position.y = 0.58;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  });

  const needleMaterial = new THREE.MeshBasicMaterial({
    color: "#c9a24f",
    transparent: true,
    opacity: 0.72
  });
  [0, Math.PI].forEach((angle) => {
    const needle = new THREE.Mesh(new THREE.CircleGeometry(0.14, 3), needleMaterial);
    needle.position.y = 0.585;
    needle.rotation.set(-Math.PI / 2, 0, angle);
    needle.scale.set(0.62, 1.35, 1);
    group.add(needle);
  });

  const markerMaterial = new THREE.MeshStandardMaterial({
    color: "#88f7db",
    emissive: "#0f766e",
    emissiveIntensity: 0.5,
    roughness: 0.34,
    metalness: 0.18
  });
  const markerPositions: Array<[number, number]> = [
    [-1.42, -0.48],
    [-0.36, -0.34],
    [0.82, -0.04],
    [1.18, -0.32]
  ];

  markerPositions.forEach(([x, z], index) => {
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.018, 7), markerMaterial);
    marker.position.set(x, 0.59 + index * 0.001, z);
    marker.castShadow = true;
    group.add(marker);
  });

  return group;
}

function createCharacterMesh({
  color,
  isDead,
  name
}: {
  color: string;
  isDead: boolean;
  name: string;
}): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  group.userData.kind = "character";
  group.userData.phase = stablePhase(name);

  const fabricTexture = createProceduralTexture("fabric");
  const leatherTexture = createProceduralTexture("leather");
  const skinTexture = createProceduralTexture("skin");

  const coatMaterial = new THREE.MeshStandardMaterial({
    color: isDead ? "#66717a" : color,
    map: fabricTexture,
    bumpMap: fabricTexture,
    bumpScale: 0.018,
    roughness: 0.66,
    metalness: 0.04
  });
  const leatherMaterial = new THREE.MeshStandardMaterial({
    color: isDead ? "#4b5563" : "#2b2119",
    map: leatherTexture,
    bumpMap: leatherTexture,
    bumpScale: 0.024,
    roughness: 0.78,
    metalness: 0.06
  });
  const clothMaterial = new THREE.MeshStandardMaterial({
    color: isDead ? "#9aa4af" : "#e8ddbd",
    map: fabricTexture,
    bumpMap: fabricTexture,
    bumpScale: 0.012,
    roughness: 0.88
  });
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: isDead ? "#cbd5e1" : "#e7b887",
    map: skinTexture,
    bumpMap: skinTexture,
    bumpScale: 0.01,
    roughness: 0.72
  });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: "#9ee7ff",
    emissive: "#164e63",
    emissiveIntensity: isDead ? 0.05 : 0.36,
    roughness: 0.16,
    metalness: 0.08
  });
  const relicMaterial = new THREE.MeshStandardMaterial({
    color: isDead ? "#94a3b8" : "#f5d38b",
    emissive: isDead ? "#1f2937" : "#854d0e",
    emissiveIntensity: isDead ? 0.08 : 0.42,
    roughness: 0.34,
    metalness: 0.22
  });
  const ropeMaterial = new THREE.MeshStandardMaterial({
    color: isDead ? "#64748b" : "#a77945",
    roughness: 0.86,
    metalness: 0.02
  });
  const shadowSkinMaterial = new THREE.MeshStandardMaterial({
    color: isDead ? "#7f8ea3" : "#8d5842",
    roughness: 0.82,
    transparent: true,
    opacity: 0.72
  });
  const inkMaterial = new THREE.MeshStandardMaterial({
    color: isDead ? "#1f2937" : "#21130f",
    roughness: 0.7,
    metalness: 0.02
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: isDead ? "#94a3b8" : "#f8edd2",
    emissive: isDead ? "#111827" : "#5f3f16",
    emissiveIntensity: isDead ? 0.05 : 0.18,
    roughness: 0.42,
    metalness: 0.2
  });

  const chair = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.58, 0.18, 32),
    new THREE.MeshStandardMaterial({
      color: "#4a3726",
      roughness: 0.64,
      metalness: 0.06
    })
  );
  chair.scale.set(1, 1, 0.74);
  chair.position.set(0, 0.08, 0.34);
  chair.castShadow = true;
  group.add(chair);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.66, 8, 20), coatMaterial);
  torso.position.y = 0.78;
  torso.castShadow = true;
  group.add(torso);

  const shoulderLine = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.09, 0.18), coatMaterial);
  shoulderLine.position.set(0, 1.03, -0.03);
  shoulderLine.castShadow = true;
  group.add(shoulderLine);

  [-1, 1].forEach((side) => {
    const shoulderPad = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 10), trimMaterial);
    shoulderPad.position.set(side * 0.36, 1.03, -0.055);
    shoulderPad.scale.set(1.12, 0.42, 0.7);
    shoulderPad.rotation.z = side * 0.18;
    shoulderPad.castShadow = true;
    group.add(shoulderPad);

    const shoulderGlyph = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.01), relicMaterial);
    shoulderGlyph.position.set(side * 0.36, 1.105, -0.156);
    shoulderGlyph.rotation.set(-0.2, 0, side * 0.42);
    group.add(shoulderGlyph);
  });

  const coatSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.46, 0.26, 24), coatMaterial);
  coatSkirt.position.set(0, 0.43, -0.02);
  coatSkirt.scale.set(1, 1, 0.78);
  coatSkirt.castShadow = true;
  group.add(coatSkirt);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.08, 0.12), leatherMaterial);
  belt.position.set(0, 0.62, -0.24);
  group.add(belt);

  for (let index = 0; index < 7; index += 1) {
    const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), trimMaterial);
    rivet.position.set(-0.27 + index * 0.09, 0.652, -0.305);
    rivet.scale.set(1, 0.64, 0.7);
    group.add(rivet);
  }

  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.46, 0.14), leatherMaterial);
  backpack.position.set(0, 0.86, 0.22);
  backpack.castShadow = true;
  group.add(backpack);

  const backpackFlap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.13, 0.026), clothMaterial);
  backpackFlap.position.set(0, 0.99, 0.15);
  backpackFlap.rotation.x = -0.08;
  group.add(backpackFlap);

  [-1, 1].forEach((side) => {
    const sidePocket = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.045), leatherMaterial);
    sidePocket.position.set(side * 0.235, 0.78, 0.18);
    sidePocket.rotation.z = side * 0.06;
    group.add(sidePocket);

    const packTie = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.42, 0.018), ropeMaterial);
    packTie.position.set(side * 0.12, 0.86, 0.145);
    packTie.rotation.z = side * 0.08;
    group.add(packTie);
  });

  [-0.18, 0.18].forEach((x) => {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.54, 0.045), leatherMaterial);
    strap.position.set(x, 0.82, -0.285);
    strap.rotation.z = x > 0 ? -0.12 : 0.12;
    group.add(strap);
  });

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.105, 0.16, 18), skinMaterial);
  neck.position.y = 1.1;
  neck.castShadow = true;
  group.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 30, 24), skinMaterial);
  head.position.y = 1.3;
  head.castShadow = true;
  group.add(head);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.085, 0.13), skinMaterial);
  jaw.position.set(0, 1.18, -0.185);
  jaw.rotation.x = -0.18;
  jaw.castShadow = true;
  group.add(jaw);

  const mouthShadow = new THREE.Mesh(new THREE.BoxGeometry(0.092, 0.01, 0.012), shadowSkinMaterial);
  mouthShadow.position.set(0, 1.225, -0.255);
  mouthShadow.rotation.x = -0.1;
  group.add(mouthShadow);

  const noseBridge = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.085, 0.045), skinMaterial);
  noseBridge.position.set(0, 1.31, -0.27);
  noseBridge.rotation.x = -0.08;
  group.add(noseBridge);

  const noseShadow = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.055, 0.008), shadowSkinMaterial);
  noseShadow.position.set(0.018, 1.29, -0.296);
  noseShadow.rotation.x = -0.08;
  group.add(noseShadow);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.31, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), leatherMaterial);
  helmet.position.y = 1.42;
  helmet.castShadow = true;
  group.add(helmet);

  const helmetCrest = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.2, 0.035), trimMaterial);
  helmetCrest.position.set(0, 1.58, -0.03);
  helmetCrest.rotation.x = -0.18;
  helmetCrest.castShadow = true;
  group.add(helmetCrest);

  const helmetStrap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.035, 0.035), leatherMaterial);
  helmetStrap.position.set(0, 1.22, -0.255);
  helmetStrap.rotation.x = -0.05;
  group.add(helmetStrap);

  const chinStrap = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.18, 0.022), leatherMaterial);
  chinStrap.position.set(0.15, 1.19, -0.205);
  chinStrap.rotation.set(-0.18, 0.08, -0.16);
  group.add(chinStrap);

  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), glassMaterial);
  lamp.position.set(0, 1.62, -0.16);
  group.add(lamp);

  const lampRim = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.006, 8, 20), trimMaterial);
  lampRim.position.set(0, 1.62, -0.162);
  lampRim.rotation.x = Math.PI / 2;
  group.add(lampRim);

  const chestRelic = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), relicMaterial);
  chestRelic.position.set(0, 0.86, -0.32);
  chestRelic.rotation.y = Math.PI / 4;
  chestRelic.castShadow = true;
  group.add(chestRelic);

  const chestRelicHalo = new THREE.Mesh(new THREE.TorusGeometry(0.118, 0.006, 8, 28), trimMaterial);
  chestRelicHalo.position.set(0, 0.86, -0.322);
  chestRelicHalo.rotation.x = Math.PI / 2;
  group.add(chestRelicHalo);

  const ropeCoil = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.022, 8, 28), ropeMaterial);
  ropeCoil.position.set(-0.31, 0.86, 0.28);
  ropeCoil.rotation.set(Math.PI / 2, 0.2, 0);
  group.add(ropeCoil);

  const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.52, 18), clothMaterial);
  bedroll.position.set(0, 1.11, 0.32);
  bedroll.rotation.z = Math.PI / 2;
  bedroll.castShadow = true;
  group.add(bedroll);

  [-0.105, 0.105].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), inkMaterial);
    eye.position.set(x, 1.315, -0.287);
    eye.scale.set(1, 0.62, 0.36);
    group.add(eye);

    const goggle = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), glassMaterial);
    goggle.position.set(x, 1.32, -0.245);
    group.add(goggle);

    const goggleRim = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.007, 8, 22), leatherMaterial);
    goggleRim.position.set(x, 1.32, -0.255);
    goggleRim.rotation.x = Math.PI / 2;
    group.add(goggleRim);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.012, 0.014), inkMaterial);
    brow.position.set(x, 1.375, -0.272);
    brow.rotation.set(-0.06, 0, x > 0 ? -0.12 : 0.12);
    group.add(brow);
  });

  const goggleBridge = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.018, 0.016), leatherMaterial);
  goggleBridge.position.set(0, 1.32, -0.265);
  group.add(goggleBridge);

  addStitchRow(group, {
    count: 7,
    material: ropeMaterial,
    origin: new THREE.Vector3(-0.24, 0.91, -0.318),
    spacing: new THREE.Vector3(0.08, -0.012, 0),
    rotation: new THREE.Euler(-0.08, 0, 0.04),
    size: new THREE.Vector3(0.036, 0.01, 0.01)
  });

  [-1, 1].forEach((side) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.062, 0.52, 14), clothMaterial);
    arm.position.set(side * 0.35, 0.82, -0.04);
    arm.rotation.z = side * 0.42;
    arm.castShadow = true;
    group.add(arm);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.052, 0.3, 14), clothMaterial);
    forearm.position.set(side * 0.45, 0.68, -0.16);
    forearm.rotation.set(0.38, 0, side * 0.68);
    forearm.castShadow = true;
    group.add(forearm);

    const glove = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.065, 0.08), leatherMaterial);
    glove.position.set(side * 0.46, 0.6, -0.06);
    glove.rotation.z = side * 0.18;
    glove.castShadow = true;
    group.add(glove);

    for (let index = 0; index < 4; index += 1) {
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.052 - index * 0.004, 4, 6), leatherMaterial);
      finger.position.set(side * (0.43 + index * 0.016), 0.57, -0.105);
      finger.rotation.set(Math.PI / 2.2, side * 0.05, side * 0.18);
      finger.castShadow = true;
      group.add(finger);
    }

    const wristWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.048, 0.026, 14), ropeMaterial);
    wristWrap.position.set(side * 0.43, 0.625, -0.105);
    wristWrap.rotation.set(Math.PI / 2, 0, side * 0.18);
    group.add(wristWrap);

    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), leatherMaterial);
    knee.position.set(side * 0.14, 0.38, -0.08);
    knee.scale.set(0.9, 0.55, 0.72);
    group.add(knee);

    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.42, 14), leatherMaterial);
    leg.position.set(side * 0.14, 0.27, -0.02);
    leg.rotation.z = side * 0.12;
    leg.castShadow = true;
    group.add(leg);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.075, 0.2), leatherMaterial);
    boot.position.set(side * 0.14, 0.06, -0.12);
    boot.rotation.z = side * 0.08;
    boot.castShadow = true;
    group.add(boot);
  });

  const aura = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.018, 8, 38),
    new THREE.MeshStandardMaterial({
      color: isDead ? "#94a3b8" : "#88f7db",
      emissive: isDead ? "#1f2937" : "#0f766e",
      emissiveIntensity: isDead ? 0.1 : 0.5
    })
  );
  aura.position.y = 0.05;
  aura.rotation.x = Math.PI / 2;
  group.add(aura);

  group.scale.setScalar(0.83);
  return group;
}

function createFirstPersonRig(): THREE.Group {
  const group = new THREE.Group();
  group.position.set(0, -0.14, -0.6);
  const fabricTexture = createProceduralTexture("fabric");
  const leatherTexture = createProceduralTexture("leather");
  const skinTexture = createProceduralTexture("skin");

  const sleeveMaterial = new THREE.MeshStandardMaterial({
    color: "#5a3d2e",
    map: fabricTexture,
    bumpMap: fabricTexture,
    bumpScale: 0.016,
    roughness: 0.86,
    metalness: 0.02,
    emissive: "#21140d",
    emissiveIntensity: 0.1
  });
  const sleeveFoldMaterial = new THREE.MeshStandardMaterial({
    color: "#5a3b2a",
    map: fabricTexture,
    bumpMap: fabricTexture,
    bumpScale: 0.012,
    roughness: 0.9,
    metalness: 0.01
  });
  const gloveMaterial = new THREE.MeshStandardMaterial({
    color: "#8a5c3d",
    map: leatherTexture,
    bumpMap: leatherTexture,
    bumpScale: 0.02,
    roughness: 0.64,
    metalness: 0.04
  });
  const gloveHighlightMaterial = new THREE.MeshStandardMaterial({
    color: "#d0a36f",
    map: leatherTexture,
    bumpMap: leatherTexture,
    bumpScale: 0.012,
    roughness: 0.62,
    metalness: 0.03
  });
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: "#b98567",
    map: skinTexture,
    bumpMap: skinTexture,
    bumpScale: 0.009,
    roughness: 0.68,
    metalness: 0.01
  });
  const skinShadeMaterial = new THREE.MeshStandardMaterial({
    color: "#7f4d3d",
    roughness: 0.82,
    metalness: 0.01,
    transparent: true,
    opacity: 0.74
  });
  const nailMaterial = new THREE.MeshStandardMaterial({
    color: "#efd2ba",
    roughness: 0.5,
    metalness: 0.01
  });
  const stitchMaterial = new THREE.MeshStandardMaterial({
    color: "#e6c693",
    roughness: 0.82,
    metalness: 0.01
  });
  const lampMaterial = new THREE.MeshStandardMaterial({
    color: "#ffc76a",
    emissive: "#d97706",
    emissiveIntensity: 0.9,
    roughness: 0.3
  });
  const brassMaterial = new THREE.MeshStandardMaterial({
    color: "#c9a24f",
    roughness: 0.42,
    metalness: 0.35
  });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: "#b9f6e7",
    emissive: "#0f766e",
    emissiveIntensity: 0.22,
    roughness: 0.08,
    metalness: 0.02,
    transparent: true,
    opacity: 0.46
  });

  group.add(createFirstPersonBody({
    brassMaterial,
    gearMaterial: gloveMaterial,
    sleeveFoldMaterial,
    sleeveMaterial
  }));
  group.add(createFirstPersonLowerBody({
    brassMaterial,
    gearMaterial: gloveMaterial,
    sleeveFoldMaterial,
    sleeveMaterial
  }));
  group.add(createFirstPersonContactShadows());

  [-1, 1].forEach((side) => {
    group.add(createFirstPersonArm({
      brassMaterial,
      gloveHighlightMaterial,
      gloveMaterial,
      nailMaterial,
      side,
      skinMaterial,
      skinShadeMaterial,
      sleeveFoldMaterial,
      sleeveMaterial,
      stitchMaterial
    }));
    group.add(createFirstPersonRestingHand({
      brassMaterial,
      gloveHighlightMaterial,
      gloveMaterial,
      nailMaterial,
      side,
      skinMaterial,
      skinShadeMaterial,
      stitchMaterial
    }));
  });

  const compassGroup = new THREE.Group();
  compassGroup.position.set(0.02, -0.53, -0.46);
  compassGroup.rotation.x = Math.PI / 2;

  const compass = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.035, 32), brassMaterial);
  compassGroup.add(compass);

  const compassGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.012, 32), glassMaterial);
  compassGlass.position.y = 0.024;
  compassGroup.add(compassGlass);

  const compassNeedle = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.018, 0.22), lampMaterial);
  compassNeedle.position.y = 0.037;
  compassNeedle.userData.kind = "scannerNeedle";
  compassGroup.add(compassNeedle);

  const compassTickMaterial = new THREE.MeshBasicMaterial({
    color: "#f8edd2",
    transparent: true,
    opacity: 0.78
  });
  for (let index = 0; index < 8; index += 1) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, index % 2 ? 0.035 : 0.055), compassTickMaterial);
    tick.position.set(Math.sin((index / 8) * Math.PI * 2) * 0.112, 0.041, Math.cos((index / 8) * Math.PI * 2) * 0.112);
    tick.rotation.y = (index / 8) * Math.PI * 2;
    compassGroup.add(tick);
  }
  group.add(compassGroup);

  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 12), lampMaterial);
  lamp.position.set(-0.28, -0.44, -0.5);
  group.add(lamp);

  const lampBeam = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 0.9, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: "#ffc76a",
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  lampBeam.position.set(-0.28, -0.44, -0.9);
  lampBeam.rotation.x = -Math.PI / 2;
  lampBeam.userData.kind = "lampBeam";
  group.add(lampBeam);

  const wristMap = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.012, 0.2),
    new THREE.MeshStandardMaterial({
      color: "#d8c08a",
      roughness: 0.78,
      metalness: 0.01
    })
  );
  wristMap.position.set(0.25, -0.55, -0.43);
  wristMap.rotation.set(0.2, -0.32, -0.08);
  group.add(wristMap);

  const light = new THREE.PointLight(0xffc470, 0.9, 2.6, 2);
  light.position.copy(lamp.position);
  group.add(light);

  const handFill = new THREE.PointLight(0xffd9aa, 0.58, 1.4, 2);
  handFill.position.set(0, -0.22, -0.42);
  group.add(handFill);

  const tableWarmth = new THREE.PointLight(0xffc08a, 0.18, 1.6, 2);
  tableWarmth.position.set(0, -0.34, -0.88);
  group.add(tableWarmth);

  enableFirstPersonShadows(group);
  return group;
}

function createFirstPersonContactShadows(): THREE.Group {
  const shadows = new THREE.Group();
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: "#120b07",
    depthWrite: false,
    transparent: true,
    opacity: 0.26
  });

  [
    { x: -0.22, y: -0.36, z: -0.74, sx: 0.86, sy: 0.28, opacity: 0.34 },
    { x: 0.22, y: -0.36, z: -0.74, sx: 0.86, sy: 0.28, opacity: 0.34 },
    { x: -0.26, y: -0.53, z: -0.93, sx: 1.25, sy: 0.42, opacity: 0.18 },
    { x: 0.26, y: -0.53, z: -0.93, sx: 1.25, sy: 0.42, opacity: 0.18 },
    { x: 0, y: -0.74, z: -0.68, sx: 1.45, sy: 0.46, opacity: 0.18 }
  ].forEach(({ opacity, sx, sy, x, y, z }, index) => {
    const material = shadowMaterial.clone();
    material.opacity = opacity;
    const patch = new THREE.Mesh(new THREE.CircleGeometry(0.19, 32), material);
    patch.position.set(x, y, z);
    patch.scale.set(sx, sy, 1);
    patch.rotation.z = index % 2 ? -0.1 : 0.1;
    shadows.add(patch);
  });

  return shadows;
}

function enableFirstPersonShadows(group: THREE.Group): void {
  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    const material = mesh.material;
    if (
      material instanceof THREE.MeshBasicMaterial ||
      (Array.isArray(material) && material.some((item) => item instanceof THREE.MeshBasicMaterial))
    ) {
      return;
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
}

function createFirstPersonBody({
  brassMaterial,
  gearMaterial,
  sleeveFoldMaterial,
  sleeveMaterial
}: {
  brassMaterial: THREE.MeshStandardMaterial;
  gearMaterial: THREE.MeshStandardMaterial;
  sleeveFoldMaterial: THREE.MeshStandardMaterial;
  sleeveMaterial: THREE.MeshStandardMaterial;
}): THREE.Group {
  const body = new THREE.Group();

  [-1, 1].forEach((side) => {
    const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.24, 20), sleeveMaterial);
    shoulder.position.set(side * 0.25, -0.55, -0.43);
    shoulder.rotation.set(Math.PI / 2, side * 0.12, side * 0.34);
    body.add(shoulder);
  });

  const coatFront = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.09), sleeveMaterial);
  coatFront.position.set(0, -0.69, -0.5);
  coatFront.rotation.x = -0.18;
  body.add(coatFront);

  [-1, 1].forEach((side) => {
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.022, 0.08), sleeveFoldMaterial);
    lapel.position.set(side * 0.1, -0.6, -0.54);
    lapel.rotation.set(-0.22, side * 0.06, side * 0.42);
    body.add(lapel);

    const harness = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.22, 0.032), gearMaterial);
    harness.position.set(side * 0.12, -0.66, -0.585);
    harness.rotation.set(-0.2, side * 0.08, side * -0.34);
    body.add(harness);

    const harnessRing = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.004, 8, 20), brassMaterial);
    harnessRing.position.set(side * 0.145, -0.63, -0.612);
    harnessRing.rotation.set(Math.PI / 2, side * 0.15, side * 0.26);
    body.add(harnessRing);

    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.05), gearMaterial);
    pouch.position.set(side * 0.18, -0.76, -0.55);
    pouch.rotation.set(-0.12, side * 0.08, 0);
    body.add(pouch);
  });

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.04), gearMaterial);
  belt.position.set(0, -0.765, -0.545);
  belt.rotation.x = -0.12;
  body.add(belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.052, 0.018), brassMaterial);
  buckle.position.set(0, -0.762, -0.575);
  buckle.rotation.x = -0.08;
  body.add(buckle);

  const throatWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.045, 24), sleeveFoldMaterial);
  throatWrap.position.set(0, -0.54, -0.55);
  throatWrap.rotation.x = Math.PI / 2;
  body.add(throatWrap);

  const scarfFold = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, 0.044), sleeveFoldMaterial);
  scarfFold.position.set(0, -0.515, -0.58);
  scarfFold.rotation.x = -0.12;
  body.add(scarfFold);

  return body;
}

function createFirstPersonLowerBody({
  brassMaterial,
  gearMaterial,
  sleeveFoldMaterial,
  sleeveMaterial
}: {
  brassMaterial: THREE.MeshStandardMaterial;
  gearMaterial: THREE.MeshStandardMaterial;
  sleeveFoldMaterial: THREE.MeshStandardMaterial;
  sleeveMaterial: THREE.MeshStandardMaterial;
}): THREE.Group {
  const lowerBody = new THREE.Group();

  [-1, 1].forEach((side) => {
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.105, 0.48, 18), sleeveMaterial);
    thigh.position.set(side * 0.17, -0.86, -0.48);
    thigh.rotation.set(Math.PI / 2.15, side * 0.08, side * 0.16);
    thigh.userData.kind = "firstPersonLeg";
    thigh.userData.phase = side > 0 ? 0.8 : 0.2;
    thigh.userData.basePositionY = thigh.position.y;
    lowerBody.add(thigh);

    const kneePad = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 10), gearMaterial);
    kneePad.position.set(side * 0.22, -0.82, -0.73);
    kneePad.scale.set(0.88, 0.48, 0.72);
    kneePad.userData.kind = "firstPersonLeg";
    kneePad.userData.phase = side > 0 ? 1.1 : 0.4;
    kneePad.userData.basePositionY = kneePad.position.y;
    lowerBody.add(kneePad);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.072, 0.32, 16), sleeveFoldMaterial);
    shin.position.set(side * 0.25, -0.88, -0.86);
    shin.rotation.set(Math.PI / 2.35, side * 0.04, side * 0.1);
    shin.userData.kind = "firstPersonLeg";
    shin.userData.phase = side > 0 ? 1.4 : 0.6;
    shin.userData.basePositionY = shin.position.y;
    lowerBody.add(shin);

    const bootLip = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.062, 0.04, 16), gearMaterial);
    bootLip.position.set(side * 0.27, -0.81, -0.99);
    bootLip.rotation.set(Math.PI / 2, side * 0.04, side * 0.12);
    lowerBody.add(bootLip);

    const bootBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.012, 0.022), brassMaterial);
    bootBuckle.position.set(side * 0.21, -0.79, -0.98);
    bootBuckle.rotation.set(0.08, side * 0.14, side * 0.08);
    lowerBody.add(bootBuckle);
  });

  return lowerBody;
}

function createFirstPersonArm({
  brassMaterial,
  gloveHighlightMaterial,
  gloveMaterial,
  nailMaterial,
  side,
  skinMaterial,
  skinShadeMaterial,
  sleeveFoldMaterial,
  sleeveMaterial,
  stitchMaterial
}: {
  brassMaterial: THREE.MeshStandardMaterial;
  gloveHighlightMaterial: THREE.MeshStandardMaterial;
  gloveMaterial: THREE.MeshStandardMaterial;
  nailMaterial: THREE.MeshStandardMaterial;
  side: number;
  skinMaterial: THREE.MeshStandardMaterial;
  skinShadeMaterial: THREE.MeshStandardMaterial;
  sleeveFoldMaterial: THREE.MeshStandardMaterial;
  sleeveMaterial: THREE.MeshStandardMaterial;
  stitchMaterial: THREE.MeshStandardMaterial;
}): THREE.Group {
  const arm = new THREE.Group();
  arm.userData.kind = "firstPersonArm";
  arm.userData.phase = side > 0 ? 1.4 : 0.2;
  arm.userData.basePositionY = 0.042;
  arm.userData.baseRotationZ = side * -0.02;
  arm.position.set(side * -0.036, arm.userData.basePositionY, 0.026);
  arm.rotation.z = arm.userData.baseRotationZ;

  const upperSleeve = new THREE.Mesh(
    createOrganicTubeGeometry([
      { y: -0.22, radiusX: 0.034, radiusZ: 0.026, offsetX: side * -0.006, offsetZ: 0.004, twist: side * 0.1 },
      { y: -0.08, radiusX: 0.043, radiusZ: 0.032, offsetX: side * 0.004, offsetZ: -0.006, twist: side * 0.22 },
      { y: 0.09, radiusX: 0.05, radiusZ: 0.037, offsetX: side * 0.009, offsetZ: 0.004, twist: side * 0.34 },
      { y: 0.22, radiusX: 0.043, radiusZ: 0.033, offsetX: side * 0.004, offsetZ: 0.009, twist: side * 0.42 }
    ], 24),
    sleeveMaterial
  );
  upperSleeve.position.set(side * 0.42, -0.39, -0.3);
  upperSleeve.rotation.set(-0.82, 0, side * 0.34);
  arm.add(upperSleeve);

  const forearm = new THREE.Mesh(
    createOrganicTubeGeometry([
      { y: -0.26, radiusX: 0.027, radiusZ: 0.022, offsetX: side * -0.006, offsetZ: -0.01, twist: side * 0.05 },
      { y: -0.12, radiusX: 0.038, radiusZ: 0.028, offsetX: side * 0.002, offsetZ: -0.006, twist: side * 0.18 },
      { y: 0.08, radiusX: 0.043, radiusZ: 0.031, offsetX: side * 0.006, offsetZ: 0.004, twist: side * 0.34 },
      { y: 0.25, radiusX: 0.034, radiusZ: 0.026, offsetX: side * 0.002, offsetZ: 0.012, twist: side * 0.5 }
    ], 24),
    sleeveMaterial
  );
  forearm.position.set(side * 0.3, -0.43, -0.52);
  forearm.rotation.set(-1.02, side * 0.05, side * 0.16);
  arm.add(forearm);

  const elbowPatch = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.022, 0.082), sleeveFoldMaterial);
  elbowPatch.position.set(side * 0.36, -0.4, -0.4);
  elbowPatch.rotation.set(-0.74, side * 0.05, side * 0.18);
  arm.add(elbowPatch);

  for (let index = 0; index < 3; index += 1) {
    const fold = new THREE.Mesh(new THREE.BoxGeometry(0.13 - index * 0.014, 0.012, 0.01), sleeveFoldMaterial);
    fold.position.set(side * (0.27 + index * 0.014), -0.4 - index * 0.028, -0.46 - index * 0.048);
    fold.rotation.set(-1.02, side * 0.08, side * (0.22 - index * 0.05));
    arm.add(fold);
  }

  const cuff = new THREE.Mesh(
    createOrganicTubeGeometry([
      { y: -0.025, radiusX: 0.056, radiusZ: 0.038, offsetZ: -0.002 },
      { y: 0.025, radiusX: 0.05, radiusZ: 0.034, offsetZ: 0.004, twist: side * 0.18 }
    ], 22),
    sleeveFoldMaterial
  );
  cuff.position.set(side * 0.26, -0.45, -0.68);
  cuff.rotation.set(Math.PI / 2, side * 0.1, side * 0.08);
  arm.add(cuff);
  addStitchRow(arm, {
    count: 6,
    material: stitchMaterial,
    origin: new THREE.Vector3(side * 0.22, -0.426, -0.672),
    spacing: new THREE.Vector3(side * 0.015, -0.006, -0.006),
    rotation: new THREE.Euler(-0.08, side * 0.2, side * 0.36),
    size: new THREE.Vector3(0.018, 0.006, 0.006)
  });

  const wrist = new THREE.Mesh(
    createOrganicTubeGeometry([
      { y: -0.05, radiusX: 0.027, radiusZ: 0.021, offsetZ: -0.004, twist: side * 0.08 },
      { y: 0.01, radiusX: 0.033, radiusZ: 0.024, offsetX: side * 0.003 },
      { y: 0.055, radiusX: 0.029, radiusZ: 0.022, offsetZ: 0.004, twist: side * 0.2 }
    ], 18),
    skinMaterial
  );
  wrist.position.set(side * 0.26, -0.45, -0.71);
  wrist.rotation.set(Math.PI / 2, side * 0.1, side * 0.08);
  arm.add(wrist);

  const wristTendon = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.072), skinShadeMaterial);
  wristTendon.position.set(side * 0.247, -0.418, -0.715);
  wristTendon.rotation.set(0.08, side * 0.2, side * 0.18);
  arm.add(wristTendon);

  const strap = new THREE.Mesh(
    createOrganicTubeGeometry([
      { y: -0.014, radiusX: 0.055, radiusZ: 0.035 },
      { y: 0.014, radiusX: 0.05, radiusZ: 0.032, twist: side * 0.12 }
    ], 18),
    gloveMaterial
  );
  strap.position.set(side * 0.26, -0.45, -0.7);
  strap.rotation.set(Math.PI / 2, side * 0.1, side * 0.08);
  arm.add(strap);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.012, 0.022), brassMaterial);
  buckle.position.set(side * 0.212, -0.444, -0.69);
  buckle.rotation.set(0.08, side * 0.24, side * 0.12);
  arm.add(buckle);

  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.062, 0.132), gloveMaterial);
  palm.position.set(side * 0.25, -0.41, -0.81);
  palm.rotation.set(-0.16, side * 0.16, side * 0.08);
  arm.add(palm);

  const handBack = new THREE.Mesh(new THREE.SphereGeometry(0.073, 20, 12), skinMaterial);
  handBack.position.set(side * 0.25, -0.365, -0.815);
  handBack.scale.set(1.18, 0.38, 0.92);
  handBack.rotation.set(-0.18, side * 0.16, side * 0.08);
  arm.add(handBack);

  [
    { offset: -0.046, length: 0.064, angle: 0.16 },
    { offset: -0.012, length: 0.078, angle: 0.04 },
    { offset: 0.027, length: 0.062, angle: -0.12 }
  ].forEach(({ angle, length, offset }) => {
    const tendon = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.004, length), skinShadeMaterial);
    tendon.position.set(side * 0.25 + offset, -0.335, -0.83);
    tendon.rotation.set(-0.2, side * 0.08, side * angle);
    arm.add(tendon);
  });

  const palmPad = new THREE.Mesh(new THREE.BoxGeometry(0.126, 0.012, 0.07), gloveHighlightMaterial);
  palmPad.position.set(side * 0.25, -0.376, -0.825);
  palmPad.rotation.copy(palm.rotation);
  arm.add(palmPad);

  const handSeam = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.01, 0.096), stitchMaterial);
  handSeam.position.set(side * 0.25, -0.372, -0.82);
  handSeam.rotation.set(-0.12, side * 0.12, side * 0.04);
  arm.add(handSeam);

  [
    { offset: -0.045, length: 0.062, angle: 0.18 },
    { offset: 0.018, length: 0.076, angle: -0.12 },
    { offset: 0.058, length: 0.048, angle: 0.24 }
  ].forEach(({ angle, length, offset }) => {
    const crease = new THREE.Mesh(new THREE.BoxGeometry(length, 0.004, 0.004), gloveHighlightMaterial);
    crease.position.set(side * 0.25 + offset, -0.368, -0.79 - Math.abs(offset) * 0.25);
    crease.rotation.set(0.08, side * 0.08, side * angle);
    arm.add(crease);
  });

  for (let index = 0; index < 4; index += 1) {
    const nick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.004, 0.005), stitchMaterial);
    nick.position.set(side * (0.18 + index * 0.034), -0.37 - index * 0.003, -0.792 - index * 0.018);
    nick.rotation.set(0.12, side * 0.08, side * (0.24 - index * 0.08));
    arm.add(nick);
  }

  const fingerOffsets = [-0.058, -0.019, 0.019, 0.058];
  fingerOffsets.forEach((offset, index) => {
    const fingerLength = 0.102 - Math.abs(index - 1.5) * 0.012;
    const fingerRadius = 0.016 + (index === 1 ? 0.002 : 0);
    const finger = new THREE.Mesh(
      createOrganicTubeGeometry([
        { y: -fingerLength * 0.52, radiusX: fingerRadius * 0.78, radiusZ: fingerRadius * 0.62, offsetZ: -0.002 },
        { y: -fingerLength * 0.18, radiusX: fingerRadius * 1.02, radiusZ: fingerRadius * 0.74, offsetX: offset * 0.02, twist: offset * 1.6 },
        { y: fingerLength * 0.18, radiusX: fingerRadius * 0.9, radiusZ: fingerRadius * 0.68, offsetZ: 0.002, twist: offset * 2.2 },
        { y: fingerLength * 0.5, radiusX: fingerRadius * 0.56, radiusZ: fingerRadius * 0.5, offsetX: offset * -0.01 }
      ], 12),
      gloveMaterial
    );
    finger.position.set(side * 0.25 + offset, -0.411, -0.895 - index * 0.004);
    finger.rotation.set(Math.PI / 2 + 0.08, side * 0.08, offset * 1.8);
    finger.userData.kind = "firstPersonFinger";
    finger.userData.phase = (side > 0 ? 0.8 : 0.1) + index * 0.34;
    finger.userData.basePositionY = finger.position.y;
    finger.userData.baseRotationX = finger.rotation.x;
    arm.add(finger);

    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), skinMaterial);
    tip.position.set(side * 0.25 + offset, -0.411, -0.948 - index * 0.004);
    tip.scale.set(0.88, 0.64, 0.72);
    arm.add(tip);

    const fingerCrease = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.004, 0.005), skinShadeMaterial);
    fingerCrease.position.set(side * 0.25 + offset, -0.391, -0.934 - index * 0.004);
    fingerCrease.rotation.set(0.18, side * 0.08, offset * 1.4);
    arm.add(fingerCrease);

    const nail = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.004, 0.012), nailMaterial);
    nail.position.set(side * 0.25 + offset, -0.386, -0.952 - index * 0.004);
    nail.rotation.set(0.15, side * 0.08, offset * 1.2);
    arm.add(nail);

    const cuticle = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.003, 0.004), skinShadeMaterial);
    cuticle.position.set(side * 0.25 + offset, -0.389, -0.945 - index * 0.004);
    cuticle.rotation.set(0.13, side * 0.08, offset * 1.2);
    arm.add(cuticle);

    const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), gloveHighlightMaterial);
    knuckle.position.set(side * 0.25 + offset, -0.374, -0.855);
    knuckle.scale.set(1, 0.42, 0.8);
    arm.add(knuckle);

    const jointStitch = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.005, 0.006), stitchMaterial);
    jointStitch.position.set(side * 0.25 + offset, -0.384, -0.89 - index * 0.004);
    jointStitch.rotation.set(0.08, side * 0.05, offset * 1.5);
    arm.add(jointStitch);
  });

  const thumb = new THREE.Mesh(
    createOrganicTubeGeometry([
      { y: -0.058, radiusX: 0.017, radiusZ: 0.014, offsetZ: -0.004 },
      { y: -0.012, radiusX: 0.023, radiusZ: 0.017, offsetX: side * 0.004, twist: side * 0.2 },
      { y: 0.04, radiusX: 0.02, radiusZ: 0.015, offsetZ: 0.004, twist: side * 0.36 },
      { y: 0.062, radiusX: 0.014, radiusZ: 0.012, offsetX: side * -0.002 }
    ], 14),
    gloveMaterial
  );
  thumb.position.set(side * 0.335, -0.407, -0.804);
  thumb.rotation.set(1.05, side * -0.54, side * 0.58);
  thumb.userData.kind = "firstPersonFinger";
  thumb.userData.phase = side > 0 ? 1.9 : 0.6;
  thumb.userData.basePositionY = thumb.position.y;
  thumb.userData.baseRotationX = thumb.rotation.x;
  arm.add(thumb);

  const thumbTip = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), skinMaterial);
  thumbTip.position.set(side * 0.382, -0.404, -0.86);
  thumbTip.scale.set(0.78, 0.6, 0.86);
  arm.add(thumbTip);

  const thumbCrease = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.004, 0.005), skinShadeMaterial);
  thumbCrease.position.set(side * 0.384, -0.386, -0.855);
  thumbCrease.rotation.set(0.12, side * -0.32, side * 0.28);
  arm.add(thumbCrease);

  const thumbNail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.004, 0.012), nailMaterial);
  thumbNail.position.set(side * 0.396, -0.38, -0.86);
  thumbNail.rotation.set(0.08, side * -0.28, side * 0.34);
  arm.add(thumbNail);

  const thumbPad = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), gloveHighlightMaterial);
  thumbPad.position.set(side * 0.362, -0.381, -0.857);
  thumbPad.scale.set(0.72, 0.45, 1);
  arm.add(thumbPad);

  return arm;
}

function createFirstPersonRestingHand({
  brassMaterial,
  gloveHighlightMaterial,
  gloveMaterial,
  nailMaterial,
  side,
  skinMaterial,
  skinShadeMaterial,
  stitchMaterial
}: {
  brassMaterial: THREE.MeshStandardMaterial;
  gloveHighlightMaterial: THREE.MeshStandardMaterial;
  gloveMaterial: THREE.MeshStandardMaterial;
  nailMaterial: THREE.MeshStandardMaterial;
  side: number;
  skinMaterial: THREE.MeshStandardMaterial;
  skinShadeMaterial: THREE.MeshStandardMaterial;
  stitchMaterial: THREE.MeshStandardMaterial;
}): THREE.Group {
  const hand = new THREE.Group();
  hand.userData.kind = "firstPersonHand";
  hand.userData.phase = side > 0 ? 1.1 : 0.35;
  hand.userData.basePositionY = -0.34;
  hand.userData.basePositionZ = -0.92;
  hand.userData.baseRotationZ = side * 0.018;
  hand.position.set(side * 0.35, hand.userData.basePositionY, hand.userData.basePositionZ);
  hand.rotation.set(-0.22, side * 0.06, hand.userData.baseRotationZ);
  hand.scale.setScalar(0.76);

  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.086, 24, 14), gloveMaterial);
  palm.scale.set(1.08, 0.28, 0.78);
  palm.rotation.set(-0.28, side * 0.08, side * 0.03);
  hand.add(palm);

  const palmShadow = new THREE.Mesh(new THREE.SphereGeometry(0.058, 16, 10), gloveHighlightMaterial);
  palmShadow.position.set(side * 0.018, 0.022, -0.006);
  palmShadow.scale.set(0.96, 0.16, 0.58);
  palmShadow.rotation.set(-0.2, side * 0.08, 0);
  hand.add(palmShadow);

  const wristGuard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.026, 0.07), gloveMaterial);
  wristGuard.position.set(side * -0.012, -0.022, 0.08);
  wristGuard.rotation.set(-0.12, side * 0.05, side * -0.12);
  hand.add(wristGuard);

  const wristBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.012, 0.026), brassMaterial);
  wristBuckle.position.set(side * 0.07, -0.002, 0.092);
  wristBuckle.rotation.set(-0.08, side * 0.12, side * 0.08);
  hand.add(wristBuckle);

  addStitchRow(hand, {
    count: 5,
    material: stitchMaterial,
    origin: new THREE.Vector3(side * -0.07, 0.019, 0.05),
    spacing: new THREE.Vector3(side * 0.032, -0.003, -0.004),
    rotation: new THREE.Euler(-0.08, side * 0.1, side * 0.05),
    size: new THREE.Vector3(0.018, 0.005, 0.005)
  });

  [-0.054, -0.018, 0.018, 0.054].forEach((offset, index) => {
    const fingerLength = 0.108 - Math.abs(index - 1.5) * 0.014;
    const fingerRadius = 0.014 + (index === 1 ? 0.002 : 0);
    const finger = new THREE.Mesh(
      createOrganicTubeGeometry([
        { y: -fingerLength * 0.52, radiusX: fingerRadius * 0.78, radiusZ: fingerRadius * 0.58, offsetZ: -0.004 },
        { y: -fingerLength * 0.16, radiusX: fingerRadius * 1.05, radiusZ: fingerRadius * 0.72, offsetX: offset * 0.016, twist: offset * 1.2 },
        { y: fingerLength * 0.18, radiusX: fingerRadius * 0.9, radiusZ: fingerRadius * 0.66, offsetZ: 0.003, twist: offset * 1.9 },
        { y: fingerLength * 0.5, radiusX: fingerRadius * 0.52, radiusZ: fingerRadius * 0.46, offsetX: offset * -0.012 }
      ], 12),
      gloveMaterial
    );
    finger.position.set(offset, -0.01, -0.096 - index * 0.005);
    finger.rotation.set(Math.PI / 2 + 0.22, side * 0.08, offset * 1.3);
    finger.userData.kind = "firstPersonFinger";
    finger.userData.phase = (side > 0 ? 0.6 : 0.2) + index * 0.28;
    finger.userData.basePositionY = finger.position.y;
    finger.userData.baseRotationX = finger.rotation.x;
    hand.add(finger);

    const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), gloveHighlightMaterial);
    knuckle.position.set(offset, 0.034, -0.035);
    knuckle.scale.set(1, 0.3, 0.78);
    hand.add(knuckle);

    const fingertip = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), skinMaterial);
    fingertip.position.set(offset, -0.008, -0.15 - index * 0.004);
    fingertip.scale.set(0.88, 0.58, 0.72);
    hand.add(fingertip);

    const nail = new THREE.Mesh(new THREE.BoxGeometry(0.017, 0.004, 0.011), nailMaterial);
    nail.position.set(offset, 0.014, -0.153 - index * 0.004);
    nail.rotation.set(0.14, side * 0.05, offset);
    hand.add(nail);

    const crease = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.004, 0.005), skinShadeMaterial);
    crease.position.set(offset, 0.011, -0.136 - index * 0.004);
    crease.rotation.set(0.12, side * 0.05, offset);
    hand.add(crease);
  });

  const thumb = new THREE.Mesh(
    createOrganicTubeGeometry([
      { y: -0.05, radiusX: 0.017, radiusZ: 0.014, offsetZ: -0.003 },
      { y: -0.012, radiusX: 0.022, radiusZ: 0.017, offsetX: side * 0.004, twist: side * 0.22 },
      { y: 0.034, radiusX: 0.018, radiusZ: 0.014, offsetZ: 0.004, twist: side * 0.36 },
      { y: 0.052, radiusX: 0.013, radiusZ: 0.011, offsetX: side * -0.002 }
    ], 14),
    gloveMaterial
  );
  thumb.position.set(side * 0.102, -0.008, -0.026);
  thumb.rotation.set(0.96, side * -0.46, side * 0.62);
  thumb.userData.kind = "firstPersonFinger";
  thumb.userData.phase = side > 0 ? 1.65 : 0.55;
  thumb.userData.basePositionY = thumb.position.y;
  thumb.userData.baseRotationX = thumb.rotation.x;
  hand.add(thumb);

  const thumbTip = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), skinMaterial);
  thumbTip.position.set(side * 0.137, 0.006, -0.078);
  thumbTip.scale.set(0.76, 0.58, 0.8);
  hand.add(thumbTip);

  return hand;
}

function createOrganicTubeGeometry(
  sections: OrganicSection[],
  radialSegments = 18
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  sections.forEach((section, sectionIndex) => {
    const taperNoise = sectionIndex % 2 ? 0.018 : -0.012;
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = (segment / radialSegments) * Math.PI * 2 + (section.twist ?? 0);
      const squash = 1 + Math.sin(angle * 2 + sectionIndex * 0.7) * taperNoise;
      positions.push(
        (section.offsetX ?? 0) + Math.cos(angle) * section.radiusX * squash,
        section.y,
        (section.offsetZ ?? 0) + Math.sin(angle) * section.radiusZ * (2 - squash)
      );
    }
  });

  for (let ring = 0; ring < sections.length - 1; ring += 1) {
    const current = ring * radialSegments;
    const next = (ring + 1) * radialSegments;
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const a = current + segment;
      const b = current + ((segment + 1) % radialSegments);
      const c = next + segment;
      const d = next + ((segment + 1) % radialSegments);
      indices.push(a, c, b, b, c, d);
    }
  }

  const firstCenterIndex = positions.length / 3;
  const first = sections[0]!;
  positions.push(first.offsetX ?? 0, first.y, first.offsetZ ?? 0);
  for (let segment = 0; segment < radialSegments; segment += 1) {
    indices.push(firstCenterIndex, (segment + 1) % radialSegments, segment);
  }

  const lastCenterIndex = positions.length / 3;
  const last = sections[sections.length - 1]!;
  const lastRing = (sections.length - 1) * radialSegments;
  positions.push(last.offsetX ?? 0, last.y, last.offsetZ ?? 0);
  for (let segment = 0; segment < radialSegments; segment += 1) {
    indices.push(lastCenterIndex, lastRing + segment, lastRing + ((segment + 1) % radialSegments));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addStitchRow(
  group: THREE.Group,
  {
    count,
    material,
    origin,
    rotation,
    size,
    spacing
  }: {
    count: number;
    material: THREE.Material;
    origin: THREE.Vector3;
    rotation: THREE.Euler;
    size: THREE.Vector3;
    spacing: THREE.Vector3;
  }
): void {
  for (let index = 0; index < count; index += 1) {
    const stitch = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
    stitch.position.copy(origin).addScaledVector(spacing, index);
    stitch.rotation.copy(rotation);
    group.add(stitch);
  }
}

function createProceduralTexture(kind: "fabric" | "leather" | "skin"): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  if (!context) {
    return new THREE.Texture();
  }

  const base = kind === "fabric" ? "#8a6a54" : kind === "leather" ? "#b9865b" : "#d3a27d";
  const low = kind === "fabric" ? "#493426" : kind === "leather" ? "#5d3827" : "#a36f52";
  const high = kind === "fabric" ? "#c0a07c" : kind === "leather" ? "#e0b47c" : "#f0c7a8";

  context.fillStyle = base;
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < 620; index += 1) {
    const x = seededNoise(index, 3) * canvas.width;
    const y = seededNoise(index, 7) * canvas.height;
    const alpha = kind === "skin" ? 0.08 : 0.12;
    context.fillStyle = seededNoise(index, 11) > 0.52
      ? withAlpha(high, alpha)
      : withAlpha(low, alpha);
    context.fillRect(x, y, 1 + seededNoise(index, 13) * 2, 1);
  }

  if (kind === "fabric") {
    context.strokeStyle = withAlpha("#f3d9aa", 0.16);
    context.lineWidth = 1;
    for (let x = -96; x < 160; x += 9) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x + 96, 96);
      context.stroke();
    }
    context.strokeStyle = withAlpha("#241611", 0.18);
    for (let y = 0; y < 96; y += 12) {
      context.beginPath();
      context.moveTo(0, y + 0.5);
      context.lineTo(96, y + 0.5);
      context.stroke();
    }
  }

  if (kind === "leather") {
    context.strokeStyle = withAlpha("#fff0c8", 0.14);
    context.lineWidth = 1.2;
    for (let index = 0; index < 26; index += 1) {
      const y = seededNoise(index, 17) * 96;
      context.beginPath();
      context.moveTo(0, y);
      context.bezierCurveTo(24, y + seededNoise(index, 19) * 16 - 8, 58, y - 10, 96, y + seededNoise(index, 23) * 12 - 6);
      context.stroke();
    }
  }

  if (kind === "skin") {
    context.strokeStyle = withAlpha("#7a4938", 0.09);
    context.lineWidth = 1;
    for (let index = 0; index < 20; index += 1) {
      const y = seededNoise(index, 29) * 96;
      context.beginPath();
      context.moveTo(seededNoise(index, 31) * 12, y);
      context.quadraticCurveTo(48, y + seededNoise(index, 37) * 8 - 4, 96, y + seededNoise(index, 41) * 8 - 4);
      context.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === "fabric" ? 2.8 : 2.1, kind === "fabric" ? 2.8 : 2.1);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function seededNoise(index: number, salt: number): number {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

async function loadCharacterAsset(
  loader: GLTFLoader,
  profile: CharacterProfile,
  lodTier: CharacterLodTier,
  isDead: boolean,
  name: string,
  playerId: PlayerId
): Promise<LoadedCharacterRuntime> {
  const gltf = await loader.loadAsync(characterModelUrl(profile, lodTier));
  return prepareLoadedCharacter(
    SkeletonUtils.clone(gltf.scene),
    gltf.animations,
    profile,
    lodTier,
    isDead,
    name,
    playerId
  );
}

function prepareLoadedCharacter(
  model: THREE.Object3D,
  animations: THREE.AnimationClip[],
  profile: CharacterProfile,
  lodTier: CharacterLodTier,
  isDead: boolean,
  name: string,
  playerId: PlayerId
): LoadedCharacterRuntime {
  const wrapper = new THREE.Group();
  wrapper.name = `${name} ${profile.id} asset`;
  wrapper.userData.kind = "character";
  wrapper.userData.lodTier = lodTier;
  wrapper.userData.phase = stablePhase(`${name}:${profile.id}`);
  wrapper.add(model);

  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((material) => cloneLoadedMaterial(material, isDead));
    } else {
      mesh.material = cloneLoadedMaterial(mesh.material, isDead);
    }
  });

  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  const scale = MODEL_TARGET_HEIGHT / Math.max(size.y, 0.001);
  model.scale.multiplyScalar(scale);

  const normalizedBox = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  normalizedBox.getCenter(center);
  model.position.x -= center.x;
  model.position.y -= normalizedBox.min.y;
  model.position.z -= center.z;

  const mixer = animations.length > 0 ? new THREE.AnimationMixer(model) : undefined;
  const actions = new Map<CharacterClipId, THREE.AnimationAction>();
  if (mixer) {
    animations.forEach((clip) => {
      const clipId = normalizeCharacterClipId(clip.name);
      if (!clipId || actions.has(clipId)) {
        return;
      }
      const action = mixer.clipAction(clip);
      action.enabled = true;
      action.setEffectiveWeight(1);
      action.setEffectiveTimeScale(1);
      actions.set(clipId, action);
    });
  }

  const runtime: LoadedCharacterRuntime = {
    actions,
    isDead,
    lodTier,
    mixer,
    playerId,
    root: wrapper
  };
  playCharacterClip(runtime, isDead ? "down" : "idle");
  return runtime;
}

function characterModelUrl(profile: CharacterProfile, lodTier: CharacterLodTier): string {
  return lodTier === "lod1" ? profile.lod1ModelUrl : profile.modelUrl;
}

function selectRuntimeCharacterLodTier(): CharacterLodTier {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const isNarrow = window.matchMedia?.("(max-width: 720px)").matches ?? window.innerWidth <= 720;
  const isCoarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const isLowMemory = typeof memory === "number" && memory <= 4;
  const isLowCpu =
    typeof navigator.hardwareConcurrency === "number" &&
    navigator.hardwareConcurrency > 0 &&
    navigator.hardwareConcurrency <= 4;

  return isNarrow || isCoarsePointer || isLowMemory || isLowCpu ? "lod1" : "lod0";
}

function normalizeCharacterClipId(name: string): CharacterClipId | undefined {
  const normalized = name.toLowerCase();
  return CHARACTER_CLIP_IDS.find(
    (clipId) =>
      normalized === clipId ||
      normalized.startsWith(`${clipId}_`) ||
      normalized.includes(`_${clipId}_`) ||
      normalized.endsWith(`_${clipId}`)
  );
}

function clipForRuntimeCharacter(
  runtime: LoadedCharacterRuntime,
  cue: BattlePresentationCue | undefined
): CharacterClipId {
  if (runtime.isDead) {
    return "down";
  }

  if (!cue) {
    return "idle";
  }

  if (cue.targetIds.includes(runtime.playerId)) {
    if (cue.beat === "defeat") {
      return "down";
    }
    if (cue.beat === "defense" || cue.kind === "block" || cue.kind === "reflect") {
      return "defend";
    }
    return "hit";
  }

  if (cue.sourceId === runtime.playerId) {
    if (cue.kind === "skill" || cue.kind === "area" || cue.beat === "skill" || cue.beat === "recovery") {
      return "skill";
    }
    if (cue.kind === "block") {
      return "defend";
    }
    return "attack";
  }

  return "idle";
}

function playCharacterClip(runtime: LoadedCharacterRuntime, requestedClip: CharacterClipId): void {
  if (!runtime.mixer || runtime.actions.size === 0 || runtime.activeClip === requestedClip) {
    return;
  }

  const nextClip = runtime.actions.has(requestedClip) ? requestedClip : "idle";
  const nextAction = runtime.actions.get(nextClip) ?? [...runtime.actions.values()][0];
  if (!nextAction || runtime.activeAction === nextAction) {
    runtime.activeClip = nextClip;
    return;
  }

  runtime.activeAction?.fadeOut(0.16);
  nextAction.reset();
  if (nextClip === "idle") {
    nextAction.setLoop(THREE.LoopRepeat, Infinity);
    nextAction.clampWhenFinished = false;
  } else {
    nextAction.setLoop(THREE.LoopOnce, 1);
    nextAction.clampWhenFinished = true;
  }
  nextAction.fadeIn(0.16).play();
  runtime.activeAction = nextAction;
  runtime.activeClip = nextClip;
}

function cloneLoadedMaterial(material: THREE.Material, isDead: boolean): THREE.Material {
  const cloned = material.clone();
  if (!isDead) {
    return cloned;
  }

  const deadTint = new THREE.Color("#8b96a8");
  const maybeColored = cloned as THREE.Material & {
    color?: THREE.Color;
    emissive?: THREE.Color;
  };
  maybeColored.color?.lerp(deadTint, 0.58);
  maybeColored.emissive?.multiplyScalar(0.2);
  return cloned;
}

function disposeObjectTree(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach(disposeMaterial);
    } else {
      disposeMaterial(material);
    }
  });
}

function disposeMaterial(material: THREE.Material | undefined): void {
  if (!material) {
    return;
  }
  const texturedMaterial = material as THREE.Material & {
    bumpMap?: THREE.Texture | null;
    emissiveMap?: THREE.Texture | null;
    map?: THREE.Texture | null;
    metalnessMap?: THREE.Texture | null;
    normalMap?: THREE.Texture | null;
    roughnessMap?: THREE.Texture | null;
  };
  [
    texturedMaterial.map,
    texturedMaterial.bumpMap,
    texturedMaterial.normalMap,
    texturedMaterial.roughnessMap,
    texturedMaterial.metalnessMap,
    texturedMaterial.emissiveMap
  ].forEach((texture, index, textures) => {
    if (texture && textures.indexOf(texture) === index) {
      texture.dispose();
    }
  });
  material.dispose();
}

function stablePhase(value: string): number {
  return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0) * 0.07;
}
