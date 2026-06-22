/**
 * @typedef {Object} AptosAccountData
 * @property {string} sequence_number - The account's sequence number.
 * @property {string} authentication_key - The account's authentication key.
 */
/**
 * A thin client over the Aptos fullnode REST API (`/v1`).
 *
 * Uses the global `fetch` rather than the Aptos SDK's HTTP client so the
 * module stays Bare-runtime compatible (the SDK eagerly imports `undici`,
 * which Bare does not provide).
 */
export default class AptosRpc {
    /**
     * Creates a new Aptos REST client.
     *
     * @param {string | string[]} provider - The fullnode REST URL (e.g. "https://fullnode.mainnet.aptoslabs.com/v1"). An array enables failover across multiple urls.
     * @param {Object} [options] - The options.
     * @param {number} [options.retries] - The number of failover retry attempts (default: 3).
     */
    constructor(provider: string | string[], { retries }?: {
        retries?: number;
    });
    /** @private */
    private _client;
    /**
     * Returns the ledger info (chain id, ledger version, etc.).
     *
     * @returns {Promise<Object>} The ledger info.
     */
    getLedgerInfo(): Promise<any>;
    /**
     * Returns the on-chain data for an account, or null if the account has not
     * been created yet.
     *
     * @param {string} address - The account address.
     * @returns {Promise<AptosAccountData | null>} The account data, or null.
     */
    getAccount(address: string): Promise<AptosAccountData | null>;
    /**
     * Returns the balance of an asset for an account. Accepts either a coin type
     * tag (e.g. "0x1::aptos_coin::AptosCoin") or a fungible asset metadata
     * address (e.g. "0xa"). Returns 0n when the account or store does not exist.
     *
     * @param {string} address - The account address.
     * @param {string} assetType - The coin type tag or fungible asset metadata address.
     * @returns {Promise<bigint>} The balance (in base units).
     */
    getBalance(address: string, assetType: string): Promise<bigint>;
    /**
     * Returns the current gas price estimate.
     *
     * @returns {Promise<{ gas_estimate: number, deprioritized_gas_estimate?: number, prioritized_gas_estimate?: number }>} The estimate.
     */
    estimateGasPrice(): Promise<{
        gas_estimate: number;
        deprioritized_gas_estimate?: number;
        prioritized_gas_estimate?: number;
    }>;
    /**
     * Simulates a transaction without submitting it. The transaction's signature
     * must be a zero signature (the VM derives the authentication key from the
     * public key but does not verify the signature for simulations).
     *
     * @param {Object} signedTransaction - The signed transaction (JSON form).
     * @returns {Promise<Object>} The simulation result.
     */
    simulateTransaction(signedTransaction: any): Promise<any>;
    /**
     * Submits a signed transaction.
     *
     * @param {Object} signedTransaction - The signed transaction (JSON form).
     * @returns {Promise<{ hash: string }>} The pending transaction.
     */
    submitTransaction(signedTransaction: any): Promise<{
        hash: string;
    }>;
    /**
     * Returns a transaction by its hash, or null if it has not been committed yet.
     *
     * @param {string} hash - The transaction hash.
     * @returns {Promise<Object | null>} The transaction, or null.
     */
    getTransactionByHash(hash: string): Promise<any | null>;
}
export type AptosAccountData = {
    /**
     * - The account's sequence number.
     */
    sequence_number: string;
    /**
     * - The account's authentication key.
     */
    authentication_key: string;
};
