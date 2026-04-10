# MCP RUVDS Server Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6 new MCP tools to the existing ruvds-mcp-server: 5 read-only server inspection tools and 1 power command tool.

**Architecture:** Refactor `client.ts` to extract a private `request()` helper (eliminating duplicated fetch/error logic), add 6 server methods, then implement tools in two new files (`servers.ts`, `server-commands.ts`) following the exact pattern of `balance.ts`. Update `index.ts` to register the new tools.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk`, `zod`, native `fetch` (Node ≥ 18)

---

## File Map

| File | Change |
|------|--------|
| `src/client.ts` | Refactor: extract private `request()`, update `getBalance`, add 6 server methods |
| `src/tools/servers.ts` | Create: 5 read-only tools |
| `src/tools/server-commands.ts` | Create: 1 power command tool |
| `src/index.ts` | Modify: import and register new tools |

---

## Task 1: Refactor client.ts and add server methods

**Files:**
- Modify: `src/client.ts`

The current `getBalance` has inline fetch+error handling. We extract that into a private `request()` method, then add 6 server methods that use it. `getBalance` is also updated to use `request()`.

- [ ] **Step 1: Replace `src/client.ts` with the following**

```typescript
const BASE_URL = "https://api.ruvds.com";

export type ServerAction = "power_on" | "power_off" | "reboot" | "force_off";

export interface BalanceParams {
  type?: "all" | "bonus" | "hold";
  currency_id?: number;
}

export class RuvdsClient {
  private readonly headers: Record<string, string>;

