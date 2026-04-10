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
    const qstr = qs.toString();
    const query = qstr ? `?${qstr}` : "";
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
