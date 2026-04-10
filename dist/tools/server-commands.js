import { z } from "zod";
const ServerCommandSchema = z.object({
    server_id: z.number().int().positive().describe("Virtual server ID"),
    action: z
        .enum(["power_on", "power_off", "reboot", "force_off"])
        .describe('Power action to execute: "power_on" (start), "power_off" (graceful shutdown), "reboot" (graceful restart), "force_off" (hard power cut — use only if power_off fails)'),
}).strict();
export function registerServerCommandTools(server, client) {
    server.registerTool("ruvds_server_command", {
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
    }, async (params) => {
        try {
            const data = await client.serverCommand(params.server_id, params.action);
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
//# sourceMappingURL=server-commands.js.map