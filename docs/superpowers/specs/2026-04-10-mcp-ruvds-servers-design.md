# MCP RUVDS — Server Tools Design

**Date:** 2026-04-10  
**Scope:** Server read-only tools + safe power commands  
**Status:** Approved

---

## Overview

Extends the existing `ruvds-mcp-server` with tools for managing virtual servers: listing, inspecting, monitoring, and executing safe power commands (start/stop/reboot).

---

## Architecture

```
src/
  client.ts                ← add server API methods
  tools/
    balance.ts             ← unchanged
    servers.ts             ← read-only server tools
    server-commands.ts     ← power command tool
  index.ts                 ← register new tools
```

---

## Changes to `src/client.ts`

Add the following methods to `RuvdsClient`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `listServers()` | `GET /v2/servers` | List all virtual servers |
| `getServer(id)` | `GET /v2/servers/{id}` | Get server details |
| `getServerStats(id)` | `GET /v2/servers/{id}/statistics` | Resource usage statistics |
| `getServerNetworks(id)` | `GET /v2/servers/{id}/networks` | IP addresses |
| `getServerPowerState(id)` | `GET /v2/servers/{id}/power_state` | Current power status |
| `serverCommand(id, action)` | `PUT /v2/servers/{id}/actions` | Execute power action |

All methods return `Promise<unknown>` and reuse the existing error handling pattern (401 → Invalid API token, 5xx → server error, etc.)

The `serverCommand` action parameter is typed as `"power_on" | "power_off" | "reboot" | "force_off"`.

---

## `src/tools/servers.ts` — Read-Only Tools

### `ruvds_list_servers`
- **Endpoint:** `GET /v2/servers`
- **Inputs:** none
- **Output:** JSON array of servers
- **Annotations:** `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`

### `ruvds_get_server`
- **Endpoint:** `GET /v2/servers/{id}`
- **Inputs:** `server_id: number` (required)
- **Output:** JSON server details
- **Annotations:** `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`

### `ruvds_get_server_stats`
- **Endpoint:** `GET /v2/servers/{id}/statistics`
- **Inputs:** `server_id: number` (required)
- **Output:** JSON with CPU/RAM/disk/network usage metrics
- **Annotations:** `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: false`

### `ruvds_get_server_networks`
- **Endpoint:** `GET /v2/servers/{id}/networks`
- **Inputs:** `server_id: number` (required)
- **Output:** JSON with IP addresses
- **Annotations:** `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`

### `ruvds_get_server_power_state`
- **Endpoint:** `GET /v2/servers/{id}/power_state`
- **Inputs:** `server_id: number` (required)
- **Output:** JSON with current power status
- **Annotations:** `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: false`

---

## `src/tools/server-commands.ts` — Power Commands

### `ruvds_server_command`
- **Endpoint:** `PUT /v2/servers/{id}/actions`
- **Inputs:**
  - `server_id: number` (required)
  - `action: "power_on" | "power_off" | "reboot" | "force_off"` (required)
- **Output:** JSON confirmation from API
- **Annotations:** `readOnlyHint: false`, `destructiveHint: true`, `idempotentHint: false`

---

## Changes to `src/index.ts`

Import and call `registerServerTools(server, client)` and `registerServerCommandTools(server, client)` after the existing `registerBalanceTool` call.

---

## Error Handling

All tools follow the same pattern as `balance.ts`:
- On success: `{ content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data }`
- On error: `{ content: [{ type: "text", text: "Error: <msg>" }], isError: true }`

Errors propagate from `RuvdsClient` methods unchanged (network, auth, 4xx, 5xx).

---

## Out of Scope (this spec)

- Server creation / deletion
- Configuration changes (CPU/RAM/disk)
- Payment period changes
- Screenshot, password retrieval
- SSH key management
