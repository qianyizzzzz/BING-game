from __future__ import annotations

import math
import sys
from dataclasses import dataclass
from pathlib import Path

import bpy
import mathutils


PROJECT_ROOT = Path(__file__).resolve().parents[2]
ASSET_ROOT = PROJECT_ROOT / "apps" / "client" / "public" / "assets" / "characters"
ARTIFACT_ROOT = PROJECT_ROOT / "artifacts" / "art"
DOCS_ROOT = PROJECT_ROOT / "docs"
PBR_TEXTURE_ROOT = ASSET_ROOT / "materials" / "pbr"
PBR_TEXTURE_SIZE = 256
LOD0_FACE_BUDGET = 35_000
LOD1_FACE_BUDGET = 12_000
LOD1_DECIMATE_RATIO = 0.08
ACTION_POSES = (
    ("idle", "待机"),
    ("attack", "攻击"),
    ("defend", "防御"),
    ("skill", "技能"),
    ("hit", "受击"),
    ("down", "down"),
)
ANIMATION_CLIPS = (
    ("idle", 48),
    ("attack", 26),
    ("defend", 32),
    ("skill", 40),
    ("hit", 22),
    ("down", 46),
)
SKINNING_PREVIEW_POSES = ("attack", "skill", "hit", "down")
RIG_BONES = (
    ("hips", None, (0.0, 0.0, 0.72), (0.0, 0.0, 0.91)),
    ("spine", "hips", (0.0, 0.0, 0.91), (0.0, 0.0, 1.2)),
    ("chest", "spine", (0.0, 0.0, 1.2), (0.0, 0.0, 1.43)),
    ("neck", "chest", (0.0, 0.0, 1.43), (0.0, 0.0, 1.58)),
    ("head", "neck", (0.0, 0.0, 1.58), (0.0, 0.0, 1.88)),
    ("upper_arm.L", "chest", (-0.18, 0.0, 1.34), (-0.35, 0.0, 1.04)),
    ("forearm.L", "upper_arm.L", (-0.35, 0.0, 1.04), (-0.32, -0.02, 0.78)),
    ("hand.L", "forearm.L", (-0.32, -0.02, 0.78), (-0.32, -0.06, 0.69)),
    ("upper_arm.R", "chest", (0.18, 0.0, 1.34), (0.35, 0.0, 1.04)),
    ("forearm.R", "upper_arm.R", (0.35, 0.0, 1.04), (0.32, -0.02, 0.78)),
    ("hand.R", "forearm.R", (0.32, -0.02, 0.78), (0.32, -0.06, 0.69)),
    ("thigh.L", "hips", (-0.09, 0.0, 0.69), (-0.14, 0.01, 0.38)),
    ("shin.L", "thigh.L", (-0.14, 0.01, 0.38), (-0.12, -0.01, 0.08)),
    ("foot.L", "shin.L", (-0.12, -0.01, 0.08), (-0.12, -0.09, 0.0)),
    ("thigh.R", "hips", (0.09, 0.0, 0.69), (0.14, 0.01, 0.38)),
    ("shin.R", "thigh.R", (0.14, 0.01, 0.38), (0.12, -0.01, 0.08)),
    ("foot.R", "shin.R", (0.12, -0.01, 0.08), (0.12, -0.09, 0.0)),
)


@dataclass(frozen=True)
class CharacterSpec:
    character_id: str
    name: str
    role: str
    main: str
    secondary: str
    metal: str
    prop: str
    silhouette: str


CHARACTERS = [
    CharacterSpec(
        "ember-guardian",
        "烛火守卫",
        "稳健防御",
        "#c86b2d",
        "#5b1f16",
        "#c89b4a",
        "shield",
        "厚重护肩、暖色金属、稳定防御姿态",
    ),
    CharacterSpec(
        "jade-trickster",
        "青玉术士",
        "技能爆发",
        "#1fb7a6",
        "#153d3a",
        "#87d8c8",
        "jade",
        "细长轮廓、青玉符件、轻盈斗篷",
    ),
    CharacterSpec(
        "violet-duelist",
        "紫曦剑客",
        "单体进攻",
        "#7b5bd6",
        "#211945",
        "#c2a8ff",
        "blade",
        "锐利前倾、窄肩快攻、紫色刀痕",
    ),
    CharacterSpec(
        "solar-chef",
        "日冕饼师",
        "资源运营",
        "#d8a62e",
        "#5f3512",
        "#f3c85a",
        "pan",
        "围裙、圆润但不幼稚、太阳金属饰件",
    ),
    CharacterSpec(
        "crimson-mender",
        "绯红医师",
        "回复支援",
        "#b64050",
        "#3b1624",
        "#f0a0ad",
        "vial",
        "长袍、药剂挂件、红色生命纹",
    ),
    CharacterSpec(
        "iron-oracle",
        "铁面观察者",
        "AI 推荐",
        "#697484",
        "#18202b",
        "#b7c3cf",
        "mask",
        "铁面具、冷色仪器、观测者姿态",
    ),
]


def main() -> None:
    animation_pass_only = "--bing-animation-pass" in sys.argv
    action_pose_only = "--bing-action-poses-only" in sys.argv
    face_detail_only = "--bing-face-detail-only" in sys.argv
    skinning_preview_only = "--bing-skinning-preview-only" in sys.argv
    export_only = "--bing-export-only" in sys.argv
    save_scene_only = "--bing-save-scene-only" in sys.argv
    metrics_only = "--bing-metrics-only" in sys.argv
    action_pose_filter = selected_action_pose_ids()
    character_filter = selected_character_ids()
    active_characters = [spec for spec in CHARACTERS if character_filter is None or spec.character_id in character_filter]
    print(f"BING_GENERATION_MODE={'metrics-only' if metrics_only else 'save-scene-only' if save_scene_only else 'face-detail-only' if face_detail_only else 'skinning-preview-only' if skinning_preview_only else 'action-poses-only' if action_pose_only else 'export-only' if export_only else 'animation-pass' if animation_pass_only else 'full'}", flush=True)
    clear_scene()
    configure_scene()
    materials = build_materials()
    roots: dict[str, bpy.types.Object] = {}

    for index, spec in enumerate(active_characters):
        print(f"BING_CHARACTER_BUILD_START={spec.character_id}", flush=True)
        root = create_character(spec)
        root.location.x = (index - (len(active_characters) - 1) / 2) * 2.05
        roots[spec.character_id] = root
        print(f"BING_CHARACTER_BUILD_DONE={spec.character_id}", flush=True)

    if metrics_only:
        for spec in active_characters:
            vertex_count, face_count = mesh_metrics(roots[spec.character_id])
            print(f"BING_CHARACTER_METRICS={spec.character_id}:vertices={vertex_count}:faces={face_count}", flush=True)
        return

    add_gallery_floor()
    add_camera_and_lights()

    ASSET_ROOT.mkdir(parents=True, exist_ok=True)
    ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)
    (ASSET_ROOT / "source").mkdir(parents=True, exist_ok=True)

    if save_scene_only:
        scene_path = ASSET_ROOT / "source" / "bing-character-blockouts.blend"
        print("BING_SAVE_SCENE_START", flush=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(scene_path))
        print(f"BING_SAVE_SCENE_ONLY_DONE={scene_path}", flush=True)
        return

    if action_pose_only:
        for spec in active_characters:
            print(f"BING_ACTION_RENDER_START={spec.character_id}", flush=True)
            render_action_pose_views(spec, roots, action_pose_filter)
            print(f"BING_ACTION_RENDER_DONE={spec.character_id}", flush=True)
        selected = ",".join(sorted(action_pose_filter)) if action_pose_filter else "all"
        print(f"BING_ACTION_POSE_ONLY_DONE={selected}", flush=True)
        return

    if face_detail_only:
        for spec in active_characters:
            print(f"BING_FACE_DETAIL_RENDER_START={spec.character_id}", flush=True)
            render_face_detail_view(spec, roots)
            print(f"BING_FACE_DETAIL_RENDER_DONE={spec.character_id}", flush=True)
        print(f"BING_FACE_DETAIL_ONLY_DONE={','.join(spec.character_id for spec in active_characters)}", flush=True)
        return

    if skinning_preview_only:
        for spec in active_characters:
            print(f"BING_SKINNING_PREVIEW_RENDER_START={spec.character_id}", flush=True)
            render_skinning_preview_views(spec, roots, action_pose_filter)
            print(f"BING_SKINNING_PREVIEW_RENDER_DONE={spec.character_id}", flush=True)
        selected = ",".join(sorted(action_pose_filter)) if action_pose_filter else "default"
        print(f"BING_SKINNING_PREVIEW_ONLY_DONE={selected}", flush=True)
        return

    lod1_metrics: dict[str, tuple[int, int]] = {}
    for spec in active_characters:
        print(f"BING_CHARACTER_EXPORT_START={spec.character_id}", flush=True)
        lod1_metrics[spec.character_id] = export_character(spec, roots)
        print(f"BING_CHARACTER_EXPORT_DONE={spec.character_id}", flush=True)
        if export_only:
            continue
        if not animation_pass_only:
            print(f"BING_STATIC_RENDER_START={spec.character_id}", flush=True)
            render_character_views(spec, roots)
            print(f"BING_STATIC_RENDER_DONE={spec.character_id}", flush=True)
        print(f"BING_ACTION_RENDER_START={spec.character_id}", flush=True)
        render_action_pose_views(spec, roots, action_pose_filter)
        print(f"BING_ACTION_RENDER_DONE={spec.character_id}", flush=True)
        print(f"BING_RIG_GUIDE_RENDER_START={spec.character_id}", flush=True)
        render_rig_guide_view(spec, roots)
        print(f"BING_RIG_GUIDE_RENDER_DONE={spec.character_id}", flush=True)
        print(f"BING_SKINNING_PREVIEW_RENDER_START={spec.character_id}", flush=True)
        render_skinning_preview_views(spec, roots, action_pose_filter)
        print(f"BING_SKINNING_PREVIEW_RENDER_DONE={spec.character_id}", flush=True)
    if not animation_pass_only:
        print("BING_MATERIAL_QA_START", flush=True)
        render_material_qa_board()
        print("BING_MATERIAL_QA_DONE", flush=True)

    if export_only and character_filter is not None:
        print(f"BING_CHARACTER_EXPORT_ONLY_DONE={','.join(spec.character_id for spec in active_characters)}", flush=True)
        return

    scene_path = ASSET_ROOT / "source" / "bing-character-blockouts.blend"
    print("BING_SAVE_SCENE_START", flush=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(scene_path))
    write_report(scene_path, roots, lod1_metrics, animation_pass_only=animation_pass_only)
    print(f"BING_CHARACTER_BLOCKOUTS_DONE={scene_path}", flush=True)


def selected_action_pose_ids() -> set[str] | None:
    for arg in sys.argv:
        if not arg.startswith("--bing-action-poses="):
            continue
        selected = {pose_id.strip() for pose_id in arg.split("=", 1)[1].split(",") if pose_id.strip()}
        valid = {pose_id for pose_id, _label in ACTION_POSES}
        unknown = selected - valid
        if unknown:
            raise ValueError(f"Unknown BING action pose ids: {', '.join(sorted(unknown))}")
        return selected
    return None


def selected_character_ids() -> set[str] | None:
    for arg in sys.argv:
        if not arg.startswith("--bing-characters="):
            continue
        selected = {character_id.strip() for character_id in arg.split("=", 1)[1].split(",") if character_id.strip()}
        valid = {spec.character_id for spec in CHARACTERS}
        unknown = selected - valid
        if unknown:
            raise ValueError(f"Unknown BING character ids: {', '.join(sorted(unknown))}")
        return selected
    return None


def fast_action_render_enabled() -> bool:
    return (
        "--bing-fast-action-render" in sys.argv
        or "--bing-action-poses-only" in sys.argv
        or "--bing-skinning-preview-only" in sys.argv
        or "--bing-animation-pass" in sys.argv
    )


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for material in list(bpy.data.materials):
        bpy.data.materials.remove(material)


def configure_scene() -> None:
    scene = bpy.context.scene
    scene.render.resolution_x = 768
    scene.render.resolution_y = 768
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "Filmic"
    scene.view_settings.look = "Medium High Contrast"
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_WORKBENCH"


def build_materials() -> dict[str, bpy.types.Material]:
    return {
        "skin": mat("skin_warm_semireal", "#d8a27f", roughness=0.72, detail="skin"),
        "skin_shadow": mat("skin_shadow", "#8f5d48", roughness=0.8, detail="skin"),
        "skin_highlight": mat("skin_soft_highlight", "#f0c2a4", roughness=0.68, detail="skin"),
        "cloth_dark": mat("deep_abyss_cloth", "#171b18", roughness=0.88, detail="cloth"),
        "cloth_thread": mat("raised_cloth_thread", "#f0e4c8", roughness=0.96, detail="cloth"),
        "leather": mat("worn_dark_leather", "#342017", roughness=0.84, detail="leather"),
        "linen": mat("aged_linen", "#d8c8aa", roughness=0.9, detail="cloth"),
        "hair": mat("dark_hair", "#17100d", roughness=0.82, detail="hair"),
        "eye": mat("soft_eye_glass", "#f4efe2", roughness=0.28, detail="polished"),
        "black": mat("ink_line", "#0b0d0d", roughness=0.7, detail="matte"),
        "lip": mat("muted_lip", "#8a4a40", roughness=0.74, detail="skin"),
    }


def character_profile(spec: CharacterSpec) -> dict[str, object]:
    defaults = {
        "head": (0.122, 0.102, 0.164),
        "ribcage": (0.19, 0.108, 0.285),
        "abdomen": (0.155, 0.095, 0.155),
        "pelvis": (0.19, 0.108, 0.112),
        "coat_tail": (0.2, 0.068, 0.11),
        "shoulder_scale": 1.0,
    }
    variants = {
        "shield": {
            "ribcage": (0.215, 0.118, 0.29),
            "abdomen": (0.17, 0.1, 0.15),
            "pelvis": (0.205, 0.116, 0.112),
            "coat_tail": (0.215, 0.07, 0.112),
            "shoulder_scale": 1.24,
        },
        "jade": {
            "head": (0.118, 0.098, 0.162),
            "ribcage": (0.172, 0.1, 0.292),
            "abdomen": (0.138, 0.088, 0.15),
            "pelvis": (0.17, 0.1, 0.108),
            "coat_tail": (0.18, 0.062, 0.116),
            "shoulder_scale": 0.92,
        },
        "blade": {
            "head": (0.118, 0.098, 0.162),
            "ribcage": (0.178, 0.102, 0.29),
            "abdomen": (0.142, 0.09, 0.15),
            "pelvis": (0.178, 0.102, 0.108),
            "coat_tail": (0.188, 0.064, 0.11),
            "shoulder_scale": 0.96,
        },
        "pan": {
            "ribcage": (0.198, 0.114, 0.284),
            "abdomen": (0.176, 0.104, 0.158),
            "pelvis": (0.198, 0.112, 0.115),
            "coat_tail": (0.208, 0.07, 0.11),
            "shoulder_scale": 1.02,
        },
        "vial": {
            "head": (0.12, 0.1, 0.165),
            "ribcage": (0.184, 0.104, 0.3),
            "abdomen": (0.148, 0.092, 0.16),
            "pelvis": (0.18, 0.104, 0.11),
            "coat_tail": (0.205, 0.068, 0.13),
            "shoulder_scale": 0.98,
        },
        "mask": {
            "head": (0.124, 0.102, 0.166),
            "ribcage": (0.185, 0.11, 0.292),
            "abdomen": (0.152, 0.096, 0.152),
            "pelvis": (0.185, 0.108, 0.11),
            "coat_tail": (0.195, 0.066, 0.112),
            "shoulder_scale": 1.04,
        },
    }
    return defaults | variants.get(spec.prop, {})


