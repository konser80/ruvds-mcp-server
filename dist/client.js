const BASE_URL = "https://api.ruvds.com";
export class RuvdsClient {
    headers;
    constructor(token) {
        this.headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        };
    }
    async request(path, method = "GET", payload) {
        let response;
        try {
            response = await fetch(`${BASE_URL}${path}`, {
                method,
                headers: this.headers,
                ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
            });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new Error(`Network error: ${msg}`);
        }
        if (response.status === 401)
            throw new Error("Invalid API token");
        if (response.status >= 500)
            throw new Error(`RUVDS server error ${response.status}`);
        if (!response.ok) {
            let detail = "";
            try {
                const errorBody = await response.json();
                detail = errorBody.message ? `: ${errorBody.message}` : "";
            }
            catch {
                // ignore parse errors
            }
            throw new Error(`API error ${response.status}${detail}`);
        }
        return response.json();
    }
    async getBalance(params = {}) {
        const qs = new URLSearchParams();
        if (params.type !== undefined)
            qs.set("type", params.type);
        if (params.currency_id !== undefined)
            qs.set("currency_id", String(params.currency_id));
        const qstr = qs.toString();
        const query = qstr ? `?${qstr}` : "";
        return this.request(`/v2/balance${query}`);
    }
    async listServers() {
        return this.request("/v2/servers");
    }
    async getServer(id) {
        return this.request(`/v2/servers/${id}`);
    }
    async getServerStats(id) {
        return this.request(`/v2/servers/${id}/statistics`);
    }
    async getServerNetworks(id) {
        return this.request(`/v2/servers/${id}/networks`);
    }
    async getServerPowerState(id) {
        return this.request(`/v2/servers/${id}/power_state`);
    }
    async serverCommand(id, action) {
        return this.request(`/v2/servers/${id}/actions`, "PUT", { action });
    }
}
//# sourceMappingURL=client.js.map