export type ServerAction = "power_on" | "power_off" | "reboot" | "force_off";
export interface BalanceParams {
    type?: "all" | "bonus" | "hold";
    currency_id?: number;
}
export declare class RuvdsClient {
    private readonly headers;
    constructor(token: string);
    private request;
    getBalance(params?: BalanceParams): Promise<unknown>;
    listServers(): Promise<unknown>;
    getServer(id: number): Promise<unknown>;
    getServerStats(id: number): Promise<unknown>;
    getServerNetworks(id: number): Promise<unknown>;
    getServerPowerState(id: number): Promise<unknown>;
    serverCommand(id: number, action: ServerAction): Promise<unknown>;
}