def create_character(spec: CharacterSpec) -> bpy.types.Object:
    collection = bpy.data.collections.new(f"BING_{spec.character_id}")
    bpy.context.scene.collection.children.link(collection)
    root = bpy.data.objects.new(f"{spec.character_id}_root", None)
    collection.objects.link(root)

    skin = bpy.data.materials["skin_warm_semireal"]
    skin_shadow = bpy.data.materials["skin_shadow"]
    skin_highlight = bpy.data.materials["skin_soft_highlight"]
    cloth_dark = bpy.data.materials["deep_abyss_cloth"]
    leather = bpy.data.materials["worn_dark_leather"]
    main = mat(f"{spec.character_id}_main_cloth", spec.main, roughness=0.74, detail="cloth")
    secondary = mat(f"{spec.character_id}_secondary_cloth", spec.secondary, roughness=0.82, detail="cloth")
    metal = mat(f"{spec.character_id}_aged_metal", spec.metal, roughness=0.38, metallic=0.45, detail="metal")
    emissive = mat(f"{spec.character_id}_relic_glow", spec.main, roughness=0.22, emission=0.65, detail="emissive")

    profile = character_profile(spec)

    # 7.5-head semi-realistic proportion blockout: narrower torso, longer limbs, smaller head.
    add_ellipsoid(collection, root, f"{spec.character_id}_head", (0, -0.006, 1.76), profile["head"], skin)
    add_ellipsoid(collection, root, f"{spec.character_id}_jaw_plane", (0, -0.02, 1.645), (profile["head"][0] * 0.72, 0.072, 0.052), skin_shadow)
    add_ellipsoid(collection, root, f"{spec.character_id}_neck", (0, 0, 1.51), (0.058, 0.048, 0.095), skin_shadow)
    add_ellipsoid(collection, root, f"{spec.character_id}_ribcage", (0, 0, 1.18), profile["ribcage"], main)
    add_ellipsoid(collection, root, f"{spec.character_id}_abdomen", (0, -0.005, 0.93), profile["abdomen"], main)
    add_ellipsoid(collection, root, f"{spec.character_id}_pelvis", (0, 0, 0.74), profile["pelvis"], secondary)
    add_ellipsoid(collection, root, f"{spec.character_id}_coat_tail", (0, 0.025, 0.58), profile["coat_tail"], secondary)
    print(f"BING_CHARACTER_BASE_SHAPES_DONE={spec.character_id}", flush=True)
    add_head_detail(collection, root, spec)
    add_tailored_costume(collection, root, spec, main, secondary, metal, leather, cloth_dark)
    add_body_landmarks(collection, root, spec, main, secondary, metal)
    print(f"BING_CHARACTER_COSTUME_DONE={spec.character_id}", flush=True)

    shoulder_scale = profile["shoulder_scale"]
    add_ellipsoid(collection, root, f"{spec.character_id}_left_shoulder", (-0.255 * shoulder_scale, 0, 1.35), (0.075, 0.064, 0.06), metal)
    add_ellipsoid(collection, root, f"{spec.character_id}_right_shoulder", (0.255 * shoulder_scale, 0, 1.35), (0.075, 0.064, 0.06), metal)

    limb(collection, root, f"{spec.character_id}_left_upper_arm", (-0.275, 0, 1.27), (-0.365, 0.02, 1.02), 0.034, main)
    limb(collection, root, f"{spec.character_id}_left_forearm", (-0.365, 0.02, 1.02), (-0.325, -0.02, 0.775), 0.03, leather)
    limb(collection, root, f"{spec.character_id}_right_upper_arm", (0.275, 0, 1.27), (0.365, 0.02, 1.02), 0.034, main)
    limb(collection, root, f"{spec.character_id}_right_forearm", (0.365, 0.02, 1.02), (0.325, -0.02, 0.775), 0.03, leather)
    add_ellipsoid(collection, root, f"{spec.character_id}_left_elbow", (-0.365, 0.015, 1.02), (0.04, 0.034, 0.034), leather)
    add_ellipsoid(collection, root, f"{spec.character_id}_right_elbow", (0.365, 0.015, 1.02), (0.04, 0.034, 0.034), leather)
    add_ellipsoid(collection, root, f"{spec.character_id}_left_hand", (-0.325, -0.025, 0.735), (0.042, 0.03, 0.052), skin)
    add_ellipsoid(collection, root, f"{spec.character_id}_right_hand", (0.325, -0.025, 0.735), (0.042, 0.03, 0.052), skin)
    add_fingers(collection, root, spec, -1, skin)
    add_fingers(collection, root, spec, 1, skin)
    add_hand_anatomy(collection, root, spec, -1, skin, skin_shadow, skin_highlight)
    add_hand_anatomy(collection, root, spec, 1, skin, skin_shadow, skin_highlight)
    print(f"BING_CHARACTER_ARMS_HANDS_DONE={spec.character_id}", flush=True)

    limb(collection, root, f"{spec.character_id}_left_thigh", (-0.095, 0, 0.68), (-0.135, 0.015, 0.37), 0.047, secondary)
    limb(collection, root, f"{spec.character_id}_left_shin", (-0.135, 0.015, 0.37), (-0.125, -0.01, 0.05), 0.038, leather)
    limb(collection, root, f"{spec.character_id}_right_thigh", (0.095, 0, 0.68), (0.135, 0.015, 0.37), 0.047, secondary)
    limb(collection, root, f"{spec.character_id}_right_shin", (0.135, 0.015, 0.37), (0.125, -0.01, 0.05), 0.038, leather)
    add_ellipsoid(collection, root, f"{spec.character_id}_left_knee", (-0.135, -0.012, 0.37), (0.052, 0.024, 0.04), secondary)
    add_ellipsoid(collection, root, f"{spec.character_id}_right_knee", (0.135, -0.012, 0.37), (0.052, 0.024, 0.04), secondary)
    add_ellipsoid(collection, root, f"{spec.character_id}_left_boot", (-0.125, -0.045, 0.01), (0.065, 0.105, 0.032), leather)
    add_ellipsoid(collection, root, f"{spec.character_id}_right_boot", (0.125, -0.045, 0.01), (0.065, 0.105, 0.032), leather)
    print(f"BING_CHARACTER_LEGS_DONE={spec.character_id}", flush=True)

    add_face(collection, root, spec)
    print(f"BING_CHARACTER_FACE_DONE={spec.character_id}", flush=True)
    add_prop(collection, root, spec, metal, emissive, leather)
    add_base(collection, root, spec, emissive)
    print(f"BING_CHARACTER_PROP_BASE_DONE={spec.character_id}", flush=True)
    rig = add_armature_rig(collection, root, spec)
    add_rigid_skin_weights(root, spec, rig)
    print(f"BING_CHARACTER_RIG_DONE={spec.character_id}", flush=True)

    return root


def add_face(collection, root, spec: CharacterSpec) -> None:
    eye = bpy.data.materials["soft_eye_glass"]
    black = bpy.data.materials["ink_line"]
    hair = bpy.data.materials["dark_hair"]
    skin = bpy.data.materials["skin_warm_semireal"]
    skin_shadow = bpy.data.materials["skin_shadow"]
    skin_highlight = bpy.data.materials["skin_soft_highlight"]
    lip = bpy.data.materials["muted_lip"]
    if spec.prop == "mask":
        mask_mat = bpy.data.materials[f"{spec.character_id}_aged_metal"]
        add_sculpted_face_mesh(collection, root, spec, mask_mat, is_mask=True)
        add_ellipsoid(collection, root, f"{spec.character_id}_iron_mask", (0, -0.092, 1.735), (0.112, 0.018, 0.125), mask_mat)
        add_ellipsoid(collection, root, f"{spec.character_id}_left_lens", (-0.045, -0.111, 1.75), (0.022, 0.007, 0.016), eye)
        add_ellipsoid(collection, root, f"{spec.character_id}_right_lens", (0.045, -0.111, 1.75), (0.022, 0.007, 0.016), eye)
        add_box(collection, root, f"{spec.character_id}_mask_mouth_slit", (0, -0.116, 1.665), (0.062, 0.006, 0.006), black)
        add_mask_realism_details(collection, root, spec, mask_mat, eye, black)
        return
    add_sculpted_face_mesh(collection, root, spec, skin)
    add_ellipsoid(collection, root, f"{spec.character_id}_left_ear", (-0.128, -0.006, 1.715), (0.022, 0.012, 0.043), skin)
    add_ellipsoid(collection, root, f"{spec.character_id}_right_ear", (0.128, -0.006, 1.715), (0.022, 0.012, 0.043), skin)
    add_ear_anatomy(collection, root, spec, -1, skin_shadow, skin_highlight)
    add_ear_anatomy(collection, root, spec, 1, skin_shadow, skin_highlight)
    add_ellipsoid(collection, root, f"{spec.character_id}_left_eye_socket", (-0.038, -0.101, 1.758), (0.029, 0.008, 0.017), skin_shadow)
    add_ellipsoid(collection, root, f"{spec.character_id}_right_eye_socket", (0.038, -0.101, 1.758), (0.029, 0.008, 0.017), skin_shadow)
    add_ellipsoid(collection, root, f"{spec.character_id}_left_eye", (-0.038, -0.109, 1.758), (0.013, 0.0045, 0.008), eye)
    add_ellipsoid(collection, root, f"{spec.character_id}_right_eye", (0.038, -0.109, 1.758), (0.013, 0.0045, 0.008), eye)
    add_ellipsoid(collection, root, f"{spec.character_id}_left_pupil", (-0.038, -0.113, 1.758), (0.0045, 0.002, 0.0045), black)
    add_ellipsoid(collection, root, f"{spec.character_id}_right_pupil", (0.038, -0.113, 1.758), (0.0045, 0.002, 0.0045), black)
    add_box(collection, root, f"{spec.character_id}_left_upper_eyelid", (-0.038, -0.116, 1.767), (0.025, 0.0035, 0.0045), skin_shadow, rotation=(0, 0, math.radians(-5)))
    add_box(collection, root, f"{spec.character_id}_right_upper_eyelid", (0.038, -0.116, 1.767), (0.025, 0.0035, 0.0045), skin_shadow, rotation=(0, 0, math.radians(5)))
    add_box(collection, root, f"{spec.character_id}_left_lower_eyelid", (-0.038, -0.115, 1.749), (0.021, 0.003, 0.0035), skin_highlight, rotation=(0, 0, math.radians(4)))
    add_box(collection, root, f"{spec.character_id}_right_lower_eyelid", (0.038, -0.115, 1.749), (0.021, 0.003, 0.0035), skin_highlight, rotation=(0, 0, math.radians(-4)))
    add_box(collection, root, f"{spec.character_id}_left_brow_hair", (-0.041, -0.116, 1.789), (0.031, 0.004, 0.005), hair, rotation=(0, 0, math.radians(-8)))
    add_box(collection, root, f"{spec.character_id}_right_brow_hair", (0.041, -0.116, 1.789), (0.031, 0.004, 0.005), hair, rotation=(0, 0, math.radians(8)))
    add_ellipsoid(collection, root, f"{spec.character_id}_nose_bridge", (0, -0.116, 1.724), (0.014, 0.01, 0.038), skin_shadow)
    add_ellipsoid(collection, root, f"{spec.character_id}_nose_tip", (0, -0.128, 1.698), (0.019, 0.011, 0.014), skin)
    add_ellipsoid(collection, root, f"{spec.character_id}_left_nostril", (-0.012, -0.137, 1.692), (0.005, 0.002, 0.0035), black)
    add_ellipsoid(collection, root, f"{spec.character_id}_right_nostril", (0.012, -0.137, 1.692), (0.005, 0.002, 0.0035), black)
    add_ellipsoid(collection, root, f"{spec.character_id}_left_cheek_plane", (-0.052, -0.118, 1.693), (0.016, 0.003, 0.012), skin_shadow)
    add_ellipsoid(collection, root, f"{spec.character_id}_right_cheek_plane", (0.052, -0.118, 1.693), (0.016, 0.003, 0.012), skin_shadow)
    add_ellipsoid(collection, root, f"{spec.character_id}_left_cheek_highlight", (-0.058, -0.125, 1.707), (0.0055, 0.0018, 0.0035), skin_highlight)
    add_ellipsoid(collection, root, f"{spec.character_id}_right_cheek_highlight", (0.058, -0.125, 1.707), (0.0055, 0.0018, 0.0035), skin_highlight)
    add_ellipsoid(collection, root, f"{spec.character_id}_upper_lip", (0, -0.126, 1.655), (0.034, 0.0045, 0.0045), lip)
    add_ellipsoid(collection, root, f"{spec.character_id}_lower_lip", (0, -0.125, 1.642), (0.03, 0.0045, 0.006), lip)
    add_ellipsoid(collection, root, f"{spec.character_id}_chin_plane", (0, -0.108, 1.615), (0.045, 0.009, 0.018), skin_shadow)
    add_face_micro_landmarks(collection, root, spec, skin_shadow, skin_highlight, lip)
    add_face_realism_details(collection, root, spec, skin_shadow, skin_highlight, lip, eye, black)