  constructor(token: string) {
    this.headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  private async request(path: string, method = "GET", payload?: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: this.headers,
        ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Network error: ${msg}`);
    }

    if (response.status === 401) throw new Error("Invalid API token");
    if (response.status >= 500) throw new Error(`RUVDS server error ${response.status}`);
    if (!response.ok) {
      let detail = "";
      try {
        const errorBody = await response.json() as { message?: string };
        detail = errorBody.message ? `: ${errorBody.message}` : "";
      } catch {
        // ignore parse errors
      }
      throw new Error(`API error ${response.status}${detail}`);
    }

    return response.json();
  }

  async getBalance(params: BalanceParams = {}): Promise<unknown> {
    const qs = new URLSearchParams();
    if (params.type !== undefined) qs.set("type", params.type);
    if (params.currency_id !== undefined) qs.set("currency_id", String(params.currency_id));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.request(`/v2/balance${query}`);
  }

  async listServers(): Promise<unknown> {
    return this.request("/v2/servers");
  }

  async getServer(id: number): Promise<unknown> {
    return this.request(`/v2/servers/${id}`);
  }

  async getServerStats(id: number): Promise<unknown> {
    return this.request(`/v2/servers/${id}/statistics`);
  }

  async getServerNetworks(id: number): Promise<unknown> {
    return this.request(`/v2/servers/${id}/networks`);
  }

  async getServerPowerState(id: number): Promise<unknown> {
    return this.request(`/v2/servers/${id}/power_state`);
  }

  async serverCommand(id: number, action: ServerAction): Promise<unknown> {
    return this.request(`/v2/servers/${id}/actions`, "PUT", { action });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`

Expected: No errors. `dist/` rebuilt.

- [ ] **Step 3: Commit**

```bash
git add src/client.ts
git commit -m "refactor: extract request() helper in RuvdsClient, add server methods"
```

---

## Task 2: Create read-only server tools

**Files:**
- Create: `src/tools/servers.ts`

- [ ] **Step 1: Create `src/tools/servers.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RuvdsClient } from "../client.js";

const ServerIdSchema = z.object({
  server_id: z.number().int().positive().describe("Virtual server ID"),
}).strict();

type ServerIdInput = z.infer<typeof ServerIdSchema>;

export function registerServerTools(server: McpServer, client: RuvdsClient): void {
  server.registerTool(
    "ruvds_list_servers",
    {
      title: "List RUVDS Servers",
      description: `List all virtual servers in the RUVDS account.

Returns an array of servers with their IDs, names, statuses, and configuration.

Args: none

Returns: JSON array of server objects.

Examples:
  - "Show all my servers" → call with no params
  - "What servers do I have?" → call with no params

Error Handling:
  - Returns "Error: Invalid API token" if RUVDS_TOKEN is wrong`,
      inputSchema: z.object({}).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const data = await client.listServers();
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data as Record<string, unknown>,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "ruvds_get_server",
    {
      title: "Get RUVDS Server Details",
      description: `Get detailed information about a specific virtual server.

Returns full server configuration: CPU, RAM, disk, OS, datacenter, status, IP, etc.

Args:
  - server_id (number, required): The virtual server ID (get it from ruvds_list_servers)

Returns: JSON object with server details.

Examples:
  - "Show details for server 12345" → call with server_id=12345

Error Handling:
  - Returns "Error: API error 404" if server ID not found`,
      inputSchema: ServerIdSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: ServerIdInput) => {
      try {
        const data = await client.getServer(params.server_id);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data as Record<string, unknown>,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "ruvds_get_server_stats",
    {
      title: "Get RUVDS Server Statistics",
      description: `Get resource usage statistics for a virtual server.

Returns CPU, RAM, disk, and network usage metrics over time.

Args:
  - server_id (number, required): The virtual server ID

Returns: JSON with usage statistics.

Examples:
  - "What's the CPU usage on server 12345?" → call with server_id=12345

Error Handling:
  - Returns "Error: API error 404" if server ID not found`,
      inputSchema: ServerIdSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (params: ServerIdInput) => {
      try {
        const data = await client.getServerStats(params.server_id);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data as Record<string, unknown>,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "ruvds_get_server_networks",
    {
      title: "Get RUVDS Server Network Info",
      description: `Get IP addresses and network configuration for a virtual server.

Returns all assigned IP addresses (IPv4 and IPv6) and network details.

Args:
  - server_id (number, required): The virtual server ID

Returns: JSON with network/IP information.

Examples:
  - "What's the IP of server 12345?" → call with server_id=12345

Error Handling:
  - Returns "Error: API error 404" if server ID not found`,
      inputSchema: ServerIdSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: ServerIdInput) => {
      try {
        const data = await client.getServerNetworks(params.server_id);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data as Record<string, unknown>,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
      }
    }
  );

  server.registerTool(
    "ruvds_get_server_power_state",
    {
      title: "Get RUVDS Server Power State",
      description: `Get the current power state of a virtual server.

Returns whether the server is running, stopped, or in another power state.

Args:
  - server_id (number, required): The virtual server ID

Returns: JSON with current power state.

Examples:
  - "Is server 12345 running?" → call with server_id=12345

Error Handling:
  - Returns "Error: API error 404" if server ID not found`,
      inputSchema: ServerIdSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (params: ServerIdInput) => {
      try {
        const data = await client.getServerPowerState(params.server_id);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data as Record<string, unknown>,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
      }
    }
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/tools/servers.ts
git commit -m "feat: add read-only server tools (list, get, stats, networks, power_state)"
```

---

## Task 3: Create power command tool

**Files:**
- Create: `src/tools/server-commands.ts`

- [ ] **Step 1: Create `src/tools/server-commands.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RuvdsClient } from "../client.js";

const ServerCommandSchema = z.object({
  server_id: z.number().int().positive().describe("Virtual server ID"),
  action: z
    .enum(["power_on", "power_off", "reboot", "force_off"])
    .describe(
      'Power action to execute: "power_on" (start), "power_off" (graceful shutdown), "reboot" (graceful restart), "force_off" (hard power cut — use only if power_off fails)'
    ),
}).strict();

type ServerCommandInput = z.infer<typeof ServerCommandSchema>;

export function registerServerCommandTools(server: McpServer, client: RuvdsClient): void {
  server.registerTool(
    "ruvds_server_command",
    {
      title: "Execute RUVDS Server Power Command",
      description: `Execute a power command on a virtual server.

Sends a power action to the server. Use power_off for graceful shutdown before
force_off. Reboot performs a graceful restart.

Args:
  - server_id (number, required): The virtual server ID
  - action ("power_on" | "power_off" | "reboot" | "force_off", required):
    - "power_on": Start a stopped server
    - "power_off": Graceful shutdown (sends ACPI signal)
    - "reboot": Graceful restart
    - "force_off": Hard power cut (like pulling the plug — data loss risk)

Returns: JSON confirmation from the RUVDS API.

Examples:
  - "Start server 12345" → action="power_on", server_id=12345
  - "Reboot server 12345" → action="reboot", server_id=12345
  - "Shut down server 12345" → action="power_off", server_id=12345

Error Handling:
  - Returns "Error: API error 409" if action not valid for current server state`,
      inputSchema: ServerCommandSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (params: ServerCommandInput) => {
      try {
        const data = await client.serverCommand(params.server_id, params.action);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data as Record<string, unknown>,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
      }
    }
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/tools/server-commands.ts
git commit -m "feat: add ruvds_server_command tool (power_on/off/reboot/force_off)"
```

---

## Task 4: Wire tools into index.ts

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Replace `src/index.ts` with the following**

```typescript
#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RuvdsClient } from "./client.js";
import { registerBalanceTool } from "./tools/balance.js";
import { registerServerTools } from "./tools/servers.js";
import { registerServerCommandTools } from "./tools/server-commands.js";

const token = process.env.RUVDS_TOKEN;
if (!token) {
  console.error("Error: RUVDS_TOKEN environment variable is required");
  process.exit(1);
}

const client = new RuvdsClient(token);

const server = new McpServer({
  name: "ruvds-mcp-server",
  version: "1.0.0",
});

registerBalanceTool(server, client);
registerServerTools(server, client);
registerServerCommandTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("RUVDS MCP server running via stdio");
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`

Expected: No errors. dist/ rebuilt.

- [ ] **Step 3: Verify server starts**

Run: `RUVDS_TOKEN=test node dist/index.js`

Expected: Prints "RUVDS MCP server running via stdio" to stderr, waits for input. Ctrl+C to stop.

- [ ] **Step 4: Commit**

```bash
git add src/index.ts dist/
git commit -m "feat: register server tools — ruvds-mcp-server v1.1.0"
```
