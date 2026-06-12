from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path

import bpy
import mathutils


PROJECT_ROOT = Path(__file__).resolve().parents[2]
ASSET_ROOT = PROJECT_ROOT / "apps" / "client" / "public" / "assets" / "characters"
ARTIFACT_ROOT = PROJECT_ROOT / "artifacts" / "art"


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
        "烬火守卫",
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
        "紫曜剑客",
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
        "铁面观测者",
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

    for spec in CHARACTERS:
        export_character(spec, roots)
        render_character_views(spec, roots)

    scene_path = ASSET_ROOT / "source" / "bing-character-blockouts.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(scene_path))
    write_report(scene_path)
    print(f"BING_CHARACTER_BLOCKOUTS_DONE={scene_path}")


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for material in list(bpy.data.materials):
        bpy.data.materials.remove(material)


def configure_scene() -> None:
    scene = bpy.context.scene
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
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
        "skin": mat("skin_warm_semireal", "#d8a27f", roughness=0.72),
        "skin_shadow": mat("skin_shadow", "#8f5d48", roughness=0.8),
        "cloth_dark": mat("deep_abyss_cloth", "#171b18", roughness=0.88),
        "leather": mat("worn_dark_leather", "#342017", roughness=0.84),
        "eye": mat("soft_eye_glass", "#f4efe2", roughness=0.28),
        "black": mat("ink_line", "#0b0d0d", roughness=0.7),
    }


def create_character(spec: CharacterSpec) -> bpy.types.Object:
    collection = bpy.data.collections.new(f"BING_{spec.character_id}")
    bpy.context.scene.collection.children.link(collection)
    root = bpy.data.objects.new(f"{spec.character_id}_root", None)
    collection.objects.link(root)

    skin = bpy.data.materials["skin_warm_semireal"]
    skin_shadow = bpy.data.materials["skin_shadow"]
    cloth_dark = bpy.data.materials["deep_abyss_cloth"]
    leather = bpy.data.materials["worn_dark_leather"]
    main = mat(f"{spec.character_id}_main_cloth", spec.main, roughness=0.74)
    secondary = mat(f"{spec.character_id}_secondary_cloth", spec.secondary, roughness=0.82)
    metal = mat(f"{spec.character_id}_aged_metal", spec.metal, roughness=0.38, metallic=0.45)
    emissive = mat(f"{spec.character_id}_relic_glow", spec.main, roughness=0.22, emission=0.65)

    # 7.4-head semi-realistic proportion blockout.
    add_ellipsoid(collection, root, f"{spec.character_id}_head", (0, 0, 1.72), (0.14, 0.115, 0.18), skin)
    add_ellipsoid(collection, root, f"{spec.character_id}_neck", (0, 0, 1.49), (0.07, 0.055, 0.09), skin_shadow)
    add_ellipsoid(collection, root, f"{spec.character_id}_ribcage", (0, 0, 1.16), (0.25, 0.14, 0.36), main)
    add_ellipsoid(collection, root, f"{spec.character_id}_pelvis", (0, 0, 0.82), (0.22, 0.13, 0.16), secondary)
    add_ellipsoid(collection, root, f"{spec.character_id}_coat_tail", (0, 0.025, 0.66), (0.27, 0.08, 0.18), secondary)

    shoulder_scale = 1.22 if spec.prop == "shield" else 1.0
    add_ellipsoid(collection, root, f"{spec.character_id}_left_shoulder", (-0.27 * shoulder_scale, 0, 1.34), (0.09, 0.075, 0.07), metal)
    add_ellipsoid(collection, root, f"{spec.character_id}_right_shoulder", (0.27 * shoulder_scale, 0, 1.34), (0.09, 0.075, 0.07), metal)

    limb(collection, root, f"{spec.character_id}_left_upper_arm", (-0.29, 0, 1.26), (-0.39, 0.02, 1.02), 0.04, main)
    limb(collection, root, f"{spec.character_id}_left_forearm", (-0.39, 0.02, 1.02), (-0.34, -0.02, 0.78), 0.035, leather)
    limb(collection, root, f"{spec.character_id}_right_upper_arm", (0.29, 0, 1.26), (0.39, 0.02, 1.02), 0.04, main)
    limb(collection, root, f"{spec.character_id}_right_forearm", (0.39, 0.02, 1.02), (0.34, -0.02, 0.78), 0.035, leather)
    add_ellipsoid(collection, root, f"{spec.character_id}_left_hand", (-0.34, -0.025, 0.74), (0.047, 0.035, 0.055), skin)
    add_ellipsoid(collection, root, f"{spec.character_id}_right_hand", (0.34, -0.025, 0.74), (0.047, 0.035, 0.055), skin)

    limb(collection, root, f"{spec.character_id}_left_thigh", (-0.11, 0, 0.72), (-0.14, 0.015, 0.38), 0.055, secondary)
    limb(collection, root, f"{spec.character_id}_left_shin", (-0.14, 0.015, 0.38), (-0.13, -0.01, 0.06), 0.045, leather)
    limb(collection, root, f"{spec.character_id}_right_thigh", (0.11, 0, 0.72), (0.14, 0.015, 0.38), 0.055, secondary)
    limb(collection, root, f"{spec.character_id}_right_shin", (0.14, 0.015, 0.38), (0.13, -0.01, 0.06), 0.045, leather)
    add_ellipsoid(collection, root, f"{spec.character_id}_left_boot", (-0.13, -0.035, 0.02), (0.075, 0.115, 0.035), leather)
    add_ellipsoid(collection, root, f"{spec.character_id}_right_boot", (0.13, -0.035, 0.02), (0.075, 0.115, 0.035), leather)

    add_face(collection, root, spec)
    add_prop(collection, root, spec, metal, emissive, leather)
    add_base(collection, root, spec, emissive)

    return root