def add_sculpted_face_mesh(
    collection,
    root,
    spec: CharacterSpec,
    material: bpy.types.Material,
    is_mask: bool = False,
) -> bpy.types.Object:
    columns = 17
    rows = 23
    width = 0.086 if not is_mask else 0.108
    height = 0.125 if not is_mask else 0.128
    center_z = 1.702 if not is_mask else 1.735
    base_y = -0.113 if not is_mask else -0.121
    feature_strength = 0.52 if not is_mask else 0.42

    vertices = []
    coords = []
    for row in range(rows):
        v = -1.0 + (2.0 * row / (rows - 1))
        taper = 0.58 + 0.42 * (1.0 - abs(v) ** 1.55)
        if v < -0.45:
            taper *= 0.86 + (v + 1.0) * 0.18
        if v > 0.62:
            taper *= 0.92
        row_width = width * taper
        for column in range(columns):
            u = -1.0 + (2.0 * column / (columns - 1))
            x = u * row_width
            z = center_z + v * height
            convex = 0.0065 * (1.0 - u * u) * max(0.0, 1.0 - abs(v) ** 1.7)
            nose_bridge = 0.012 * gaussian(u, 0.0, 0.18) * gaussian(v, 0.22, 0.28)
            nose_tip = 0.013 * gaussian(u, 0.0, 0.2) * gaussian(v, -0.08, 0.14)
            cheek = 0.01 * gaussian(abs(u), 0.58, 0.2) * gaussian(v, -0.08, 0.26)
            brow = 0.006 * gaussian(abs(u), 0.36, 0.2) * gaussian(v, 0.48, 0.13)
            mouth_mound = 0.004 * gaussian(u, 0.0, 0.42) * gaussian(v, -0.42, 0.12)
            chin = 0.007 * gaussian(u, 0.0, 0.36) * gaussian(v, -0.72, 0.16)
            eye_hollow = 0.006 * gaussian(abs(u), 0.38, 0.14) * gaussian(v, 0.36, 0.11)
            y = base_y - (convex + nose_bridge + nose_tip + cheek + brow + mouth_mound + chin) * feature_strength
            y += eye_hollow * (0.75 if not is_mask else 0.35)
            vertices.append((x, y, z))
            coords.append((u, v))

    faces = []
    for row in range(rows - 1):
        for column in range(columns - 1):
            a = row * columns + column
            center_u = sum(coords[index][0] for index in (a, a + 1, a + columns + 1, a + columns)) * 0.25
            center_v = sum(coords[index][1] for index in (a, a + 1, a + columns + 1, a + columns)) * 0.25
            eye_opening = abs(abs(center_u) - 0.38) < 0.22 and 0.2 < center_v < 0.58
            mouth_opening = abs(center_u) < 0.44 and -0.56 < center_v < -0.28
            if not is_mask and (eye_opening or mouth_opening):
                continue
            faces.append((a, a + 1, a + columns + 1, a + columns))

    mesh = bpy.data.meshes.new(f"{spec.character_id}_{'mask' if is_mask else 'face'}_sculpt_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()

    obj = bpy.data.objects.new(f"{spec.character_id}_{'mask' if is_mask else 'face'}_sculpt_surface", mesh)
    obj.data.materials.append(material)
    collection.objects.link(obj)
    obj.parent = root
    shade_smooth(obj)
    subdivision = obj.modifiers.new(name=f"{obj.name}_soft_subdivision", type="SUBSURF")
    subdivision.levels = 1
    subdivision.render_levels = 1
    obj.modifiers.new(name=f"{obj.name}_weighted_normals", type="WEIGHTED_NORMAL")
    return obj


def add_face_micro_landmarks(collection, root, spec: CharacterSpec, skin_shadow, skin_highlight, lip) -> None:
    for side in [-1, 1]:
        label = "right" if side > 0 else "left"
        add_ellipsoid(
            collection,
            root,
            f"{spec.character_id}_{label}_under_eye_trough",
            (0.041 * side, -0.133, 1.738),
            (0.024, 0.003, 0.0045),
            skin_shadow,
        )
        add_ellipsoid(
            collection,
            root,
            f"{spec.character_id}_{label}_tear_duct",
            (0.021 * side, -0.134, 1.757),
            (0.005, 0.0025, 0.004),
            skin_highlight,
        )
        limb(
            collection,
            root,
            f"{spec.character_id}_{label}_nasolabial_fold",
            (0.024 * side, -0.139, 1.684),
            (0.048 * side, -0.132, 1.638),
            0.0018,
            skin_shadow,
        )
        add_ellipsoid(
            collection,
            root,
            f"{spec.character_id}_{label}_mouth_corner",
            (0.037 * side, -0.133, 1.648),
            (0.0055, 0.0025, 0.0045),
            lip,
        )
        add_ellipsoid(
            collection,
            root,
            f"{spec.character_id}_{label}_masseter_plane",
            (0.079 * side, -0.121, 1.655),
            (0.01, 0.0024, 0.018),
            skin_shadow,
        )
    add_ellipsoid(collection, root, f"{spec.character_id}_philtrum_shadow", (0, -0.137, 1.671), (0.006, 0.002, 0.014), skin_shadow)
    add_ellipsoid(collection, root, f"{spec.character_id}_chin_highlight", (0, -0.128, 1.612), (0.018, 0.0018, 0.0035), skin_highlight)


def add_face_realism_details(collection, root, spec: CharacterSpec, skin_shadow, skin_highlight, lip, eye, black) -> None:
    pore_mat = bpy.data.materials.get("skin_pore_soft") or mat("skin_pore_soft", "#9d6655", roughness=0.9, detail="skin")
    catchlight = bpy.data.materials.get("eye_wet_catchlight") or mat("eye_wet_catchlight", "#f8fff2", roughness=0.14, emission=0.12, detail="polished")
    tear_mat = bpy.data.materials.get("tearline_wet_edge") or mat("tearline_wet_edge", "#f3d7c3", roughness=0.34, detail="polished")
    warmth = {
        "shield": 0.0,
        "jade": -0.006,
        "blade": 0.004,
        "pan": 0.007,
        "vial": 0.002,
        "mask": 0.0,
    }.get(spec.prop, 0.0)

    for side in [-1, 1]:
        label = "right" if side > 0 else "left"
        add_ellipsoid(collection, root, f"{spec.character_id}_{label}_cornea_catchlight", (0.034 * side, -0.1175, 1.764), (0.0048, 0.0012, 0.0032), catchlight)
        add_ellipsoid(collection, root, f"{spec.character_id}_{label}_tearline_wet_edge", (0.038 * side, -0.1195, 1.747), (0.022, 0.0012, 0.0022), tear_mat)
        add_ellipsoid(collection, root, f"{spec.character_id}_{label}_lower_lid_volume", (0.039 * side, -0.128, 1.742), (0.023, 0.002, 0.004), skin_shadow)
        add_ellipsoid(collection, root, f"{spec.character_id}_{label}_upper_lid_volume", (0.04 * side, -0.127, 1.773), (0.027, 0.002, 0.004), skin_shadow)
        add_ellipsoid(collection, root, f"{spec.character_id}_{label}_sclera_shadow", (0.049 * side, -0.116, 1.756), (0.006, 0.001, 0.006), black)

    pore_points = [
        (-0.055, 1.707, 0.0),
        (-0.043, 1.697, 0.003),
        (-0.062, 1.683, -0.002),
        (-0.031, 1.688, 0.002),
        (0.055, 1.707, 0.001),
        (0.043, 1.697, -0.002),
        (0.062, 1.683, 0.002),
        (0.031, 1.688, -0.001),
        (-0.018, 1.716, 0.0),
        (0.018, 1.716, 0.0),
        (-0.014, 1.675, 0.002),
        (0.014, 1.675, -0.002),
    ]
    for index, (x, z, jitter) in enumerate(pore_points):
        size = 0.0025 + (index % 3) * 0.00055
        y = -0.139 - abs(x) * 0.01 + jitter * 0.002 + warmth * 0.02
        add_ellipsoid(collection, root, f"{spec.character_id}_skin_pore_{index:02d}", (x, y, z + warmth), (size, 0.0009, size * 0.72), pore_mat)

    add_ellipsoid(collection, root, f"{spec.character_id}_lip_center_shadow", (0, -0.132, 1.649), (0.027, 0.0011, 0.0025), lip)
    add_ellipsoid(collection, root, f"{spec.character_id}_nose_oil_highlight", (0, -0.139, 1.705), (0.008, 0.001, 0.012), skin_highlight)
    add_ellipsoid(collection, root, f"{spec.character_id}_forehead_soft_highlight", (0, -0.124, 1.795), (0.03, 0.001, 0.008), skin_highlight)


def add_mask_realism_details(collection, root, spec: CharacterSpec, mask_mat, eye, black) -> None:
    catchlight = bpy.data.materials.get("eye_wet_catchlight") or mat("eye_wet_catchlight", "#f8fff2", roughness=0.14, emission=0.12, detail="polished")
    edge_wear = bpy.data.materials.get("mask_edge_wear") or mat("mask_edge_wear", "#cbd4dc", roughness=0.42, metallic=0.25, detail="metal")
    for side in [-1, 1]:
        label = "right" if side > 0 else "left"
        add_ellipsoid(collection, root, f"{spec.character_id}_{label}_lens_catchlight", (0.039 * side, -0.116, 1.758), (0.005, 0.001, 0.0035), catchlight)
        add_ellipsoid(collection, root, f"{spec.character_id}_{label}_mask_eye_recess", (0.045 * side, -0.118, 1.748), (0.03, 0.0015, 0.021), black)
        add_ellipsoid(collection, root, f"{spec.character_id}_{label}_mask_worn_edge", (0.082 * side, -0.125, 1.711), (0.004, 0.001, 0.052), edge_wear)
    add_ellipsoid(collection, root, f"{spec.character_id}_mask_brow_worn_edge", (0, -0.126, 1.794), (0.06, 0.001, 0.004), edge_wear)
    add_ellipsoid(collection, root, f"{spec.character_id}_mask_nose_ridge_wear", (0, -0.132, 1.715), (0.006, 0.001, 0.045), edge_wear)


def add_ear_anatomy(collection, root, spec: CharacterSpec, side: int, skin_shadow, skin_highlight) -> None:
    label = "right" if side > 0 else "left"
    x = 0.13 * side
    add_torus(
        collection,
        root,
        f"{spec.character_id}_{label}_ear_helix",
        (x, -0.01, 1.715),
        (0, math.pi / 2, 0),
        0.023,
        0.0028,
        skin_shadow,
    )
    add_ellipsoid(
        collection,
        root,
        f"{spec.character_id}_{label}_ear_inner_bowl",
        (x, -0.016, 1.713),
        (0.006, 0.005, 0.021),
        skin_shadow,
    )
    add_ellipsoid(
        collection,
        root,
        f"{spec.character_id}_{label}_ear_lobe_highlight",
        (x, -0.016, 1.676),
        (0.007, 0.004, 0.009),
        skin_highlight,
    )


def add_head_detail(collection, root, spec: CharacterSpec) -> None:
    hair = bpy.data.materials["dark_hair"]
    linen = bpy.data.materials["aged_linen"]
    metal = bpy.data.materials[f"{spec.character_id}_aged_metal"]
    emissive = bpy.data.materials[f"{spec.character_id}_relic_glow"]

    if spec.prop == "pan":
        add_ellipsoid(collection, root, f"{spec.character_id}_chef_cap", (0, -0.005, 1.91), (0.16, 0.12, 0.055), linen)
        add_ellipsoid(collection, root, f"{spec.character_id}_chef_cap_puff", (-0.055, -0.01, 1.955), (0.065, 0.052, 0.045), linen)
        add_ellipsoid(collection, root, f"{spec.character_id}_chef_cap_puff_b", (0.055, -0.01, 1.955), (0.065, 0.052, 0.045), linen)
        return

    if spec.prop == "mask":
        add_ellipsoid(collection, root, f"{spec.character_id}_hood_back", (0, 0.03, 1.74), (0.16, 0.095, 0.19), bpy.data.materials["deep_abyss_cloth"])
        add_ellipsoid(collection, root, f"{spec.character_id}_iron_brow_plate", (0, -0.105, 1.815), (0.118, 0.018, 0.028), metal)
        return

    add_ellipsoid(collection, root, f"{spec.character_id}_hair_cap", (0, 0.012, 1.84), (0.147, 0.105, 0.066), hair)
    add_ellipsoid(collection, root, f"{spec.character_id}_back_hair_mass", (0, 0.09, 1.7), (0.12, 0.045, 0.14), hair)
    add_ellipsoid(collection, root, f"{spec.character_id}_left_sideburn", (-0.102, -0.044, 1.71), (0.018, 0.018, 0.075), hair)
    add_ellipsoid(collection, root, f"{spec.character_id}_right_sideburn", (0.102, -0.044, 1.71), (0.018, 0.018, 0.075), hair)
    for index, x in enumerate([-0.056, -0.025, 0.01, 0.044]):
        add_box(
            collection,
            root,
            f"{spec.character_id}_front_hair_lock_{index}",
            (x, -0.095, 1.858 - index * 0.006),
            (0.016, 0.012, 0.064),
            hair,
            rotation=(0, 0, math.radians(-14 + index * 9)),
        )

    if spec.prop == "jade":
        add_torus(collection, root, f"{spec.character_id}_jade_hair_ring", (0, -0.015, 1.88), (math.pi / 2, 0, 0), 0.105, 0.006, emissive)
    elif spec.prop == "blade":
        add_box(collection, root, f"{spec.character_id}_violet_hair_streak", (0.046, -0.094, 1.86), (0.018, 0.012, 0.072), emissive, rotation=(0.0, 0.0, math.radians(-18)))
    elif spec.prop == "vial":
        add_ellipsoid(collection, root, f"{spec.character_id}_mender_headband", (0, -0.063, 1.825), (0.13, 0.014, 0.022), emissive)
    elif spec.prop == "shield":
        add_ellipsoid(collection, root, f"{spec.character_id}_guardian_brow_guard", (0, -0.098, 1.81), (0.112, 0.014, 0.024), metal)


def add_tailored_costume(collection, root, spec: CharacterSpec, main, secondary, metal, leather, cloth_dark) -> None:
    linen = bpy.data.materials["aged_linen"]
    emissive = bpy.data.materials[f"{spec.character_id}_relic_glow"]

    add_torus(collection, root, f"{spec.character_id}_raised_collar", (0, -0.01, 1.43), (math.pi / 2, 0, 0), 0.17, 0.015, cloth_dark)
    add_box(collection, root, f"{spec.character_id}_front_placket", (0, -0.145, 1.12), (0.045, 0.018, 0.31), secondary)
    add_box(collection, root, f"{spec.character_id}_left_lapel", (-0.075, -0.15, 1.21), (0.045, 0.016, 0.22), main, rotation=(0, 0, math.radians(-12)))
    add_box(collection, root, f"{spec.character_id}_right_lapel", (0.075, -0.15, 1.21), (0.045, 0.016, 0.22), main, rotation=(0, 0, math.radians(12)))
    add_box(collection, root, f"{spec.character_id}_left_outer_coat_panel", (-0.145, -0.132, 1.08), (0.035, 0.014, 0.42), cloth_dark, rotation=(0, 0, math.radians(-4)))
    add_box(collection, root, f"{spec.character_id}_right_outer_coat_panel", (0.145, -0.132, 1.08), (0.035, 0.014, 0.42), cloth_dark, rotation=(0, 0, math.radians(4)))
    add_box(collection, root, f"{spec.character_id}_left_shoulder_seam", (-0.158, -0.148, 1.355), (0.07, 0.006, 0.008), cloth_dark, rotation=(0, 0, math.radians(-15)))
    add_box(collection, root, f"{spec.character_id}_right_shoulder_seam", (0.158, -0.148, 1.355), (0.07, 0.006, 0.008), cloth_dark, rotation=(0, 0, math.radians(15)))
    add_box(collection, root, f"{spec.character_id}_waist_belt", (0, -0.145, 0.88), (0.25, 0.024, 0.035), leather)
    add_box(collection, root, f"{spec.character_id}_belt_buckle", (0, -0.172, 0.885), (0.043, 0.012, 0.043), metal)
    add_box(collection, root, f"{spec.character_id}_left_hem_panel", (-0.08, -0.12, 0.66), (0.06, 0.016, 0.18), secondary, rotation=(0, 0, math.radians(-5)))
    add_box(collection, root, f"{spec.character_id}_right_hem_panel", (0.08, -0.12, 0.66), (0.06, 0.016, 0.18), secondary, rotation=(0, 0, math.radians(5)))
    add_box(collection, root, f"{spec.character_id}_lower_coat_left_edge", (-0.155, -0.122, 0.7), (0.012, 0.008, 0.18), cloth_dark, rotation=(0, 0, math.radians(-8)))
    add_box(collection, root, f"{spec.character_id}_lower_coat_right_edge", (0.155, -0.122, 0.7), (0.012, 0.008, 0.18), cloth_dark, rotation=(0, 0, math.radians(8)))
    add_stitches(collection, root, spec, main)

    if spec.prop == "shield":
        add_box(collection, root, f"{spec.character_id}_chest_armor_plate", (0, -0.168, 1.18), (0.16, 0.018, 0.13), metal)
        add_box(collection, root, f"{spec.character_id}_armor_glyph", (0, -0.185, 1.18), (0.018, 0.006, 0.09), emissive)
    elif spec.prop == "jade":
        add_box(collection, root, f"{spec.character_id}_long_scarf_left", (-0.13, -0.165, 1.05), (0.034, 0.014, 0.42), emissive, rotation=(0, 0, math.radians(-6)))
        add_box(collection, root, f"{spec.character_id}_long_scarf_right", (0.13, -0.165, 1.05), (0.034, 0.014, 0.42), emissive, rotation=(0, 0, math.radians(6)))
    elif spec.prop == "blade":
        add_box(collection, root, f"{spec.character_id}_duelist_cross_sash", (-0.03, -0.17, 1.11), (0.035, 0.016, 0.37), emissive, rotation=(0, 0, math.radians(-28)))
    elif spec.prop == "pan":
        add_box(collection, root, f"{spec.character_id}_apron_panel", (0, -0.176, 1.0), (0.18, 0.018, 0.39), linen)
        add_box(collection, root, f"{spec.character_id}_apron_tie", (0, -0.188, 0.9), (0.22, 0.01, 0.018), leather)
    elif spec.prop == "vial":
        add_box(collection, root, f"{spec.character_id}_doctor_coat_panel", (0, -0.174, 1.03), (0.2, 0.016, 0.47), linen)
        add_box(collection, root, f"{spec.character_id}_life_mark_vertical", (0, -0.19, 1.13), (0.018, 0.006, 0.12), emissive)
        add_box(collection, root, f"{spec.character_id}_life_mark_horizontal", (0, -0.192, 1.13), (0.08, 0.006, 0.018), emissive)
    elif spec.prop == "mask":
        add_box(collection, root, f"{spec.character_id}_oracle_instrument_panel", (0, -0.17, 1.15), (0.17, 0.018, 0.17), metal)
        add_torus(collection, root, f"{spec.character_id}_chest_scope_ring", (0, -0.19, 1.15), (math.pi / 2, 0, 0), 0.07, 0.006, emissive)


def add_body_landmarks(collection, root, spec: CharacterSpec, main, secondary, metal) -> None:
    thread = bpy.data.materials["raised_cloth_thread"]
    leather = bpy.data.materials["worn_dark_leather"]
    shadow = bpy.data.materials["deep_abyss_cloth"]

    add_box(collection, root, f"{spec.character_id}_left_clavicle", (-0.075, -0.153, 1.395), (0.065, 0.007, 0.008), thread, rotation=(0, 0, math.radians(-12)))
    add_box(collection, root, f"{spec.character_id}_right_clavicle", (0.075, -0.153, 1.395), (0.065, 0.007, 0.008), thread, rotation=(0, 0, math.radians(12)))
    add_box(collection, root, f"{spec.character_id}_left_rib_shadow", (-0.175, -0.143, 1.13), (0.012, 0.006, 0.25), shadow)
    add_box(collection, root, f"{spec.character_id}_right_rib_shadow", (0.175, -0.143, 1.13), (0.012, 0.006, 0.25), shadow)
    add_box(collection, root, f"{spec.character_id}_left_hip_shadow", (-0.152, -0.136, 0.78), (0.012, 0.006, 0.12), shadow, rotation=(0, 0, math.radians(-10)))
    add_box(collection, root, f"{spec.character_id}_right_hip_shadow", (0.152, -0.136, 0.78), (0.012, 0.006, 0.12), shadow, rotation=(0, 0, math.radians(10)))

    for index, z in enumerate([1.3, 1.205, 1.11, 1.015]):
        width = 0.11 + index * 0.015
        add_box(collection, root, f"{spec.character_id}_cloth_fold_left_{index}", (-width, -0.166, z), (0.006, 0.005, 0.045), thread, rotation=(0, 0, math.radians(-4)))
        add_box(collection, root, f"{spec.character_id}_cloth_fold_right_{index}", (width, -0.166, z), (0.006, 0.005, 0.045), thread, rotation=(0, 0, math.radians(4)))

    if spec.prop == "shield":
        add_box(collection, root, f"{spec.character_id}_shield_arm_strap", (-0.365, -0.045, 0.86), (0.018, 0.012, 0.11), leather)
        add_box(collection, root, f"{spec.character_id}_pauldron_trim_left", (-0.31, -0.02, 1.35), (0.055, 0.012, 0.012), metal)
        add_box(collection, root, f"{spec.character_id}_pauldron_trim_right", (0.31, -0.02, 1.35), (0.055, 0.012, 0.012), metal)
    elif spec.prop == "blade":
        add_box(collection, root, f"{spec.character_id}_sword_hand_wrap", (0.39, -0.07, 0.86), (0.03, 0.012, 0.07), leather, rotation=(0, 0, math.radians(12)))
    elif spec.prop == "vial":
        add_box(collection, root, f"{spec.character_id}_satchel_strap", (0.11, -0.165, 1.05), (0.025, 0.012, 0.42), leather, rotation=(0, 0, math.radians(-24)))


def add_stitches(collection, root, spec: CharacterSpec, material) -> None:
    for index in range(6):
        z = 1.34 - index * 0.075
        add_box(collection, root, f"{spec.character_id}_left_seam_{index}", (-0.142, -0.157, z), (0.008, 0.006, 0.027), material, rotation=(0, 0, math.radians(-18)))
        add_box(collection, root, f"{spec.character_id}_right_seam_{index}", (0.142, -0.157, z), (0.008, 0.006, 0.027), material, rotation=(0, 0, math.radians(18)))


def add_fingers(collection, root, spec: CharacterSpec, side: int, skin) -> None:
    hand_x = 0.325 * side
    for index, offset in enumerate([-0.026, -0.008, 0.01, 0.028]):
        length = 0.06 - abs(index - 1.5) * 0.006
        start = (hand_x + offset * side, -0.055, 0.715)
        end = (hand_x + offset * side, -0.082, 0.715 - length)
        limb(collection, root, f"{spec.character_id}_{'right' if side > 0 else 'left'}_finger_{index}", start, end, 0.0075, skin)


def add_hand_anatomy(collection, root, spec: CharacterSpec, side: int, skin, skin_shadow, skin_highlight) -> None:
    label = "right" if side > 0 else "left"
    hand_x = 0.325 * side
    limb(
        collection,
        root,
        f"{spec.character_id}_{label}_thumb",
        (hand_x + 0.036 * side, -0.043, 0.746),
        (hand_x + 0.074 * side, -0.078, 0.708),
        0.009,
        skin,
    )
    add_ellipsoid(
        collection,
        root,
        f"{spec.character_id}_{label}_thumb_pad",
        (hand_x + 0.047 * side, -0.063, 0.724),
        (0.013, 0.007, 0.017),
        skin_shadow,
    )
    add_box(
        collection,
        root,
        f"{spec.character_id}_{label}_palm_life_line",
        (hand_x + 0.01 * side, -0.061, 0.726),
        (0.004, 0.003, 0.032),
        skin_shadow,
        rotation=(0, 0, math.radians(16 * side)),
    )
    for index, offset in enumerate([-0.026, -0.008, 0.01, 0.028]):
        length = 0.06 - abs(index - 1.5) * 0.006
        x = hand_x + offset * side
        nail_z = 0.715 - length - 0.004
        add_ellipsoid(
            collection,
            root,
            f"{spec.character_id}_{label}_knuckle_{index}",
            (x, -0.062, 0.704),
            (0.008, 0.004, 0.006),
            skin_shadow,
        )
        add_box(
            collection,
            root,
            f"{spec.character_id}_{label}_finger_nail_{index}",
            (x, -0.088, nail_z),
            (0.0055, 0.0024, 0.006),
            skin_highlight,
        )


def add_prop(collection, root, spec: CharacterSpec, metal, emissive, leather) -> None:
    if spec.prop == "shield":
        add_ellipsoid(collection, root, f"{spec.character_id}_round_shield", (-0.48, -0.04, 0.94), (0.16, 0.035, 0.24), metal)
        add_torus(collection, root, f"{spec.character_id}_shield_ring", (-0.48, -0.07, 0.94), (math.pi / 2, 0, 0), 0.17, 0.01, emissive)
    elif spec.prop == "jade":
        for idx, x in enumerate([-0.16, 0, 0.16]):
            add_ellipsoid(collection, root, f"{spec.character_id}_jade_charm_{idx}", (x, -0.12, 1.05 - idx * 0.08), (0.035, 0.012, 0.052), emissive)
    elif spec.prop == "blade":
        blade = limb(collection, root, f"{spec.character_id}_violet_blade", (0.43, -0.04, 0.82), (0.65, -0.06, 1.54), 0.018, metal)
        blade.scale.x = 0.34
        add_ellipsoid(collection, root, f"{spec.character_id}_blade_gem", (0.42, -0.052, 0.86), (0.035, 0.012, 0.035), emissive)
    elif spec.prop == "pan":
        add_ellipsoid(collection, root, f"{spec.character_id}_iron_pan", (0.47, -0.07, 0.86), (0.15, 0.026, 0.11), metal)
        limb(collection, root, f"{spec.character_id}_pan_handle", (0.55, -0.08, 0.86), (0.78, -0.09, 0.82), 0.018, leather)
        add_ellipsoid(collection, root, f"{spec.character_id}_cake_relic", (-0.18, -0.12, 1.02), (0.06, 0.018, 0.06), emissive)
    elif spec.prop == "vial":
        add_ellipsoid(collection, root, f"{spec.character_id}_red_vial", (-0.22, -0.125, 1.03), (0.035, 0.014, 0.085), emissive)
        add_ellipsoid(collection, root, f"{spec.character_id}_medic_satchel", (0.22, -0.08, 0.86), (0.095, 0.045, 0.115), leather)
    elif spec.prop == "mask":
        add_torus(collection, root, f"{spec.character_id}_observer_orbit", (0, 0, 1.55), (math.pi / 2, 0, 0), 0.26, 0.006, emissive)
        add_ellipsoid(collection, root, f"{spec.character_id}_sensor_core", (0.19, -0.1, 1.53), (0.035, 0.018, 0.035), emissive)


def add_base(collection, root, spec: CharacterSpec, emissive) -> None:
    bpy.ops.mesh.primitive_cylinder_add(vertices=72, radius=0.42, depth=0.035, location=(0, 0, -0.03))
    base = bpy.context.object
    base.name = f"{spec.character_id}_table_scale_base"
    base.data.materials.append(emissive)
    link_to_collection(base, collection)
    base.parent = root


def add_armature_rig(collection, root, spec: CharacterSpec) -> bpy.types.Object:
    existing = bpy.data.objects.get(f"{spec.character_id}_guide_armature")
    if existing:
        bpy.data.objects.remove(existing, do_unlink=True)

    rig_data = bpy.data.armatures.new(f"{spec.character_id}_guide_armature_data")
    rig = bpy.data.objects.new(f"{spec.character_id}_guide_armature", rig_data)
    collection.objects.link(rig)
    rig.parent = root
    rig.show_in_front = True
    rig.hide_render = True
    rig["bing_rig_status"] = "guide_armature_no_weights"
    rig["bing_rig_bones"] = len(RIG_BONES)

    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    default_bone = rig_data.edit_bones[0] if rig_data.edit_bones else None
    if default_bone:
        rig_data.edit_bones.remove(default_bone)

    bones = {}
    for bone_name, parent_name, head, tail in RIG_BONES:
        bone = rig_data.edit_bones.new(bone_name)
        bone.head = head
        bone.tail = tail
        bone.roll = 0
        bones[bone_name] = bone
        if parent_name:
            bone.parent = bones[parent_name]
            bone.use_connect = False

    bpy.ops.object.mode_set(mode="OBJECT")
    if "--bing-action-poses-only" not in sys.argv and "--bing-face-detail-only" not in sys.argv and "--bing-save-scene-only" not in sys.argv and "--bing-metrics-only" not in sys.argv:
        add_rig_animation_clips(rig, spec)
    return rig


def add_rig_animation_clips(rig: bpy.types.Object, spec: CharacterSpec) -> None:
    rig.animation_data_create()
    while rig.animation_data.nla_tracks:
        rig.animation_data.nla_tracks.remove(rig.animation_data.nla_tracks[0])

    rig["bing_rig_status"] = "guide_armature_keyed_no_weights"
    rig["bing_animation_status"] = "preview_keyframes_no_skin_weights"
    rig["bing_animation_clips"] = ",".join(clip_id for clip_id, _duration in ANIMATION_CLIPS)

    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")

    strip_start = 1
    for clip_id, duration in ANIMATION_CLIPS:
        print(f"BING_RIG_CLIP_KEY_START={spec.character_id}:{clip_id}", flush=True)
        action = bpy.data.actions.new(f"{spec.character_id}_{clip_id}_rig_preview")
        action.use_fake_user = True
        action["bing_clip_id"] = clip_id
        action["bing_clip_duration_frames"] = duration
        rig.animation_data.action = action

        for frame, pose_map in rig_animation_keyframes(spec, clip_id, duration):
            reset_rig_pose(rig)
            apply_rig_pose(rig, pose_map)
            for pose_bone in rig.pose.bones:
                pose_bone.keyframe_insert(data_path="rotation_euler", frame=frame)
                if pose_bone.name == "hips":
                    pose_bone.keyframe_insert(data_path="location", frame=frame)

        smooth_action_curves(action)
        track = rig.animation_data.nla_tracks.new()
        track.name = f"{clip_id}_preview"
        strip = track.strips.new(clip_id, strip_start, action)
        strip.name = clip_id
        strip.frame_start = strip_start
        strip.frame_end = strip_start + duration
        strip_start += duration + 8
        print(f"BING_RIG_CLIP_KEY_DONE={spec.character_id}:{clip_id}", flush=True)

    rig.animation_data.action = None
    reset_rig_pose(rig)
    bpy.ops.object.mode_set(mode="OBJECT")


def add_rigid_skin_weights(root: bpy.types.Object, spec: CharacterSpec, rig: bpy.types.Object) -> None:
    weighted_meshes = 0
    weighted_vertices = 0
    skipped_meshes = 0
    for obj in character_objects(root):
        if obj.type != "MESH":
            continue
        bone_name = skin_bone_for_object(obj, spec)
        if bone_name is None:
            skipped_meshes += 1
            continue

        clear_vertex_groups(obj)
        group = obj.vertex_groups.new(name=bone_name)
        vertex_indices = list(range(len(obj.data.vertices)))
        if vertex_indices:
            group.add(vertex_indices, 1.0, "REPLACE")

        armature = obj.modifiers.get(f"{spec.character_id}_rigid_skin")
        if armature is None:
            armature = obj.modifiers.new(name=f"{spec.character_id}_rigid_skin", type="ARMATURE")
        armature.object = rig
        armature.use_vertex_groups = True
        armature.show_on_cage = True

        obj["bing_skinning"] = "rigid_first_pass"
        obj["bing_skin_bone"] = bone_name
        world_matrix = obj.matrix_world.copy()
        obj.parent = rig
        obj.matrix_world = world_matrix
        weighted_meshes += 1
        weighted_vertices += len(vertex_indices)

    rig["bing_rig_status"] = "rigid_skin_weights"
    rig["bing_skinning_status"] = "rigid_first_pass_needs_weight_paint"
    rig["bing_weighted_meshes"] = weighted_meshes
    rig["bing_weighted_vertices"] = weighted_vertices
    root["bing_skinning_status"] = "rigid_first_pass_needs_weight_paint"
    root["bing_weighted_meshes"] = weighted_meshes
    root["bing_weighted_vertices"] = weighted_vertices
    root["bing_static_meshes"] = skipped_meshes
    print(
        f"BING_CHARACTER_SKIN_WEIGHTS_DONE={spec.character_id}:meshes={weighted_meshes}:vertices={weighted_vertices}:static={skipped_meshes}",
        flush=True,
    )


def clear_vertex_groups(obj: bpy.types.Object) -> None:
    while obj.vertex_groups:
        obj.vertex_groups.remove(obj.vertex_groups[0])


def skin_bone_for_object(obj: bpy.types.Object, spec: CharacterSpec) -> str | None:
    name = obj.name.lower()
    location = obj.matrix_world.translation
    side = ".L" if "_left_" in name or location.x < -0.28 else ".R" if "_right_" in name or location.x > 0.28 else ""

    if "table_scale_base" in name:
        return None
    if "round_shield" in name or "shield_ring" in name:
        return "hand.L"
    if "violet_blade" in name or "blade_gem" in name or "iron_pan" in name or "pan_handle" in name:
        return "hand.R"
    if "red_vial" in name:
        return "hand.L"
    if "medic_satchel" in name or "cake_relic" in name:
        return "hips"
    if "observer_orbit" in name or "sensor_core" in name or "jade_charm" in name:
        return "chest"

    if any(token in name for token in ("finger", "thumb", "hand", "knuckle", "nail")):
        return f"hand{side or ('.L' if location.x < 0 else '.R')}"
    if any(token in name for token in ("forearm", "elbow")):
        return f"forearm{side or ('.L' if location.x < 0 else '.R')}"
    if any(token in name for token in ("upper_arm", "shoulder")):
        return f"upper_arm{side or ('.L' if location.x < 0 else '.R')}"
    if any(token in name for token in ("boot", "foot")):
        return f"foot{side or ('.L' if location.x < 0 else '.R')}"
    if any(token in name for token in ("shin", "calf")):
        return f"shin{side or ('.L' if location.x < 0 else '.R')}"
    if any(token in name for token in ("thigh", "knee")):
        return f"thigh{side or ('.L' if location.x < 0 else '.R')}"
    if any(token in name for token in ("head", "face", "eye", "pupil", "eyelid", "ear", "nose", "cheek", "mouth", "lip", "brow", "chin", "jaw", "hair", "mask", "lens", "forehead", "pore", "tearline", "sclera", "scar")):
        return "head"
    if "neck" in name:
        return "neck"
    if any(token in name for token in ("ribcage", "chest", "collar", "lapel", "torso")):
        return "chest"
    if any(token in name for token in ("abdomen", "belt", "waist", "stitch")):
        return "spine"
    if any(token in name for token in ("pelvis", "coat_tail", "robe", "skirt", "coat")):
        return "hips"

    if abs(location.x) > 0.24 and 0.66 <= location.z <= 1.4:
        fallback_side = ".L" if location.x < 0 else ".R"
        if location.z > 1.12:
            return f"upper_arm{fallback_side}"
        if location.z > 0.82:
            return f"forearm{fallback_side}"
        return f"hand{fallback_side}"
    if abs(location.x) > 0.06 and location.z < 0.72:
        fallback_side = ".L" if location.x < 0 else ".R"
        if location.z < 0.12:
            return f"foot{fallback_side}"
        if location.z < 0.42:
            return f"shin{fallback_side}"
        return f"thigh{fallback_side}"
    if location.z >= 1.58:
        return "head"
    if location.z >= 1.43:
        return "neck"
    if location.z >= 1.12:
        return "chest"
    if location.z >= 0.82:
        return "spine"
    return "hips"


def reset_rig_pose(rig: bpy.types.Object) -> None:
    for pose_bone in rig.pose.bones:
        pose_bone.rotation_mode = "XYZ"
        pose_bone.location = (0, 0, 0)
        pose_bone.rotation_euler = (0, 0, 0)
        pose_bone.scale = (1, 1, 1)


def apply_rig_pose(rig: bpy.types.Object, pose_map: dict[str, dict[str, tuple[float, float, float]]]) -> None:
    for bone_name, values in pose_map.items():
        pose_bone = rig.pose.bones.get(bone_name)
        if not pose_bone:
            continue
        if "rot" in values:
            pose_bone.rotation_euler = tuple(math.radians(value) for value in values["rot"])
        if "loc" in values:
            pose_bone.location = values["loc"]


def rig_animation_keyframes(spec: CharacterSpec, clip_id: str, duration: int) -> list[tuple[int, dict[str, dict[str, tuple[float, float, float]]]]]:
    lead = ".L" if spec.prop == "shield" else ".R"
    off = ".R" if lead == ".L" else ".L"

    if clip_id == "idle":
        return [
            (1, {}),
            (duration // 2, {"spine": {"rot": (1.5, 0, -1.5)}, "chest": {"rot": (-1.5, 0, 2.5)}, f"upper_arm{lead}": {"rot": (2, 0, -4)}, f"upper_arm{off}": {"rot": (1, 0, 3)}}),
            (duration, {}),
        ]

    if clip_id == "attack":
        lead_sign = -1 if lead == ".L" else 1
        return [
            (1, {}),
            (8, {"hips": {"rot": (0, 0, -7 * lead_sign), "loc": (0, -0.015, 0)}, "spine": {"rot": (-5, 0, -10 * lead_sign)}, "chest": {"rot": (-7, 0, -16 * lead_sign)}, f"upper_arm{lead}": {"rot": (-58, 0, -24 * lead_sign)}, f"forearm{lead}": {"rot": (-36, 0, -12 * lead_sign)}, f"hand{lead}": {"rot": (-14, 0, -8 * lead_sign)}}),
            (14, {"hips": {"rot": (0, 0, 10 * lead_sign), "loc": (0.02 * lead_sign, -0.045, 0)}, "spine": {"rot": (7, 0, 11 * lead_sign)}, "chest": {"rot": (9, 0, 20 * lead_sign)}, f"upper_arm{lead}": {"rot": (-16, 0, 34 * lead_sign)}, f"forearm{lead}": {"rot": (-18, 0, 24 * lead_sign)}, f"hand{lead}": {"rot": (-8, 0, 20 * lead_sign)}}),
            (duration, {}),
        ]

    if clip_id == "defend":
        return [
            (1, {}),
            (12, {"hips": {"rot": (-2, 0, 0), "loc": (0, 0.01, -0.01)}, "spine": {"rot": (5, 0, 0)}, "chest": {"rot": (8, 0, 0)}, "upper_arm.L": {"rot": (-42, 0, -22)}, "forearm.L": {"rot": (-28, 0, -16)}, "upper_arm.R": {"rot": (-42, 0, 22)}, "forearm.R": {"rot": (-28, 0, 16)}}),
            (duration, {"hips": {"loc": (0, 0.005, 0)}, "spine": {"rot": (2, 0, 0)}, "chest": {"rot": (4, 0, 0)}}),
        ]

    if clip_id == "skill":
        return [
            (1, {}),
            (18, {"hips": {"loc": (0, -0.01, 0.018)}, "spine": {"rot": (-4, 0, 0)}, "chest": {"rot": (-9, 0, 0)}, "upper_arm.L": {"rot": (-76, 0, -34)}, "forearm.L": {"rot": (-34, 0, -16)}, "hand.L": {"rot": (-18, 0, -8)}, "upper_arm.R": {"rot": (-76, 0, 34)}, "forearm.R": {"rot": (-34, 0, 16)}, "hand.R": {"rot": (-18, 0, 8)}}),
            (duration, {}),
        ]

    if clip_id == "hit":
        return [
            (1, {}),
            (6, {"hips": {"rot": (0, 0, 9), "loc": (0.025, 0.018, 0)}, "spine": {"rot": (12, 0, 9)}, "chest": {"rot": (18, 0, 12)}, "upper_arm.L": {"rot": (18, 0, -10)}, "forearm.L": {"rot": (16, 0, -14)}, "upper_arm.R": {"rot": (18, 0, 10)}, "forearm.R": {"rot": (16, 0, 14)}}),
            (duration, {}),
        ]

    if clip_id == "down":
        return [
            (1, {}),
            (14, {"hips": {"rot": (48, 0, -12), "loc": (0, -0.12, -0.14)}, "spine": {"rot": (36, 0, -8)}, "chest": {"rot": (28, 0, -6)}, "neck": {"rot": (-14, 0, 4)}, "upper_arm.L": {"rot": (36, 0, -20)}, "forearm.L": {"rot": (22, 0, -12)}, "upper_arm.R": {"rot": (34, 0, 24)}, "forearm.R": {"rot": (28, 0, 18)}}),
            (duration, {"hips": {"rot": (92, 0, -18), "loc": (0, -0.46, -0.52)}, "spine": {"rot": (64, 0, -10)}, "chest": {"rot": (46, 0, -8)}, "neck": {"rot": (-32, 0, 6)}, "thigh.L": {"rot": (-26, 0, -10)}, "shin.L": {"rot": (28, 0, 6)}, "thigh.R": {"rot": (-20, 0, 12)}, "shin.R": {"rot": (30, 0, -7)}, "upper_arm.L": {"rot": (62, 0, -38)}, "forearm.L": {"rot": (32, 0, -20)}, "upper_arm.R": {"rot": (54, 0, 34)}, "forearm.R": {"rot": (38, 0, 22)}}),
        ]

    return [(1, {}), (duration, {})]


def smooth_action_curves(action: bpy.types.Action) -> None:
    for curve in action.fcurves:
        for keyframe in curve.keyframe_points:
            keyframe.interpolation = "BEZIER"


def add_gallery_floor() -> None:
    floor_mat = mat("matte_abyss_floor", "#101512", roughness=0.92)
    bpy.ops.mesh.primitive_plane_add(size=14, location=(0, 0, -0.055))
    floor = bpy.context.object
    floor.name = "bing_character_blockout_floor"
    floor.data.materials.append(floor_mat)


def add_camera_and_lights() -> None:
    bpy.ops.object.light_add(type="AREA", location=(0, -3.6, 3.8))
    key = bpy.context.object
    key.name = "softbox_key_light"
    key.data.energy = 540
    key.data.size = 4.2

    bpy.ops.object.light_add(type="POINT", location=(-2.8, 2.2, 2.4))
    rim = bpy.context.object
    rim.name = "teal_relic_rim_light"
    rim.data.energy = 170
    rim.data.color = (0.55, 0.95, 0.86)

    bpy.ops.object.camera_add(location=(0, -4.2, 1.28), rotation=(math.radians(75), 0, 0))
    camera = bpy.context.object
    camera.name = "portrait_camera"
    camera.data.lens = 58
    bpy.context.scene.camera = camera


def export_character(spec: CharacterSpec, roots: dict[str, bpy.types.Object]) -> tuple[int, int]:
    root = roots[spec.character_id]
    original_location = root.location.copy()
    original_rotation = root.rotation_euler.copy()
    set_isolated(spec.character_id, roots)
    root.location = (0, 0, 0)
    root.rotation_euler = (0, 0, 0)

    out_dir = ASSET_ROOT / spec.character_id
    (out_dir / "source").mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in character_objects(root):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=str(out_dir / f"{spec.character_id}.glb"),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_animation_mode="NLA_TRACKS",
        export_nla_strips=True,
        export_extra_animations=False,
    )
    lod1_metrics = export_lod1_character(spec, root, out_dir)

    root.location = original_location
    root.rotation_euler = original_rotation
    set_all_visible(roots)
    return lod1_metrics


def export_lod1_character(spec: CharacterSpec, root: bpy.types.Object, out_dir: Path) -> tuple[int, int]:
    stale_collection = bpy.data.collections.get(f"BING_{spec.character_id}_lod1_export")
    if stale_collection:
        for obj in list(stale_collection.objects):
            mesh = obj.data if obj.type == "MESH" else None
            bpy.data.objects.remove(obj, do_unlink=True)
            if mesh and mesh.users == 0:
                bpy.data.meshes.remove(mesh)
        bpy.data.collections.remove(stale_collection)

    lod_collection = bpy.data.collections.new(f"BING_{spec.character_id}_lod1_export")
    bpy.context.scene.collection.children.link(lod_collection)
    lod_root = bpy.data.objects.new(f"{spec.character_id}_lod1_root", None)
    lod_collection.objects.link(lod_root)

    duplicates: list[bpy.types.Object] = [lod_root]
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in character_objects(root):
        if obj == root or obj.type != "MESH":
            continue
        duplicate = obj.copy()
        duplicate.data = obj.data.copy()
        duplicate.name = f"{obj.name}_lod1"
        duplicate.parent = lod_root
        duplicate.matrix_world = obj.matrix_world.copy()
        for modifier in list(duplicate.modifiers):
            if modifier.type == "ARMATURE":
                duplicate.modifiers.remove(modifier)
        clear_vertex_groups(duplicate)
        lod_collection.objects.link(duplicate)
        duplicates.append(duplicate)
        if len(duplicate.data.polygons) > 12:
            decimate = duplicate.modifiers.new(name=f"{duplicate.name}_decimate", type="DECIMATE")
            decimate.ratio = LOD1_DECIMATE_RATIO
            if hasattr(decimate, "use_collapse_triangulate"):
                decimate.use_collapse_triangulate = True
            bpy.context.view_layer.update()
            original_mesh = duplicate.data
            evaluated = duplicate.evaluated_get(depsgraph)
            decimated_mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=depsgraph)
            decimated_mesh.name = f"{duplicate.name}_mesh"
            duplicate.modifiers.clear()
            duplicate.data = decimated_mesh
            if original_mesh.users == 0:
                bpy.data.meshes.remove(original_mesh)

    vertices, faces = mesh_metrics(lod_root)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in duplicates:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = lod_root
    override = {
        "active_object": lod_root,
        "object": lod_root,
        "selected_objects": duplicates,
        "selected_editable_objects": duplicates,
        "scene": bpy.context.scene,
        "view_layer": bpy.context.view_layer,
    }
    if bpy.context.window:
        override["window"] = bpy.context.window
    if bpy.context.screen:
        override["screen"] = bpy.context.screen
    if bpy.context.area:
        override["area"] = bpy.context.area
    if bpy.context.region:
        override["region"] = bpy.context.region
    with bpy.context.temp_override(**override):
        bpy.ops.export_scene.gltf(
            filepath=str(out_dir / f"{spec.character_id}-lod1.glb"),
            export_format="GLB",
            use_selection=True,
            export_apply=True,
        )

    for obj in list(duplicates):
        mesh = obj.data if obj.type == "MESH" else None
        bpy.data.objects.remove(obj, do_unlink=True)
        if mesh and mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    bpy.data.collections.remove(lod_collection)
    return vertices, faces


