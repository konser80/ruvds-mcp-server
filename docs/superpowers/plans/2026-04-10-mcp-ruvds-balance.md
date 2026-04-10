# MCP RUVDS Balance Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local stdio MCP server in TypeScript that exposes a `ruvds_get_balance` tool backed by `GET /v2/balance` of the RUVDS API.

**Architecture:** Modular structure — a thin native-fetch API client in `src/client.ts`, a single balance tool in `src/tools/balance.ts`, and a stdio server entry point in `src/index.ts`. Auth token is read from `RUVDS_TOKEN` env var at startup.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk`, `zod`, native `fetch` (Node ≥ 18)

---

## File Map

| File | Role |
|------|------|
| `package.json` | Dependencies, scripts, ESM config |
| `tsconfig.json` | Strict TypeScript, Node16 module |
| `src/index.ts` | Server entry point — token check, tool registration, stdio transport |
| `src/client.ts` | `RuvdsClient` class — Bearer auth, error mapping |
| `src/tools/balance.ts` | `registerBalanceTool(server, client)` — Zod schema, tool handler |

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "ruvds-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for RUVDS.com API",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "clean": "rm -rf dist"
  },
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.6.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`

Expected: `node_modules/` created, no errors.

- [ ] **Step 4: Commit**

```bash
git init
git add package.json tsconfig.json
git commit -m "feat: init project scaffold"
```

---

## Task 2: API Client

**Files:**
- Create: `src/client.ts`

- [ ] **Step 1: Create `src/client.ts`**

```typescript
const BASE_URL = "https://api.ruvds.com";

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

  async getBalance(params: BalanceParams = {}): Promise<unknown> {
    const url = new URL(`${BASE_URL}/v2/balance`);
    if (params.type !== undefined) url.searchParams.set("type", params.type);
    if (params.currency_id !== undefined) {
      url.searchParams.set("currency_id", String(params.currency_id));
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), { headers: this.headers });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Network error: ${msg}`);
    }

    if (response.status === 401) {
      throw new Error("Invalid API token");
    }
    if (response.status >= 500) {
      throw new Error(`RUVDS server error ${response.status}`);
    }
    if (!response.ok) {
      let detail = "";
      try {
        const body = await response.json() as { message?: string };
        detail = body.message ? `: ${body.message}` : "";
      } catch {
        // ignore parse errors
      }
      throw new Error(`API error ${response.status}${detail}`);
    }

    return response.json();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/client.ts
git commit -m "feat: add RUVDS API client with Bearer auth"
```

---

## Task 3: Balance Tool

**Files:**
- Create: `src/tools/balance.ts`

- [ ] **Step 1: Create `src/tools/balance.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RuvdsClient } from "../client.js";

const BalanceInputSchema = z.object({
  type: z
    .enum(["all", "bonus", "hold"])
    .optional()
    .describe('Balance type filter: "all" (default), "bonus", or "hold"'),
  currency_id: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Filter by currency ID"),
}).strict();

type BalanceInput = z.infer<typeof BalanceInputSchema>;

export function registerBalanceTool(
  server: McpServer,
  client: RuvdsClient
): void {
  server.registerTool(
    "ruvds_get_balance",
    {
      title: "Get RUVDS Account Balance",
      description: `Retrieve the current account balance from RUVDS.

Returns balance information including available funds. Optionally filter by
balance type or currency.

Args:
  - type ("all" | "bonus" | "hold", optional): Which balance to show.
    "all" returns total, "bonus" returns bonus credits, "hold" returns
    funds on hold. Defaults to "all" if omitted.
  - currency_id (number, optional): Filter results by a specific currency ID.

Returns: JSON with balance data from the RUVDS API.

Examples:
  - "What is my balance?" → call with no params
  - "Show my bonus credits" → call with type="bonus"

Error Handling:
  - Returns "Error: Invalid API token" if RUVDS_TOKEN is wrong
  - Returns "Error: Network error: <msg>" on connection failures`,
      inputSchema: BalanceInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: BalanceInput) => {
      try {
        const data = await client.getBalance(params);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
          structuredContent: data as Record<string, unknown>,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `Error: ${msg}` }],
          isError: true,
        };
      }
    }
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/tools/balance.ts
git commit -m "feat: add ruvds_get_balance tool"
```

---

## Task 4: Server Entry Point

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Create `src/index.ts`**

```typescript
#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RuvdsClient } from "./client.js";
import { registerBalanceTool } from "./tools/balance.js";

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

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("RUVDS MCP server running via stdio");
```

- [ ] **Step 2: Commit**

```bash
git add src/index.ts
git commit -m "feat: add stdio server entry point"
```

---

## Task 5: Build and Verify

- [ ] **Step 1: Build**

Run: `npm run build`

Expected: `dist/` directory created with `index.js`, no TypeScript errors.

- [ ] **Step 2: Verify server starts**

Run: `RUVDS_TOKEN=test node dist/index.js`

Expected: Server starts (prints "RUVDS MCP server running via stdio" to stderr) and waits for MCP input. Ctrl+C to stop.

- [ ] **Step 3: Verify token guard**

Run: `node dist/index.js`

Expected: Prints `Error: RUVDS_TOKEN environment variable is required` and exits with code 1.

- [ ] **Step 4: Test with real token via MCP Inspector**

Run:
```bash
RUVDS_TOKEN=$RUVDS_TOKEN npx @modelcontextprotocol/inspector node dist/index.js
```

Expected: Inspector opens in browser, `ruvds_get_balance` tool appears, calling it returns your account balance JSON.

- [ ] **Step 5: Final commit**

```bash
git add dist/
git commit -m "feat: build dist — ruvds-mcp-server v1.0.0 with get_balance"
```
