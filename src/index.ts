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