def render_character_views(spec: CharacterSpec, roots: dict[str, bpy.types.Object]) -> None:
    root = roots[spec.character_id]
    out_dir = ASSET_ROOT / spec.character_id
    out_dir.mkdir(parents=True, exist_ok=True)
    original_location = root.location.copy()
    original_rotation = root.rotation_euler.copy()
    set_isolated(spec.character_id, roots)
    root.location = (0, 0, 0)

    views = [
        ("portrait", 0, 86, (0, -2.25, 1.54), (0, 0, 1.49)),
        ("mobile-avatar", 0, 82, (0, -2.55, 1.52), (0, 0, 1.48)),
        ("turnaround-front", 0, 58, (0, -4.25, 1.28), (0, 0, 0.96)),
        ("turnaround-side", math.radians(90), 58, (0, -4.25, 1.28), (0, 0, 0.96)),
        ("turnaround-three-quarter", math.radians(-38), 58, (0, -4.25, 1.28), (0, 0, 0.96)),
        ("table-scale", math.radians(-26), 72, (0, -5.2, 2.25), (0, 0, 0.82)),
    ]
    camera = bpy.context.scene.camera
    for name, angle, lens, camera_location, target in views:
        root.rotation_euler = (0, 0, angle)
        camera.location = camera_location
        camera.data.lens = lens
        look_at(camera, mathutils.Vector(target))
        bpy.context.scene.render.filepath = str(out_dir / f"{name}.png")
        bpy.ops.render.render(write_still=True)

    root.location = original_location
    root.rotation_euler = original_rotation
    set_all_visible(roots)


