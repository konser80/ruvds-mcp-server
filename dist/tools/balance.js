import { z } from "zod";
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
export function registerBalanceTool(server, client) {
    server.registerTool("ruvds_get_balance", {
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
    }, async (params) => {
        try {
            const data = await client.getBalance(params);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(data, null, 2),
                    },
                ],
                structuredContent: data,
            };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text", text: `Error: ${msg}` }],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=balance.js.map