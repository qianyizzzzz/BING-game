# BING 本地 Blender 工具

本目录用于本机便携版 Blender、Blender MCP 和项目角色源场景。便携版 Blender、第三方 add-on 和临时备份不会提交到 git；项目源场景放在 `tools/blender/source/`，避免进入 Web 静态发布目录。

## 当前约定

- Blender 便携目录：`tools/blender/blender-4.5.0-windows-x64/`
- Blender MCP add-on：`tools/blender/blender-mcp/addon.py`
- 项目角色源场景：`tools/blender/source/bing-character-blockouts.blend`
- MCP server：通过 `uvx blender-mcp` 启动
- Blender socket：`localhost:9876`

## 安装 / 验证

```powershell
tools\blender\blender-4.5.0-windows-x64\blender.exe --version
uvx blender-mcp
```

第一次安装 Blender MCP add-on：

```powershell
tools\blender\blender-4.5.0-windows-x64\blender.exe --background --python tools\blender\install-blendermcp-addon.py -- tools\blender\blender-mcp\addon.py
```

## Codex / MCP 配置示例

如果 MCP 客户端支持 JSON 配置，可以使用 Windows 兼容写法：

```json
{
  "mcpServers": {
    "blender": {
      "command": "cmd",
      "args": ["/c", "uvx", "blender-mcp"],
      "env": {
        "BLENDER_HOST": "localhost",
        "BLENDER_PORT": "9876"
      }
    }
  }
}
```

启用顺序：

1. 打开 Blender。
2. 确认 `BlenderMCP` add-on 已启用。
3. 在 3D View 侧栏 `BlenderMCP` 面板点击连接，或使用已启用的自动启动。
4. 重启/刷新 Codex MCP 客户端，使其加载 `uvx blender-mcp` server。