def render_face_detail_view(spec: CharacterSpec, roots: dict[str, bpy.types.Object]) -> None:
    root = roots[spec.character_id]
    out_dir = ASSET_ROOT / spec.character_id
    out_dir.mkdir(parents=True, exist_ok=True)
    set_isolated(spec.character_id, roots)
    snapshot = capture_transforms(character_objects(root))
    scene = bpy.context.scene
    original_resolution = (scene.render.resolution_x, scene.render.resolution_y)
    original_engine = scene.render.engine
    shading = scene.display.shading
    original_color_type = shading.color_type
    original_light = shading.light
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.engine = "BLENDER_WORKBENCH"
    shading.color_type = "MATERIAL"
    shading.light = "STUDIO"
    root.location = (0, 0, 0)
    root.rotation_euler = (0, 0, 0)

    camera = scene.camera
    camera.location = (0, -1.28, 1.72)
    camera.data.lens = 118
    look_at(camera, mathutils.Vector((0, -0.118, 1.715)))
    scene.render.filepath = str(out_dir / "face-detail.png")
    bpy.ops.render.render(write_still=True)

    restore_transforms(snapshot)
    scene.render.engine = original_engine
    shading.color_type = original_color_type
    shading.light = original_light
    scene.render.resolution_x, scene.render.resolution_y = original_resolution
    set_all_visible(roots)


