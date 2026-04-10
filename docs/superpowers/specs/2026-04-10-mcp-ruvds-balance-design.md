# MCP RUVDS — Balance Tool Design

**Date:** 2026-04-10  
**Scope:** Initial implementation — balance endpoint only  
**Status:** Approved

---

## Overview

A local MCP server (stdio transport) written in TypeScript that exposes RUVDS.com API functionality to Claude and other MCP-compatible clients. This spec covers the first tool: `get_balance`.

---

## Architecture

```
mcp-ruvds/
├── src/
│   ├── index.ts          ← stdio server entry point, tool registration
│   ├── client.ts         ← fetch wrapper for api.ruvds.com, Bearer auth
│   └── tools/
│       └── balance.ts    ← get_balance tool implementation
├── package.json
└── tsconfig.json
```

**Transport:** stdio (local, for Claude Desktop / Cursor)  
**Language:** TypeScript  
**SDK:** `@modelcontextprotocol/sdk`

---

## Authentication

API token is read from the `RUVDS_TOKEN` environment variable at server startup. If the variable is missing, the server exits immediately with a clear error message. No token is accepted as a tool parameter.

---

## API Client (`src/client.ts`)

A thin wrapper around the native `fetch` API:

- Base URL: `https://api.ruvds.com`
- Sets `Authorization: Bearer <token>` on every request
- Sets `Content-Type: application/json`
- Throws descriptive errors for HTTP 401, other 4xx, and 5xx responses

---

## Tool: `get_balance`

**Endpoint:** `GET /v2/balance`

**Input parameters (all optional):**
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `"all" \| "bonus" \| "hold"` | Filter balance type |
| `currency_id` | `number` | Filter by currency |

**Output:** Plain text response with balance information from the API.

**Annotations:**
- `readOnlyHint: true`
- `destructiveHint: false`
- `idempotentHint: true`

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| `RUVDS_TOKEN` not set | Server exits with: `Error: RUVDS_TOKEN environment variable is required` |
| HTTP 401 | Returns: `Error: Invalid API token` |
| HTTP 4xx | Returns: `Error: API error <status>: <message from API>` |
| HTTP 5xx | Returns: `Error: RUVDS server error <status>` |
| Network failure | Returns: `Error: Network error: <message>` |

---

## Data Flow

```
Claude → MCP stdio → get_balance(params) → client.ts → GET api.ruvds.com/v2/balance → text response
```

---

## Out of Scope (this spec)

- Server management tools
- SSH key tools
- Payments, notifications, actions
- HTTP/remote transport
