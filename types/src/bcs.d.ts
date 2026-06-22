/**
 * Minimal Binary Canonical Serialization (BCS) writer.
 *
 * Implements only the subset required to build an Aptos `RawTransaction`
 * carrying an `EntryFunction` payload. The full BCS spec is large; the WDK
 * module needs exactly the primitives below, so a hand-rolled writer avoids
 * pulling the Aptos SDK (and its non-Bare-compatible HTTP client) into the
 * runtime dependency tree.
 *
 * @see https://github.com/diem/bcs
 */
export default class Bcs {
    /** @private */
    private _bytes;
    /**
     * Returns the serialized bytes accumulated so far.
     *
     * @returns {Uint8Array} The BCS bytes.
     */
    toBytes(): Uint8Array;
    /**
     * Serializes an unsigned 8-bit integer.
     *
     * @param {number} value - The value (0-255).
     * @returns {Bcs} This writer.
     * @throws {Error} If the value is not an integer in the range 0-255.
     */
    u8(value: number): Bcs;
    /**
     * Serializes an unsigned 64-bit integer (little-endian).
     *
     * @param {number | bigint} value - The value.
     * @returns {Bcs} This writer.
     * @throws {Error} If the value is negative or exceeds the u64 maximum (2^64 - 1).
     */
    u64(value: number | bigint): Bcs;
    /**
     * Serializes a length or variant index as a ULEB128 integer.
     *
     * @param {number} value - The value.
     * @returns {Bcs} This writer.
     */
    uleb128(value: number): Bcs;
    /**
     * Serializes raw bytes without a length prefix.
     *
     * @param {Uint8Array} bytes - The bytes.
     * @returns {Bcs} This writer.
     */
    bytes(bytes: Uint8Array): Bcs;
    /**
     * Serializes a UTF-8 string (ULEB128 length prefix followed by the bytes).
     *
     * @param {string} value - The string.
     * @returns {Bcs} This writer.
     */
    string(value: string): Bcs;
    /**
     * Serializes a 32-byte Aptos account address. Short hex forms (e.g. "0x1")
     * are left-padded to the canonical 32-byte width.
     *
     * @param {string} address - The hex address (with or without "0x").
     * @returns {Bcs} This writer.
     * @throws {Error} If the address is not a valid hex string or exceeds 32 bytes.
     */
    address(address: string): Bcs;
    /**
     * Serializes a byte vector (ULEB128 length prefix followed by the bytes).
     *
     * @param {Uint8Array} bytes - The bytes.
     * @returns {Bcs} This writer.
     */
    byteVector(bytes: Uint8Array): Bcs;
}