def render_action_pose_views(
    spec: CharacterSpec,
    roots: dict[str, bpy.types.Object],
    pose_filter: set[str] | None = None,
) -> None:
    root = roots[spec.character_id]
    out_dir = ASSET_ROOT / spec.character_id
    out_dir.mkdir(parents=True, exist_ok=True)
    set_isolated(spec.character_id, roots)
    objects = character_objects(root)
    snapshot = capture_transforms(objects)
    scene = bpy.context.scene
    original_resolution = (scene.render.resolution_x, scene.render.resolution_y)
    original_engine = scene.render.engine
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    if fast_action_render_enabled():
        scene.render.engine = "BLENDER_WORKBENCH"
    camera = scene.camera

    for pose_id, _label in ACTION_POSES:
        if pose_filter is not None and pose_id not in pose_filter:
            continue
        print(f"BING_ACTION_POSE_RENDER_START={spec.character_id}:{pose_id}", flush=True)
        restore_transforms(snapshot)
        root.location = (0, 0, 0)
        root.rotation_euler = (0, 0, 0)
        apply_action_pose(root, spec, pose_id)
        if pose_id == "down":
            camera.location = (0, -4.35, 0.92)
            camera.data.lens = 66
            look_at(camera, mathutils.Vector((0, -0.08, 0.42)))
        else:
            camera.location = (0, -4.55, 1.32)
            camera.data.lens = 70
            look_at(camera, mathutils.Vector((0, 0, 1.02)))
        scene.render.filepath = str(out_dir / f"action-{pose_id}.png")
        bpy.ops.render.render(write_still=True)
        print(f"BING_ACTION_POSE_RENDER_DONE={spec.character_id}:{pose_id}", flush=True)

    restore_transforms(snapshot)
    scene.render.engine = original_engine
    scene.render.resolution_x, scene.render.resolution_y = original_resolution
    set_all_visible(roots)


def render_rig_guide_view(spec: CharacterSpec, roots: dict[str, bpy.types.Object]) -> None:
    root = roots[spec.character_id]
    collection = root.users_collection[0]
    out_dir = ASSET_ROOT / spec.character_id
    out_dir.mkdir(parents=True, exist_ok=True)
    set_isolated(spec.character_id, roots)
    snapshot = capture_transforms(character_objects(root))
    scene = bpy.context.scene
    original_resolution = (scene.render.resolution_x, scene.render.resolution_y)
    original_engine = scene.render.engine
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    if fast_action_render_enabled():
        scene.render.engine = "BLENDER_WORKBENCH"
    root.location = (0, 0, 0)
    root.rotation_euler = (0, 0, 0)

    material = bpy.data.materials.get("rig_guide_cyan") or mat("rig_guide_cyan", "#74d8ff", roughness=0.35, emission=0.5, detail="emissive")
    overlays: list[bpy.types.Object] = []
    for bone_name, _parent_name, head, tail in RIG_BONES:
        overlays.append(limb(collection, root, f"{spec.character_id}_rig_overlay_{bone_name}", rig_overlay_point(head), rig_overlay_point(tail), 0.0085, material))
        overlays.append(add_ellipsoid(collection, root, f"{spec.character_id}_rig_joint_{bone_name}", rig_overlay_point(head), (0.016, 0.016, 0.016), material))
    overlays.append(add_ellipsoid(collection, root, f"{spec.character_id}_rig_joint_head_tip", rig_overlay_point(RIG_BONES[4][3]), (0.017, 0.017, 0.017), material))

    camera = scene.camera
    camera.location = (0, -4.65, 1.18)
    camera.data.lens = 64
    look_at(camera, mathutils.Vector((0, 0, 0.95)))
    scene.render.filepath = str(out_dir / "rig-guide.png")
    bpy.ops.render.render(write_still=True)

    for obj in overlays:
        mesh = obj.data if obj.type == "MESH" else None
        bpy.data.objects.remove(obj, do_unlink=True)
        if mesh and mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    restore_transforms(snapshot)
    scene.render.engine = original_engine
    scene.render.resolution_x, scene.render.resolution_y = original_resolution
    set_all_visible(roots)


def render_skinning_preview_views(
    spec: CharacterSpec,
    roots: dict[str, bpy.types.Object],
    pose_filter: set[str] | None = None,
) -> None:
    root = roots[spec.character_id]
    rig = bpy.data.objects.get(f"{spec.character_id}_guide_armature")
    if rig is None:
        print(f"BING_SKINNING_PREVIEW_SKIP={spec.character_id}:missing-rig", flush=True)
        return

    out_dir = ASSET_ROOT / spec.character_id
    out_dir.mkdir(parents=True, exist_ok=True)
    set_isolated(spec.character_id, roots)
    objects = character_objects(root)
    snapshot = capture_transforms(objects)
    scene = bpy.context.scene
    original_resolution = (scene.render.resolution_x, scene.render.resolution_y)
    original_engine = scene.render.engine
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    if fast_action_render_enabled():
        scene.render.engine = "BLENDER_WORKBENCH"
    camera = scene.camera

    for pose_id in SKINNING_PREVIEW_POSES:
        if pose_filter is not None and pose_id not in pose_filter:
            continue
        print(f"BING_SKINNING_PREVIEW_POSE_RENDER_START={spec.character_id}:{pose_id}", flush=True)
        restore_transforms(snapshot)
        reset_rig_pose(rig)
        root.location = (0, 0, 0)
        root.rotation_euler = (0, 0, 0)
        apply_rig_preview_pose(rig, spec, pose_id)
        bpy.context.view_layer.update()
        overlays = add_pose_rig_overlays(root, rig, spec, pose_id)
        if pose_id == "down":
            camera.location = (2.05, -3.35, 1.02)
            camera.data.lens = 62
            look_at(camera, mathutils.Vector((0, -0.1, 0.58)))
        else:
            camera.location = (1.05, -4.3, 1.32)
            camera.data.lens = 70
            look_at(camera, mathutils.Vector((0, 0, 1.03)))
        scene.render.filepath = str(out_dir / f"skin-preview-{pose_id}.png")
        bpy.ops.render.render(write_still=True)
        remove_objects(overlays)
        print(f"BING_SKINNING_PREVIEW_POSE_RENDER_DONE={spec.character_id}:{pose_id}", flush=True)

    reset_rig_pose(rig)
    restore_transforms(snapshot)
    scene.render.engine = original_engine
    scene.render.resolution_x, scene.render.resolution_y = original_resolution
    set_all_visible(roots)


def apply_rig_preview_pose(rig: bpy.types.Object, spec: CharacterSpec, pose_id: str) -> None:
    duration = dict(ANIMATION_CLIPS).get(pose_id, 24)
    keyframes = rig_animation_keyframes(spec, pose_id, duration)
    keyed = [pose_map for _frame, pose_map in keyframes if pose_map]
    if not keyed:
        return
    impact_poses = {"attack", "down"}
    apply_rig_pose(rig, keyed[-1] if pose_id in impact_poses else keyed[0])


def add_pose_rig_overlays(
    root: bpy.types.Object,
    rig: bpy.types.Object,
    spec: CharacterSpec,
    pose_id: str,
) -> list[bpy.types.Object]:
    collection = root.users_collection[0]
    material = bpy.data.materials.get("skinning_pose_qa_amber") or mat("skinning_pose_qa_amber", "#ffd166", roughness=0.4, emission=0.55, detail="emissive")
    overlays: list[bpy.types.Object] = []
    for bone_name, _parent_name, _head, _tail in RIG_BONES:
        pose_bone = rig.pose.bones.get(bone_name)
        if pose_bone is None:
            continue
        head = rig.matrix_world @ pose_bone.head
        tail = rig.matrix_world @ pose_bone.tail
        overlays.append(limb(collection, root, f"{spec.character_id}_{pose_id}_skin_pose_bone_{bone_name}", head, tail, 0.0065, material))
        overlays.append(add_ellipsoid(collection, root, f"{spec.character_id}_{pose_id}_skin_pose_joint_{bone_name}", head, (0.012, 0.012, 0.012), material))
    return overlays


def remove_objects(objects: list[bpy.types.Object]) -> None:
    for obj in objects:
        mesh = obj.data if obj.type == "MESH" else None
        bpy.data.objects.remove(obj, do_unlink=True)
        if mesh and mesh.users == 0:
            bpy.data.meshes.remove(mesh)


def rig_overlay_point(point: tuple[float, float, float]) -> tuple[float, float, float]:
    return (point[0], point[1] - 0.13, point[2])


