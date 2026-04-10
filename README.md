# ruvds-mcp-server

MCP server for [RUVDS.com](https://ruvds.com) API. Exposes RUVDS virtual server management as tools for Claude and other MCP-compatible clients.

## Setup

**1. Get your API token** — [ruvds.com → Settings → API](https://ruvds.com/my/settings/api)

**2. Add to Claude Code:**
```bash
claude mcp add ruvds -s user -e RUVDS_TOKEN=<your_token> -- node /path/to/dist/index.js
```

**3. Or add to Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "ruvds": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": { "RUVDS_TOKEN": "<your_token>" }
    }
  }
}
```

## Build

```bash
npm install
npm run build
```

## Tools

### Account

| Tool | Description |
|------|-------------|
| `ruvds_get_balance` | Get account balance (optional: filter by type, currency) |

### Servers — Read-only

| Tool | Description |
|------|-------------|
| `ruvds_list_servers` | List all virtual servers |
| `ruvds_get_server` | Get server details by ID |
| `ruvds_get_server_stats` | Get CPU/RAM/disk/network usage statistics |
| `ruvds_get_server_networks` | Get IP addresses and network config |
| `ruvds_get_server_power_state` | Get current power state |

### Servers — Commands

| Tool | Description |
|------|-------------|
| `ruvds_server_command` | Execute power action: `power_on`, `power_off`, `reboot`, `force_off` |

## Requirements

- Node.js ≥ 18
- RUVDS API token
