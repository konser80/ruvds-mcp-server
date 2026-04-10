const BASE_URL = "https://api.ruvds.com";
export class RuvdsClient {
    headers;
    constructor(token) {
        this.headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        };
    }
    async getBalance(params = {}) {
        const url = new URL(`${BASE_URL}/v2/balance`);
        if (params.type !== undefined)
            url.searchParams.set("type", params.type);
        if (params.currency_id !== undefined) {
            url.searchParams.set("currency_id", String(params.currency_id));
        }
        let response;
        try {
            response = await fetch(url.toString(), { headers: this.headers });
        }
        catch (err) {
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
                const body = await response.json();
                detail = body.message ? `: ${body.message}` : "";
            }
            catch {
                // ignore parse errors
            }
            throw new Error(`API error ${response.status}${detail}`);
        }
        return response.json();
    }
}
//# sourceMappingURL=client.js.map