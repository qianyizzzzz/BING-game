from __future__ import annotations

import math
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
    clear_scene()
    configure_scene()
    materials = build_materials()
    roots: dict[str, bpy.types.Object] = {}

    for index, spec in enumerate(CHARACTERS):
        root = create_character(spec)
        root.location.x = (index - (len(CHARACTERS) - 1) / 2) * 2.05
        roots[spec.character_id] = root

    add_gallery_floor()
    add_camera_and_lights()

    ASSET_ROOT.mkdir(parents=True, exist_ok=True)
    ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)
    (ASSET_ROOT / "source").mkdir(parents=True, exist_ok=True)

    lod1_metrics: dict[str, tuple[int, int]] = {}
    for spec in CHARACTERS:
        lod1_metrics[spec.character_id] = export_character(spec, roots)
        render_character_views(spec, roots)
    render_material_qa_board()

    scene_path = ASSET_ROOT / "source" / "bing-character-blockouts.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(scene_path))
    write_report(scene_path, roots, lod1_metrics)
    print(f"BING_CHARACTER_BLOCKOUTS_DONE={scene_path}")


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
    add_head_detail(collection, root, spec)
    add_tailored_costume(collection, root, spec, main, secondary, metal, leather, cloth_dark)
    add_body_landmarks(collection, root, spec, main, secondary, metal)

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

    limb(collection, root, f"{spec.character_id}_left_thigh", (-0.095, 0, 0.68), (-0.135, 0.015, 0.37), 0.047, secondary)
    limb(collection, root, f"{spec.character_id}_left_shin", (-0.135, 0.015, 0.37), (-0.125, -0.01, 0.05), 0.038, leather)
    limb(collection, root, f"{spec.character_id}_right_thigh", (0.095, 0, 0.68), (0.135, 0.015, 0.37), 0.047, secondary)
    limb(collection, root, f"{spec.character_id}_right_shin", (0.135, 0.015, 0.37), (0.125, -0.01, 0.05), 0.038, leather)
    add_ellipsoid(collection, root, f"{spec.character_id}_left_knee", (-0.135, -0.012, 0.37), (0.052, 0.024, 0.04), secondary)
    add_ellipsoid(collection, root, f"{spec.character_id}_right_knee", (0.135, -0.012, 0.37), (0.052, 0.024, 0.04), secondary)
    add_ellipsoid(collection, root, f"{spec.character_id}_left_boot", (-0.125, -0.045, 0.01), (0.065, 0.105, 0.032), leather)
    add_ellipsoid(collection, root, f"{spec.character_id}_right_boot", (0.125, -0.045, 0.01), (0.065, 0.105, 0.032), leather)

    add_face(collection, root, spec)
    add_prop(collection, root, spec, metal, emissive, leather)
    add_base(collection, root, spec, emissive)

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
        add_ellipsoid(collection, root, f"{spec.character_id}_iron_mask", (0, -0.092, 1.735), (0.112, 0.018, 0.125), mask_mat)
        add_ellipsoid(collection, root, f"{spec.character_id}_left_lens", (-0.045, -0.111, 1.75), (0.022, 0.007, 0.016), eye)
        add_ellipsoid(collection, root, f"{spec.character_id}_right_lens", (0.045, -0.111, 1.75), (0.022, 0.007, 0.016), eye)
        add_box(collection, root, f"{spec.character_id}_mask_mouth_slit", (0, -0.116, 1.665), (0.062, 0.006, 0.006), black)
        return
    add_ellipsoid(collection, root, f"{spec.character_id}_left_ear", (-0.128, -0.006, 1.715), (0.022, 0.012, 0.043), skin)
    add_ellipsoid(collection, root, f"{spec.character_id}_right_ear", (0.128, -0.006, 1.715), (0.022, 0.012, 0.043), skin)
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
    add_ellipsoid(collection, root, f"{spec.character_id}_left_cheek_plane", (-0.054, -0.116, 1.693), (0.022, 0.004, 0.014), skin_shadow)
    add_ellipsoid(collection, root, f"{spec.character_id}_right_cheek_plane", (0.054, -0.116, 1.693), (0.022, 0.004, 0.014), skin_shadow)
    add_ellipsoid(collection, root, f"{spec.character_id}_left_cheek_highlight", (-0.062, -0.128, 1.707), (0.014, 0.003, 0.008), skin_highlight)
    add_ellipsoid(collection, root, f"{spec.character_id}_right_cheek_highlight", (0.062, -0.128, 1.707), (0.014, 0.003, 0.008), skin_highlight)
    add_ellipsoid(collection, root, f"{spec.character_id}_upper_lip", (0, -0.126, 1.655), (0.034, 0.0045, 0.0045), lip)
    add_ellipsoid(collection, root, f"{spec.character_id}_lower_lip", (0, -0.125, 1.642), (0.03, 0.0045, 0.006), lip)
    add_ellipsoid(collection, root, f"{spec.character_id}_chin_plane", (0, -0.108, 1.615), (0.045, 0.009, 0.018), skin_shadow)


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