def apply_action_pose(root: bpy.types.Object, spec: CharacterSpec, pose_id: str) -> None:
    if pose_id == "idle":
        root.rotation_euler.z = math.radians(-4)
        return

    if pose_id == "attack":
        leading_side = -1 if spec.prop == "shield" else 1
        side_name = "right" if leading_side > 0 else "left"
        root.rotation_euler.z = math.radians(-10 * leading_side)
        nudge_pose_parts(root, [f"{side_name}_upper_arm", f"{side_name}_forearm"], location=(0.014 * leading_side, -0.052, 0.04), rotation=(math.radians(-6), 0, math.radians(-10 * leading_side)))
        nudge_pose_parts(root, [f"{side_name}_hand", f"{side_name}_finger", f"{side_name}_thumb", f"{side_name}_knuckle", f"{side_name}_nail"], location=(0.024 * leading_side, -0.065, 0.052), rotation=(math.radians(-7), 0, math.radians(-9 * leading_side)))
        nudge_pose_parts(root, prop_pose_tokens(spec), location=(0.025 * leading_side, -0.055, 0.045), rotation=(math.radians(-4), 0, math.radians(-6 * leading_side)))
        return

    if pose_id == "defend":
        root.rotation_euler.z = math.radians(5)
        for side in [-1, 1]:
            side_name = "right" if side > 0 else "left"
            nudge_pose_parts(root, [f"{side_name}_upper_arm", f"{side_name}_forearm"], location=(0.028 * side, -0.055, 0.04), rotation=(math.radians(5), 0, math.radians(11 * side)))
            nudge_pose_parts(root, [f"{side_name}_hand", f"{side_name}_finger", f"{side_name}_thumb", f"{side_name}_knuckle", f"{side_name}_nail"], location=(0.036 * side, -0.075, 0.045), rotation=(math.radians(5), 0, math.radians(8 * side)))
        nudge_pose_parts(root, ["round_shield", "shield_ring", "shield_arm_strap"], location=(0.02, -0.12, 0.13), rotation=(math.radians(8), 0, math.radians(-8)))
        return

    if pose_id == "skill":
        root.scale.z *= 1.02
        for side in [-1, 1]:
            side_name = "right" if side > 0 else "left"
            nudge_pose_parts(root, [f"{side_name}_upper_arm", f"{side_name}_forearm"], location=(0.018 * side, -0.035, 0.075), rotation=(math.radians(-12), 0, math.radians(12 * side)))
            nudge_pose_parts(root, [f"{side_name}_hand", f"{side_name}_finger", f"{side_name}_thumb", f"{side_name}_knuckle", f"{side_name}_nail"], location=(0.024 * side, -0.052, 0.09), rotation=(math.radians(-14), 0, math.radians(10 * side)))
        nudge_pose_parts(root, prop_pose_tokens(spec) + ["relic", "glow", "jade", "vial", "sensor"], location=(0, -0.018, 0.035), rotation=(math.radians(-3), 0, 0))
        return

    if pose_id == "hit":
        root.rotation_euler.z = math.radians(12)
        root.location.x = 0.035
        for side in [-1, 1]:
            side_name = "right" if side > 0 else "left"
            nudge_pose_parts(root, [f"{side_name}_forearm", f"{side_name}_hand", f"{side_name}_finger", f"{side_name}_thumb", f"{side_name}_knuckle", f"{side_name}_nail"], location=(0.014 * side, 0.018, -0.04), rotation=(math.radians(10), 0, math.radians(6 * side)))
        return

    if pose_id == "down":
        root.location.y = -0.12
        root.location.z = 0.28
        root.rotation_euler.x = math.radians(72)
        root.rotation_euler.z = math.radians(-15)
        for side in [-1, 1]:
            side_name = "right" if side > 0 else "left"
            nudge_pose_parts(root, [f"{side_name}_upper_arm", f"{side_name}_forearm"], location=(0.02 * side, 0.04, -0.045), rotation=(math.radians(22), 0, math.radians(18 * side)))
            nudge_pose_parts(root, [f"{side_name}_hand", f"{side_name}_finger", f"{side_name}_thumb", f"{side_name}_knuckle", f"{side_name}_nail"], location=(0.026 * side, 0.055, -0.06), rotation=(math.radians(20), 0, math.radians(14 * side)))
            nudge_pose_parts(root, [f"{side_name}_thigh", f"{side_name}_shin", f"{side_name}_foot"], location=(0.018 * side, -0.015, 0.025), rotation=(math.radians(-14), 0, math.radians(8 * side)))
        nudge_pose_parts(root, prop_pose_tokens(spec), location=(0, 0.025, -0.035), rotation=(math.radians(12), 0, math.radians(-10)))


def prop_pose_tokens(spec: CharacterSpec) -> list[str]:
    return {
        "shield": ["round_shield", "shield_ring", "shield_arm_strap"],
        "jade": ["jade_charm", "jade_hair_ring", "long_scarf"],
        "blade": ["violet_blade", "blade_gem", "sword_hand_wrap"],
        "pan": ["iron_pan", "pan_handle", "cake_relic"],
        "vial": ["red_vial", "medic_satchel", "satchel_strap"],
        "mask": ["observer_orbit", "sensor_core", "chest_scope"],
    }.get(spec.prop, [])


def nudge_pose_parts(
    root: bpy.types.Object,
    tokens: list[str],
    location: tuple[float, float, float] = (0.0, 0.0, 0.0),
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> None:
    for obj in character_objects(root):
        if obj == root or not any(token in obj.name for token in tokens):
            continue
        obj.location.x += location[0]
        obj.location.y += location[1]
        obj.location.z += location[2]
        obj.rotation_euler.x += rotation[0]
        obj.rotation_euler.y += rotation[1]
        obj.rotation_euler.z += rotation[2]


def capture_transforms(objects: list[bpy.types.Object]) -> dict[bpy.types.Object, tuple[mathutils.Vector, mathutils.Euler, mathutils.Vector]]:
    return {obj: (obj.location.copy(), obj.rotation_euler.copy(), obj.scale.copy()) for obj in objects}


def restore_transforms(snapshot: dict[bpy.types.Object, tuple[mathutils.Vector, mathutils.Euler, mathutils.Vector]]) -> None:
    for obj, (location, rotation, scale) in snapshot.items():
        obj.location = location.copy()
        obj.rotation_euler = rotation.copy()
        obj.scale = scale.copy()


def render_material_qa_board() -> None:
    out_dir = ASSET_ROOT / "materials"
    out_dir.mkdir(parents=True, exist_ok=True)
    swatches = [
        ("skin", "skin_warm_semireal", "#d8a27f", 0.72),
        ("cloth", "deep_abyss_cloth", "#171b18", 0.88),
        ("leather", "worn_dark_leather", "#342017", 0.84),
        ("metal", "ember-guardian_aged_metal", "#c89b4a", 0.38),
        ("hair", "dark_hair", "#17100d", 0.82),
    ]
    tile = 128
    gutter = 16
    width = gutter + 3 * tile + 4 * gutter
    height = gutter + len(swatches) * tile + (len(swatches) + 1) * gutter
    image = bpy.data.images.new(name="material_qa_contact_sheet", width=width, height=height, alpha=True)
    pixels = [0.02, 0.035, 0.032, 1.0] * (width * height)

    for row, (detail, material_name, hex_color, roughness) in enumerate(swatches):
        color = hex_to_rgba(hex_color)
        for col, kind in enumerate(["albedo", "normal", "roughness"]):
            offset_x = gutter + col * (tile + gutter)
            offset_y = gutter + row * (tile + gutter)
            for y in range(tile):
                for x in range(tile):
                    u = x / max(tile - 1, 1)
                    v = y / max(tile - 1, 1)
                    rgba = material_sample_rgba(kind, detail, color, roughness, u, v)
                    target_x = offset_x + x
                    target_y = height - 1 - (offset_y + y)
                    pixel_index = (target_y * width + target_x) * 4
                    pixels[pixel_index : pixel_index + 4] = rgba
        ensure_pbr_texture_pack(material_name, detail, hex_to_rgba(hex_color), roughness)

    image.pixels = pixels
    image.filepath_raw = str(out_dir / "material-qa.png")
    image.file_format = "PNG"
    image.save()
    bpy.data.images.remove(image)


def write_report(scene_path: Path, roots: dict[str, bpy.types.Object], lod1_metrics: dict[str, tuple[int, int]], animation_pass_only: bool = False) -> None:
    rows = []
    review_rows = []
    pbr_texture_count = len(list(PBR_TEXTURE_ROOT.rglob("*.png"))) if PBR_TEXTURE_ROOT.exists() else 0
    pose_ids = " / ".join(pose_id for pose_id, _label in ACTION_POSES)
    animation_clip_ids = " / ".join(clip_id for clip_id, _duration in ANIMATION_CLIPS)
    generation_mode = "animation pass" if animation_pass_only else "full asset pass"
    for spec in CHARACTERS:
        out_dir = ASSET_ROOT / spec.character_id
        vertex_count, face_count = mesh_metrics(roots[spec.character_id])
        lod1_vertices, lod1_faces = lod1_metrics[spec.character_id]
        lod0_budget_state = "通过" if face_count <= LOD0_FACE_BUDGET else "超出"
        lod1_budget_state = "通过" if lod1_faces <= LOD1_FACE_BUDGET else "超出"
        rows.append(
            f"| `{spec.character_id}` | {spec.name} | {spec.role} | {spec.silhouette} | "
            f"`{repo_path(out_dir)}/{spec.character_id}.glb` | "
            f"`{repo_path(out_dir)}/{spec.character_id}-lod1.glb` | "
            f"`{repo_path(out_dir)}/portrait.png` |"
        )
        review_rows.append(
            f"| `{spec.character_id}` | {spec.name} | {vertex_count} | {face_count} | {lod0_budget_state} | "
            f"{lod1_vertices} | {lod1_faces} | {lod1_budget_state} | "
            f"`{repo_path(out_dir)}/mobile-avatar.png` | `{repo_path(out_dir)}/table-scale.png` |"
        )

    report = f"""# BING 角色 Blender 初模报告

日期：2026-06-13

本轮通过 Blender MCP / Blender Python 执行 `tools/blender/create-bing-character-blockouts.py`，模式：`{generation_mode}`，为默认 6 个角色生成半写实比例、解剖优化与动画预览资产。

## 输出

- Blender 源场景：`{repo_path(scene_path)}`
- 每个角色导出 LOD0 `.glb` 和 LOD1 `-lod1.glb`
- 每个角色导出 `portrait.png`、`mobile-avatar.png`、`turnaround-front.png`、`turnaround-side.png`、`turnaround-three-quarter.png`、`table-scale.png`
- 每个角色导出动作剪影 QA：`{pose_ids}`
- 每个角色建立 `{len(RIG_BONES)}` 根骨骼的 guide armature，并导出 `rig-guide.png`
- 每个角色写入 first-pass rigid skin weights，LOD0 GLB 已具备 skinned mesh 结构；仍需手工权重绘制与动作精修
- 每个 guide armature 写入预览动画 clips：`{animation_clip_ids}`；当前为关键帧预览，可驱动 rigid skin 初版
- 每个角色导出骨骼驱动蒙皮 QA：`skin-preview-attack / skin-preview-skill / skin-preview-hit / skin-preview-down`，琥珀骨架为目标姿态 overlay
- 建模：连续面部 sculpt surface、眼袋/法令/耳廓细节、手部拇指/指节/指甲、职业道具和服装层次
- PBR 贴图目录：`{repo_path(PBR_TEXTURE_ROOT)}`，当前 `{pbr_texture_count}` 张 PNG
- 材质近景 QA：`{repo_path(ASSET_ROOT / "materials" / "material-qa.png")}`
- 面部近景 QA：每角色导出 `face-detail.png`，用于检查眼球湿润高光、皮肤毛孔/小斑点、唇部阴影和面具磨损。

| id | 中文名 | 定位 | 剪影方向 | LOD0 GLB | LOD1 GLB | 头像 |
| --- | --- | --- | --- | --- | --- | --- |
{chr(10).join(rows)}

## 美术判断

当前资产是“半写实游戏角色初模”，不是最终真人级模型。它解决的是头身比例、连续脸部体块、手部可读性、职业剪影、主色、关键道具和导出链路；后续还需要高模/雕刻/贴图/绑定/动画。

## P0

- 用高模或授权基底替换当前程序化脸部表面，继续减少“拼装感”。
- 用移动端头像裁切检查脸部、职业道具和剪影是否还可读。

## P1

- 将 `characters.ts` 的 avatarUrl 从 placeholder SVG 切换到经过确认的 `portrait.png`。
- 为 3D 牌桌接入 `.glb` 角色，而不是继续用程序生成角色几何。

## P2

- 将 first-pass rigid skin weights 升级为精细权重绘制，并继续用 `skin-preview-*` 检查攻击、技能、受击、倒地的剪影和穿插。
- 建立每个角色的材质板和服装局部参考。
"""
    (ARTIFACT_ROOT / "bing-character-blockouts-report.md").write_text(report, encoding="utf-8")
    review = f"""# BING 角色资产审计

日期：2026-06-13

本审计由 `tools/blender/create-bing-character-blockouts.py` 通过 Blender MCP / Blender Python 生成。当前目标是把默认玩家角色推进到“接近真人比例的半写实游戏角色”，不是最终真人级高模。

## 当前产物

- 源场景：`{repo_path(scene_path)}`
- 每角色：LOD0 `.glb`、LOD1 `-lod1.glb`、头像、移动端头像、正面、侧面、3/4、桌面距离 QA 图
- 动作 QA：每角色 `{pose_ids}` 动作剪影图
- 绑定准备：每角色 `{len(RIG_BONES)}` 根骨骼 guide armature、`rig-guide.png`、first-pass rigid skin weights、`skin-preview-*.png` 与 `{animation_clip_ids}` 预览动画 clips
- 建模：连续面部 sculpt surface、眼袋/法令/耳廓细节、手部拇指/指节/指甲、服装层次和职业道具
- 材质：皮肤、布料、皮革、金属、头发均带程序化 micro-bump、roughness variation 和导出的 albedo/normal/roughness PNG
- PBR 贴图目录：`{repo_path(PBR_TEXTURE_ROOT)}`，当前 `{pbr_texture_count}` 张 PNG
- 材质近景 QA：`{repo_path(ASSET_ROOT / "materials" / "material-qa.png")}`
- 面部近景 QA：每角色导出 `face-detail.png`，用于检查眼球湿润高光、皮肤毛孔/小斑点、唇部阴影和面具磨损。
- 预算：LOD0 不超过 {LOD0_FACE_BUDGET} faces；LOD1 不超过 {LOD1_FACE_BUDGET} faces

| id | 中文名 | LOD0 vertices | LOD0 faces | LOD0 预算 | LOD1 vertices | LOD1 faces | LOD1 预算 | 移动头像 QA | 桌面距离 QA |
| --- | --- | ---: | ---: | --- | ---: | ---: | --- | --- | --- |
{chr(10).join(review_rows)}

## 美术判断

- 已完成：统一 7-7.5 头身比例、角色体型差异、连续面部 sculpt surface、眼袋/法令/耳廓、手部拇指/指节/指甲、发型/头饰、服装层次、职业道具、guide armature、first-pass rigid skin weights、骨骼驱动蒙皮 QA、预览动画 clips、LOD1、移动端头像、桌面距离渲染、动作剪影 QA、材质近景 QA 和可追踪 PBR 贴图文件。
- 仍不足：还没有真实高模雕刻、手工/烘焙贴图、精细权重绘制和可播放精修动画；真人质感仍需外部雕刻/贴图阶段继续推进。

## 运行时验收

- 静态资产审计：`npm run test:assets`，覆盖 LOD0/LOD1 GLB、LOD0 skinned mesh、LOD0 动画命名、动作图、骨骼驱动蒙皮 QA、移动头像、turnaround、table-scale、face-detail、rig-guide、material QA 和 PBR 贴图包。
- 浏览器逐角色验收：`npm run test:character-browser`，创建角色房间并用观战视角验证 LOD1 GLB 请求和 3D canvas 采样。

## 下一步 P0

- 替换程序几何脸为雕刻面部或外部授权模型基底，减少“几何拼装感”。
- 用高模或授权基底烘焙替换当前程序化 PBR 贴图。

## 下一步 P1

- 在 `TableScene3D` 中接入 `.glb`，用桌面距离 QA 图校准相机和灯光。
- 把 first-pass rigid skin weights 升级为精细权重绘制，让当前关键帧预览变成可播放的高质量蒙皮动画；每次改动后先看 `skin-preview-*`，再扩展死亡/倒地后的结算动作。
"""
    (DOCS_ROOT / "CHARACTER_ASSET_AUDIT.md").write_text(review, encoding="utf-8")


def character_objects(root: bpy.types.Object) -> list[bpy.types.Object]:
    objects: list[bpy.types.Object] = [root]
    stack = [root]
    while stack:
        parent = stack.pop()
        children = [obj for obj in bpy.data.objects if obj.parent == parent]
        objects.extend(children)
        stack.extend(children)
    return objects


def mesh_metrics(root: bpy.types.Object) -> tuple[int, int]:
    vertices = 0
    faces = 0
    for obj in character_objects(root):
        if obj.type == "MESH":
            vertices += len(obj.data.vertices)
            faces += len(obj.data.polygons)
    return vertices, faces


def repo_path(path: Path) -> str:
    return path.relative_to(PROJECT_ROOT).as_posix()


def set_isolated(character_id: str, roots: dict[str, bpy.types.Object]) -> None:
    for current_id, root in roots.items():
        hidden = current_id != character_id
        for obj in character_objects(root):
            obj.hide_render = hidden
            obj.hide_viewport = hidden


def set_all_visible(roots: dict[str, bpy.types.Object]) -> None:
    for root in roots.values():
        for obj in character_objects(root):
            obj.hide_render = False
            obj.hide_viewport = False


def add_ellipsoid(collection, root, name, location, scale, material) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(material)
    shade_smooth(obj)
    link_to_collection(obj, collection)
    obj.parent = root
    return obj


def limb(collection, root, name, start, end, radius, material) -> bpy.types.Object:
    start_v = mathutils.Vector(start)
    end_v = mathutils.Vector(end)
    midpoint = (start_v + end_v) * 0.5
    direction = end_v - start_v
    bpy.ops.mesh.primitive_cylinder_add(vertices=18, radius=radius, depth=direction.length, location=midpoint)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    obj.data.materials.append(material)
    shade_smooth(obj)
    link_to_collection(obj, collection)
    obj.parent = root
    return obj


def add_torus(collection, root, name, location, rotation, major_radius, minor_radius, material) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=48,
        minor_segments=8,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    shade_smooth(obj)
    link_to_collection(obj, collection)
    obj.parent = root
    return obj


def add_box(collection, root, name, location, scale, material, rotation=(0.0, 0.0, 0.0)) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(material)
    bevel = obj.modifiers.new(name=f"{name}_soft_bevel", type="BEVEL")
    bevel.width = min(scale) * 0.35
    bevel.segments = 2
    obj.modifiers.new(name=f"{name}_weighted_normals", type="WEIGHTED_NORMAL")
    link_to_collection(obj, collection)
    obj.parent = root
    return obj


def link_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> None:
    if obj.name not in collection.objects:
        collection.objects.link(obj)
    for current in list(obj.users_collection):
        if current != collection:
            current.objects.unlink(obj)


def mat(
    name: str,
    hex_color: str,
    roughness: float,
    metallic: float = 0.0,
    emission: float = 0.0,
    detail: str = "matte",
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material["bing_material_detail"] = detail
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    color = hex_to_rgba(hex_color)
    material.diffuse_color = color
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
        if emission > 0:
            bsdf.inputs["Emission Color"].default_value = color
            bsdf.inputs["Emission Strength"].default_value = emission
        add_material_microdetail(material, bsdf, detail, roughness)
        add_pbr_texture_nodes(material, bsdf, detail, color, roughness)
    return material


def add_pbr_texture_nodes(
    material: bpy.types.Material,
    bsdf: bpy.types.Node,
    detail: str,
    color: tuple[float, float, float, float],
    roughness: float,
) -> None:
    if detail in {"matte", "emissive"}:
        return
    texture_paths = ensure_pbr_texture_pack(material.name, detail, color, roughness)
    nodes = material.node_tree.nodes
    links = material.node_tree.links

    albedo_node = nodes.new(type="ShaderNodeTexImage")
    albedo_node.name = f"{material.name}_albedo_texture"
    albedo_node.image = bpy.data.images.load(str(texture_paths["albedo"]), check_existing=True)
    if albedo_node.image:
        albedo_node.image.colorspace_settings.name = "sRGB"
    links.new(albedo_node.outputs["Color"], bsdf.inputs["Base Color"])

    roughness_node = nodes.new(type="ShaderNodeTexImage")
    roughness_node.name = f"{material.name}_roughness_texture"
    roughness_node.image = bpy.data.images.load(str(texture_paths["roughness"]), check_existing=True)
    if roughness_node.image:
        roughness_node.image.colorspace_settings.name = "Non-Color"
    links.new(roughness_node.outputs["Color"], bsdf.inputs["Roughness"])

    normal_node = nodes.new(type="ShaderNodeTexImage")
    normal_node.name = f"{material.name}_normal_texture"
    normal_node.image = bpy.data.images.load(str(texture_paths["normal"]), check_existing=True)
    if normal_node.image:
        normal_node.image.colorspace_settings.name = "Non-Color"
    normal_map = nodes.new(type="ShaderNodeNormalMap")
    normal_map.name = f"{material.name}_normal_map"
    normal_map.inputs["Strength"].default_value = 0.32 if detail in {"skin", "metal", "polished"} else 0.45
    links.new(normal_node.outputs["Color"], normal_map.inputs["Color"])
    if "Normal" in bsdf.inputs:
        links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])


