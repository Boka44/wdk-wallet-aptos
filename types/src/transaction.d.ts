/**
 * Serializes the BCS bytes of an `EntryFunction` transaction payload.
 *
 * @param {Object} entryFunction - The entry function.
 * @param {string} entryFunction.module - The fully-qualified module address (e.g. "0x1").
 * @param {string} entryFunction.moduleName - The module name (e.g. "aptos_account").
 * @param {string} entryFunction.functionName - The function name (e.g. "transfer").
 * @param {Uint8Array[]} entryFunction.typeArgs - The BCS-encoded type arguments.
 * @param {Uint8Array[]} entryFunction.args - The BCS-encoded function arguments.
 * @returns {Uint8Array} The serialized payload.
 */
export function encodeEntryFunctionPayload({ module, moduleName, functionName, typeArgs, args }: {
    module: string;
    moduleName: string;
    functionName: string;
    typeArgs: Uint8Array[];
    args: Uint8Array[];
}): Uint8Array;
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
 * @param {Object} raw - The raw transaction.
 * @param {string} raw.sender - The sender's address.
 * @param {number | bigint} raw.sequenceNumber - The sender's sequence number.
 * @param {Uint8Array} raw.payload - The BCS-encoded transaction payload.
 * @param {number | bigint} raw.maxGasAmount - The maximum gas units.
 * @param {number | bigint} raw.gasUnitPrice - The gas unit price (in octas).
 * @param {number | bigint} raw.expirationTimestampSecs - The expiration timestamp (in seconds).
 * @param {number} raw.chainId - The chain id.
 * @returns {Uint8Array} The serialized raw transaction.
 */
export function encodeRawTransaction({ sender, sequenceNumber, payload, maxGasAmount, gasUnitPrice, expirationTimestampSecs, chainId }: {
    sender: string;
    sequenceNumber: number | bigint;
    payload: Uint8Array;
    maxGasAmount: number | bigint;
    gasUnitPrice: number | bigint;
    expirationTimestampSecs: number | bigint;
    chainId: number;
}): Uint8Array;
/**
 * Builds the signing message for a serialized raw transaction by prefixing it
 * with the Aptos `RawTransaction` domain-separation salt.
 *
 * @param {Uint8Array} rawTransactionBytes - The serialized raw transaction.
 * @returns {Uint8Array} The signing message.
 */
export function buildSigningMessage(rawTransactionBytes: Uint8Array): Uint8Array;