def write_report(scene_path: Path, roots: dict[str, bpy.types.Object], lod1_metrics: dict[str, tuple[int, int]]) -> None:
    rows = []
    review_rows = []
    pbr_texture_count = len(list(PBR_TEXTURE_ROOT.rglob("*.png"))) if PBR_TEXTURE_ROOT.exists() else 0
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

本轮通过 BlenderMCP socket 执行 `tools/blender/create-bing-character-blockouts.py`，为默认 6 个角色生成第一版半写实比例 blockout。

## 输出

- Blender 源场景：`{repo_path(scene_path)}`
- 每个角色导出 LOD0 `.glb` 和 LOD1 `-lod1.glb`
- 每个角色导出 `portrait.png`、`mobile-avatar.png`、`turnaround-front.png`、`turnaround-side.png`、`turnaround-three-quarter.png`、`table-scale.png`
- PBR 贴图目录：`{repo_path(PBR_TEXTURE_ROOT)}`，当前 `{pbr_texture_count}` 张 PNG
- 材质近景 QA：`{repo_path(ASSET_ROOT / "materials" / "material-qa.png")}`

| id | 中文名 | 定位 | 剪影方向 | LOD0 GLB | LOD1 GLB | 头像 |
| --- | --- | --- | --- | --- | --- | --- |
{chr(10).join(rows)}

## 美术判断

当前资产是“可读性 blockout”，不是最终真人级模型。它解决的是头身比例、职业剪影、主色、关键道具和导出链路；后续还需要高模/雕刻/贴图/绑定/动画。

## P0

- 继续细化脸部、手部、服装褶皱和材质粗糙度，否则仍会显得偏原型。
- 用移动端头像裁切检查脸部、职业道具和剪影是否还可读。

## P1

- 将 `characters.ts` 的 avatarUrl 从 placeholder SVG 切换到经过确认的 `portrait.png`。
- 为 3D 牌桌接入 `.glb` 角色，而不是继续用程序生成角色几何。

## P2

- 为攻击、防御、技能、受伤、死亡补角色动作剪影。
- 建立每个角色的材质板和服装局部参考。
"""
    (ARTIFACT_ROOT / "bing-character-blockouts-report.md").write_text(report, encoding="utf-8")
    review = f"""# BING 角色资产审计

日期：2026-06-13

本审计由 `tools/blender/create-bing-character-blockouts.py` 通过 Blender MCP 生成。当前目标是把默认玩家角色推进到“接近真人比例的半写实游戏角色”，不是最终真人级高模。

## 当前产物

- 源场景：`{repo_path(scene_path)}`
- 每角色：LOD0 `.glb`、LOD1 `-lod1.glb`、头像、移动端头像、正面、侧面、3/4、桌面距离 QA 图
- 材质：皮肤、布料、皮革、金属、头发均带程序化 micro-bump、roughness variation 和导出的 albedo/normal/roughness PNG
- PBR 贴图目录：`{repo_path(PBR_TEXTURE_ROOT)}`，当前 `{pbr_texture_count}` 张 PNG
- 材质近景 QA：`{repo_path(ASSET_ROOT / "materials" / "material-qa.png")}`
- 预算：LOD0 不超过 {LOD0_FACE_BUDGET} faces；LOD1 不超过 {LOD1_FACE_BUDGET} faces

| id | 中文名 | LOD0 vertices | LOD0 faces | LOD0 预算 | LOD1 vertices | LOD1 faces | LOD1 预算 | 移动头像 QA | 桌面距离 QA |
| --- | --- | ---: | ---: | --- | ---: | ---: | --- | --- | --- |
{chr(10).join(review_rows)}

## 美术判断

- 已完成：统一 7-7.5 头身比例、角色体型差异、脸部体块、发型/头饰、服装层次、职业道具、LOD1、移动端头像、桌面距离渲染、材质近景 QA 和可追踪 PBR 贴图文件。
- 仍不足：还没有真实高模雕刻、手工/烘焙贴图、绑定和角色动作；真人质感仍需外部雕刻/贴图阶段继续推进。

## 下一步 P0

- 替换程序几何脸为雕刻面部或外部授权模型基底，减少“几何拼装感”。
- 用高模或授权基底烘焙替换当前程序化 PBR 贴图。

## 下一步 P1

- 在 `TableScene3D` 中接入 `.glb`，用桌面距离 QA 图校准相机和灯光。
- 为攻击、防御、技能、受伤、死亡建立 5 个基础动作剪影。
"""
    (DOCS_ROOT / "CHARACTER_ASSET_AUDIT.md").write_text(review, encoding="utf-8")


def character_objects(root: bpy.types.Object) -> list[bpy.types.Object]:
    return [obj for obj in bpy.data.objects if obj == root or obj.parent == root]


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
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, location=location)
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
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius, depth=direction.length, location=midpoint)
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
        major_segments=64,
        minor_segments=10,
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
