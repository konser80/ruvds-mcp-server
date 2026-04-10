import { z } from "zod";
const ServerIdSchema = z.object({
    server_id: z.number().int().positive().describe("Virtual server ID"),
}).strict();
export function registerServerTools(server, client) {
    server.registerTool("ruvds_list_servers", {
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
    }, async () => {
        try {
            const data = await client.listServers();
            return {
                content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
                structuredContent: data,
            };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
        }
    });
    server.registerTool("ruvds_get_server", {
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
    }, async (params) => {
        try {
            const data = await client.getServer(params.server_id);
            return {
                content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
                structuredContent: data,
            };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
        }
    });
    server.registerTool("ruvds_get_server_stats", {
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
    }, async (params) => {
        try {
            const data = await client.getServerStats(params.server_id);
            return {
                content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
                structuredContent: data,
            };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
        }
    });
    server.registerTool("ruvds_get_server_networks", {
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
    }, async (params) => {
        try {
            const data = await client.getServerNetworks(params.server_id);
            return {
                content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
                structuredContent: data,
            };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
        }
    });
    server.registerTool("ruvds_get_server_power_state", {
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
    }, async (params) => {
        try {
            const data = await client.getServerPowerState(params.server_id);
            return {
                content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
                structuredContent: data,
            };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
        }
    });
}
//# sourceMappingURL=servers.js.map