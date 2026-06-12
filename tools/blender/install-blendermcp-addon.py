import sys
from pathlib import Path

import bpy


def main() -> None:
    addon_path = parse_addon_path()
    if not addon_path.exists():
        raise SystemExit(f"Blender MCP addon not found: {addon_path}")

    bpy.ops.preferences.addon_install(filepath=str(addon_path), overwrite=True)
    bpy.ops.preferences.addon_enable(module=addon_path.stem)
    bpy.ops.wm.save_userpref()

    enabled = addon_path.stem in bpy.context.preferences.addons
    print(f"BING_BLENDERMCP_ADDON_INSTALLED={enabled}")
    print(f"BING_BLENDERMCP_ADDON_MODULE={addon_path.stem}")


def parse_addon_path() -> Path:
    args = sys.argv
    if "--" not in args:
        raise SystemExit("Usage: blender --background --python install-blendermcp-addon.py -- path/to/addon.py")

    values = args[args.index("--") + 1 :]
    if not values:
        raise SystemExit("Missing addon.py path")

    return Path(values[0]).resolve()


if __name__ == "__main__":
    main()
