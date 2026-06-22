// Copyright 2024 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict'

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
  constructor () {
    /** @private */
    this._bytes = []
  }

  /**
   * Returns the serialized bytes accumulated so far.
   *
   * @returns {Uint8Array} The BCS bytes.
   */
  toBytes () {
    return new Uint8Array(this._bytes)
  }

  /**
   * Serializes an unsigned 8-bit integer.
   *
   * @param {number} value - The value (0-255).
   * @returns {Bcs} This writer.
   * @throws {Error} If the value is not an integer in the range 0-255.
   */
  u8 (value) {
    if (!Number.isInteger(value) || value < 0 || value > 0xff) {
      throw new Error(`Value out of u8 range: ${value}.`)
    }

    this._bytes.push(value)

    return this
  }

  /**
   * Serializes an unsigned 64-bit integer (little-endian).
   *
   * @param {number | bigint} value - The value.
   * @returns {Bcs} This writer.
   * @throws {Error} If the value is negative or exceeds the u64 maximum (2^64 - 1).
   */
  u64 (value) {
    let v = BigInt(value)

    if (v < 0n || v > 0xffffffffffffffffn) {
      throw new Error(`Value out of u64 range: ${value}.`)
    }

    for (let i = 0; i < 8; i++) {
      this._bytes.push(Number(v & 0xffn))
      v >>= 8n
    }

    return this
  }

  /**
   * Serializes a length or variant index as a ULEB128 integer.
   *
   * @param {number} value - The value.
   * @returns {Bcs} This writer.
   */
  uleb128 (value) {
    let v = value >>> 0

    while (v >= 0x80) {
      this._bytes.push((v & 0x7f) | 0x80)
      v >>>= 7
    }

    this._bytes.push(v)

    return this
  }

  /**
   * Serializes raw bytes without a length prefix.
   *
   * @param {Uint8Array} bytes - The bytes.
   * @returns {Bcs} This writer.
   */
  bytes (bytes) {
    for (const b of bytes) {
      this._bytes.push(b)
    }

    return this
  }

  /**
   * Serializes a UTF-8 string (ULEB128 length prefix followed by the bytes).
   *
   * @param {string} value - The string.
   * @returns {Bcs} This writer.
   */
  string (value) {
    const encoded = new TextEncoder().encode(value)

    this.uleb128(encoded.length)
    this.bytes(encoded)

    return this
  }

  /**
   * Serializes a 32-byte Aptos account address. Short hex forms (e.g. "0x1")
   * are left-padded to the canonical 32-byte width.
   *
   * @param {string} address - The hex address (with or without "0x").
   * @returns {Bcs} This writer.
   * @throws {Error} If the address is not a valid hex string or exceeds 32 bytes.
   */
  address (address) {
    const raw = address.startsWith('0x') ? address.slice(2) : address

    if (raw.length === 0 || raw.length > 64 || !/^[0-9a-fA-F]+$/.test(raw)) {
      throw new Error(`Invalid Aptos address: ${address}.`)
    }

    const hex = raw.padStart(64, '0')

    for (let i = 0; i < 64; i += 2) {
      this._bytes.push(parseInt(hex.slice(i, i + 2), 16))
    }

    return this
  }

  /**
   * Serializes a byte vector (ULEB128 length prefix followed by the bytes).
   *
   * @param {Uint8Array} bytes - The bytes.
   * @returns {Bcs} This writer.
   */
  byteVector (bytes) {
    this.uleb128(bytes.length)
    this.bytes(bytes)

    return this
  }
}