def ensure_pbr_texture_pack(
    material_name: str,
    detail: str,
    color: tuple[float, float, float, float],
    roughness: float,
) -> dict[str, Path]:
    safe = safe_asset_name(material_name)
    out_dir = PBR_TEXTURE_ROOT / safe
    out_dir.mkdir(parents=True, exist_ok=True)
    paths = {
        "albedo": out_dir / "albedo.png",
        "normal": out_dir / "normal.png",
        "roughness": out_dir / "roughness.png",
    }
    for kind, path in paths.items():
        if not path.exists():
            write_pbr_texture(path, kind, detail, color, roughness)
    return paths


def write_pbr_texture(
    path: Path,
    kind: str,
    detail: str,
    color: tuple[float, float, float, float],
    roughness: float,
) -> None:
    width = PBR_TEXTURE_SIZE
    height = PBR_TEXTURE_SIZE
    image = bpy.data.images.new(name=f"{path.stem}_{safe_asset_name(path.parent.name)}", width=width, height=height, alpha=True)
    pixels: list[float] = []
    for y in range(height):
        for x in range(width):
            u = x / max(width - 1, 1)
            v = y / max(height - 1, 1)
            pixels.extend(material_sample_rgba(kind, detail, color, roughness, u, v))
    image.pixels = pixels
    image.filepath_raw = str(path)
    image.file_format = "PNG"
    image.save()
    bpy.data.images.remove(image)


def material_sample_rgba(
    kind: str,
    detail: str,
    color: tuple[float, float, float, float],
    roughness: float,
    u: float,
    v: float,
) -> list[float]:
    height_value = material_height(detail, u, v)
    if kind == "albedo":
        tint = 0.86 + height_value * 0.22 + material_grain(detail, u + 0.37, v + 0.19) * 0.04
        return [clamp(color[0] * tint), clamp(color[1] * tint), clamp(color[2] * tint), 1.0]
    if kind == "roughness":
        variation = material_grain(detail, u + 0.13, v + 0.41) * 0.16 + (height_value - 0.5) * 0.12
        value = clamp(roughness + variation)
        return [value, value, value, 1.0]

    step = 1.0 / PBR_TEXTURE_SIZE
    dx = material_height(detail, min(u + step, 1.0), v) - material_height(detail, max(u - step, 0.0), v)
    dy = material_height(detail, u, min(v + step, 1.0)) - material_height(detail, u, max(v - step, 0.0))
    strength = {"skin": 2.2, "cloth": 4.4, "leather": 3.4, "metal": 2.0, "hair": 3.0, "polished": 1.0}.get(detail, 2.0)
    normal = mathutils.Vector((-dx * strength, -dy * strength, 1.0)).normalized()
    return [normal.x * 0.5 + 0.5, normal.y * 0.5 + 0.5, normal.z * 0.5 + 0.5, 1.0]


def material_height(detail: str, u: float, v: float) -> float:
    base = material_grain(detail, u, v)
    if detail == "cloth":
        weave = (math.sin(u * math.tau * 32) * 0.5 + 0.5) * 0.45 + (math.sin(v * math.tau * 28) * 0.5 + 0.5) * 0.45
        return clamp(base * 0.35 + weave * 0.65)
    if detail == "leather":
        pores = material_grain(detail, u * 1.7, v * 1.7)
        return clamp(base * 0.5 + pores * 0.5)
    if detail == "metal":
        scratches = (math.sin((u * 90 + v * 12) * math.tau) * 0.5 + 0.5) * 0.28
        return clamp(base * 0.48 + scratches + 0.24)
    if detail == "hair":
        strands = math.sin(u * math.tau * 38 + material_grain(detail, v, u) * 1.8) * 0.5 + 0.5
        return clamp(base * 0.32 + strands * 0.68)
    if detail == "polished":
        return clamp(base * 0.24 + 0.38)
    return clamp(base * 0.7 + material_grain(detail, u * 4.0, v * 4.0) * 0.3)


def material_grain(detail: str, u: float, v: float) -> float:
    salt = sum(ord(ch) for ch in detail) * 0.017
    wave = math.sin((u * 17.3 + salt) * math.tau) * math.sin((v * 19.7 + salt * 0.31) * math.tau)
    speckle = math.sin((u * 61.0 + v * 37.0 + salt) * 12.9898) * 43758.5453
    speckle = speckle - math.floor(speckle)
    return clamp(0.5 + wave * 0.24 + (speckle - 0.5) * 0.42)


def safe_asset_name(value: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in value).strip("-")


def gaussian(value: float, center: float, width: float) -> float:
    if width <= 0:
        return 0.0
    normalized = (value - center) / width
    return math.exp(-(normalized * normalized))


def clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def add_material_microdetail(material: bpy.types.Material, bsdf: bpy.types.Node, detail: str, roughness: float) -> None:
    if detail in {"matte", "emissive"}:
        return

    settings = {
        "skin": {"scale": 92.0, "detail": 13.0, "roughness": 0.62, "strength": 0.018, "distance": 0.024},
        "cloth": {"scale": 34.0, "detail": 9.0, "roughness": 0.72, "strength": 0.038, "distance": 0.035},
        "leather": {"scale": 58.0, "detail": 11.0, "roughness": 0.78, "strength": 0.032, "distance": 0.028},
        "metal": {"scale": 118.0, "detail": 16.0, "roughness": 0.55, "strength": 0.014, "distance": 0.018},
        "hair": {"scale": 44.0, "detail": 8.0, "roughness": 0.66, "strength": 0.025, "distance": 0.022},
        "polished": {"scale": 24.0, "detail": 6.0, "roughness": 0.4, "strength": 0.006, "distance": 0.01},
    }.get(detail)
    if not settings:
        return

    nodes = material.node_tree.nodes
    links = material.node_tree.links
    noise = nodes.new(type="ShaderNodeTexNoise")
    noise.name = f"{material.name}_micro_noise"
    noise.inputs["Scale"].default_value = settings["scale"]
    noise.inputs["Detail"].default_value = settings["detail"]
    noise.inputs["Roughness"].default_value = settings["roughness"]

    bump = nodes.new(type="ShaderNodeBump")
    bump.name = f"{material.name}_micro_bump"
    bump.inputs["Strength"].default_value = settings["strength"]
    bump.inputs["Distance"].default_value = settings["distance"]
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    if "Normal" in bsdf.inputs:
        links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])

    ramp = nodes.new(type="ShaderNodeValToRGB")
    ramp.name = f"{material.name}_roughness_variation"
    ramp.color_ramp.elements[0].position = 0.22
    ramp.color_ramp.elements[0].color = (max(roughness - 0.18, 0.12),) * 3 + (1.0,)
    ramp.color_ramp.elements[1].position = 1.0
    ramp.color_ramp.elements[1].color = (min(roughness + 0.08, 1.0),) * 3 + (1.0,)
    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    if "Roughness" in bsdf.inputs:
        links.new(ramp.outputs["Color"], bsdf.inputs["Roughness"])


def hex_to_rgba(value: str) -> tuple[float, float, float, float]:
    raw = value.lstrip("#")
    return (
        int(raw[0:2], 16) / 255,
        int(raw[2:4], 16) / 255,
        int(raw[4:6], 16) / 255,
        1.0,
    )


def shade_smooth(obj: bpy.types.Object) -> None:
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def look_at(obj: bpy.types.Object, target: mathutils.Vector) -> None:
    direction = target - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


if __name__ == "__main__":
    main()