def add_face(collection, root, spec: CharacterSpec) -> None:
    eye = bpy.data.materials["soft_eye_glass"]
    black = bpy.data.materials["ink_line"]
    if spec.prop == "mask":
        mask_mat = bpy.data.materials[f"{spec.character_id}_aged_metal"]
        add_ellipsoid(collection, root, f"{spec.character_id}_iron_mask", (0, -0.092, 1.735), (0.112, 0.018, 0.125), mask_mat)
        add_ellipsoid(collection, root, f"{spec.character_id}_left_lens", (-0.045, -0.111, 1.75), (0.022, 0.007, 0.016), eye)
        add_ellipsoid(collection, root, f"{spec.character_id}_right_lens", (0.045, -0.111, 1.75), (0.022, 0.007, 0.016), eye)
        return
    add_ellipsoid(collection, root, f"{spec.character_id}_left_eye", (-0.04, -0.105, 1.755), (0.018, 0.008, 0.012), eye)
    add_ellipsoid(collection, root, f"{spec.character_id}_right_eye", (0.04, -0.105, 1.755), (0.018, 0.008, 0.012), eye)
    add_ellipsoid(collection, root, f"{spec.character_id}_nose_bridge", (0, -0.116, 1.722), (0.018, 0.012, 0.035), bpy.data.materials["skin_shadow"])
    add_ellipsoid(collection, root, f"{spec.character_id}_brow_shadow", (0, -0.108, 1.782), (0.092, 0.01, 0.012), black)


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

    bpy.ops.object.camera_add(location=(0, -3.1, 1.25), rotation=(math.radians(75), 0, 0))
    camera = bpy.context.object
    camera.name = "portrait_camera"
    camera.data.lens = 70
    bpy.context.scene.camera = camera


def export_character(spec: CharacterSpec, roots: dict[str, bpy.types.Object]) -> None:
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

    root.location = original_location
    root.rotation_euler = original_rotation
    set_all_visible(roots)


def render_character_views(spec: CharacterSpec, roots: dict[str, bpy.types.Object]) -> None:
    root = roots[spec.character_id]
    out_dir = ASSET_ROOT / spec.character_id
    out_dir.mkdir(parents=True, exist_ok=True)
    original_location = root.location.copy()
    original_rotation = root.rotation_euler.copy()
    set_isolated(spec.character_id, roots)
    root.location = (0, 0, 0)

    views = [
        ("portrait", 0, 70, (0, -3.05, 1.22), (0, 0, 0.98)),
        ("turnaround-front", 0, 70, (0, -3.35, 1.25), (0, 0, 0.95)),
        ("turnaround-side", math.radians(90), 70, (0, -3.35, 1.25), (0, 0, 0.95)),
        ("turnaround-three-quarter", math.radians(-38), 70, (0, -3.35, 1.25), (0, 0, 0.95)),
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


def write_report(scene_path: Path) -> None:
    rows = []
    for spec in CHARACTERS:
        out_dir = ASSET_ROOT / spec.character_id
        rows.append(
            f"| `{spec.character_id}` | {spec.name} | {spec.role} | {spec.silhouette} | "
            f"`{out_dir.relative_to(PROJECT_ROOT)}/{spec.character_id}.glb` | "
            f"`{out_dir.relative_to(PROJECT_ROOT)}/portrait.png` |"
        )

    report = f"""# BING 角色 Blender 初模报告

日期：2026-06-13

本轮通过 BlenderMCP socket 执行 `tools/blender/create-bing-character-blockouts.py`，为默认 6 个角色生成第一版半写实比例 blockout。

## 输出

- Blender 源场景：`{scene_path.relative_to(PROJECT_ROOT)}`
- 每个角色导出 `.glb`
- 每个角色导出 `portrait.png`、`turnaround-front.png`、`turnaround-side.png`、`turnaround-three-quarter.png`

| id | 中文名 | 定位 | 剪影方向 | GLB | 头像 |
| --- | --- | --- | --- | --- | --- |
{chr(10).join(rows)}

## 美术判断

当前资产是“可读性 blockout”，不是最终真人级模型。它解决的是头身比例、职业剪影、主色、关键道具和导出链路；后续还需要高模/雕刻/贴图/绑定/动画。

## P0

- 继续细化脸部、手部、服装褶皱和材质粗糙度，否则仍会显得偏原型。
- 为每个角色补 LOD 统计和移动端头像可读性截图。

## P1

- 将 `characters.ts` 的 avatarUrl 从 placeholder SVG 切换到经过确认的 `portrait.png`。
- 为 3D 牌桌接入 `.glb` 角色，而不是继续用程序生成角色几何。

## P2

- 为攻击、防御、技能、受伤、死亡补角色动作剪影。
- 建立每个角色的材质板和服装局部参考。
"""
    (ARTIFACT_ROOT / "bing-character-blockouts-report.md").write_text(report, encoding="utf-8")


def character_objects(root: bpy.types.Object) -> list[bpy.types.Object]:
    return [obj for obj in bpy.data.objects if obj == root or obj.parent == root]


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


def link_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> None:
    if obj.name not in collection.objects:
        collection.objects.link(obj)
    for current in list(obj.users_collection):
        if current != collection:
            current.objects.unlink(obj)


def mat(name: str, hex_color: str, roughness: float, metallic: float = 0.0, emission: float = 0.0) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    color = hex_to_rgba(hex_color)
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
        if emission > 0:
            bsdf.inputs["Emission Color"].default_value = color
            bsdf.inputs["Emission Strength"].default_value = emission
    return material


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
