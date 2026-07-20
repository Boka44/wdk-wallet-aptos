/**
 * Serializes the BCS bytes of an `EntryFunction` transaction payload.
 *
 * @param {EntryFunctionInput} entryFunction - The entry function.
 * @returns {Uint8Array} The serialized payload.
 */
export function encodeEntryFunctionPayload({ module, moduleName, functionName, typeArgs, args }: EntryFunctionInput): Uint8Array;
/**
 * Encodes a `TypeTag::Struct` (variant index 7) for a struct with no nested
 * type parameters (e.g. `0x1::fungible_asset::Metadata`).
 *
 * @param {string} module - The module address (e.g. "0x1").
 * @param {string} moduleName - The module name.
 * @param {string} structName - The struct name.
 * @returns {Uint8Array} The serialized type tag.
 */
export function encodeStructTypeTag(module: string, moduleName: string, structName: string): Uint8Array;
/**
 * Encodes an `address` function argument.
 *
 * @param {string} address - The hex address.
 * @returns {Uint8Array} The serialized argument.
 */
export function encodeAddressArg(address: string): Uint8Array;
/**
 * Encodes a `u64` function argument.
 *
 * @param {number | bigint} value - The value.
 * @returns {Uint8Array} The serialized argument.
 */
export function encodeU64Arg(value: number | bigint): Uint8Array;
/**
 * Serializes the BCS bytes of a `RawTransaction`.
 *
 * @param {RawTransactionInput} raw - The raw transaction.
 * @returns {Uint8Array} The serialized raw transaction.
 */
export function encodeRawTransaction({ sender, sequenceNumber, payload, maxGasAmount, gasUnitPrice, expirationTimestampSecs, chainId }: RawTransactionInput): Uint8Array;
/**
 * Builds the signing message for a serialized raw transaction by prefixing it
 * with the Aptos `RawTransaction` domain-separation salt.
 *
 * @param {Uint8Array} rawTransactionBytes - The serialized raw transaction.
 * @returns {Uint8Array} The signing message.
 */
export function buildSigningMessage(rawTransactionBytes: Uint8Array): Uint8Array;
export type EntryFunctionInput = {
    /**
     * - The fully-qualified module address (e.g. "0x1").
     */
    module: string;
    /**
     * - The module name (e.g. "aptos_account").
     */
    moduleName: string;
    /**
     * - The function name (e.g. "transfer").
     */
    functionName: string;
    /**
     * - The BCS-encoded type arguments.
     */
    typeArgs: Uint8Array[];
    /**
     * - The BCS-encoded function arguments.
     */
    args: Uint8Array[];
};
export type RawTransactionInput = {
    /**
     * - The sender's address.
     */
    sender: string;
    /**
     * - The sender's sequence number.
     */
    sequenceNumber: number | bigint;
    /**
     * - The BCS-encoded transaction payload.
     */
    payload: Uint8Array;
    /**
     * - The maximum gas units.
     */
    maxGasAmount: number | bigint;
    /**
     * - The gas unit price (in octas).
     */
    gasUnitPrice: number | bigint;
    /**
     * - The expiration timestamp (in seconds).
     */
    expirationTimestampSecs: number | bigint;
    /**
     * - The chain id.
     */
    chainId: number;
};
