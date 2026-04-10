export interface BalanceParams {
    type?: "all" | "bonus" | "hold";
    currency_id?: number;
}
export declare class RuvdsClient {
    private readonly headers;
    constructor(token: string);
    getBalance(params?: BalanceParams): Promise<unknown>;
}
