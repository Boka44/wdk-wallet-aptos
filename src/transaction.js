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

// eslint-disable-next-line camelcase
import { sha3_256 } from '@noble/hashes/sha3'

import Bcs from './bcs.js'

/**
 * @typedef {Object} EntryFunctionInput
 * @property {string} module - The fully-qualified module address (e.g. "0x1").
 * @property {string} moduleName - The module name (e.g. "aptos_account").
 * @property {string} functionName - The function name (e.g. "transfer").
 * @property {Uint8Array[]} typeArgs - The BCS-encoded type arguments.
 * @property {Uint8Array[]} args - The BCS-encoded function arguments.
 */

/**
 * @typedef {Object} RawTransactionInput
 * @property {string} sender - The sender's address.
 * @property {number | bigint} sequenceNumber - The sender's sequence number.
 * @property {Uint8Array} payload - The BCS-encoded transaction payload.
 * @property {number | bigint} maxGasAmount - The maximum gas units.
 * @property {number | bigint} gasUnitPrice - The gas unit price (in octas).
 * @property {number | bigint} expirationTimestampSecs - The expiration timestamp (in seconds).
 * @property {number} chainId - The chain id.
 */

// The domain-separation prefix prepended to a serialized `RawTransaction`
// before signing: `sha3_256("APTOS::RawTransaction")`. Precomputed as a
// constant to avoid hashing the literal on every signature.
const RAW_TRANSACTION_SALT = sha3_256(new TextEncoder().encode('APTOS::RawTransaction'))

// BCS variant index for the `EntryFunction` transaction payload.
const PAYLOAD_ENTRY_FUNCTION = 2

/**
 * Serializes the BCS bytes of an `EntryFunction` transaction payload.
 *
 * @param {EntryFunctionInput} entryFunction - The entry function.
 * @returns {Uint8Array} The serialized payload.
 */
export function encodeEntryFunctionPayload ({ module, moduleName, functionName, typeArgs, args }) {
  const bcs = new Bcs()

  bcs.uleb128(PAYLOAD_ENTRY_FUNCTION)
  bcs.address(module)
  bcs.string(moduleName)
  bcs.string(functionName)

  bcs.uleb128(typeArgs.length)
  for (const typeArg of typeArgs) {
    bcs.bytes(typeArg)
  }

  bcs.uleb128(args.length)
  for (const arg of args) {
    bcs.byteVector(arg)
  }

  return bcs.toBytes()
}

/**
 * Encodes a `TypeTag::Struct` (variant index 7) for a struct with no nested
 * type parameters (e.g. `0x1::fungible_asset::Metadata`).
 *
 * @param {string} module - The module address (e.g. "0x1").
 * @param {string} moduleName - The module name.
 * @param {string} structName - The struct name.
 * @returns {Uint8Array} The serialized type tag.
 */
export function encodeStructTypeTag (module, moduleName, structName) {
  const bcs = new Bcs()

  bcs.uleb128(7)
  bcs.address(module)
  bcs.string(moduleName)
  bcs.string(structName)
  bcs.uleb128(0)

  return bcs.toBytes()
}

/**
 * Encodes an `address` function argument.
 *
 * @param {string} address - The hex address.
 * @returns {Uint8Array} The serialized argument.
 */
export function encodeAddressArg (address) {
  return new Bcs().address(address).toBytes()
}

/**
 * Encodes a `u64` function argument.
 *
 * @param {number | bigint} value - The value.
 * @returns {Uint8Array} The serialized argument.
 */
export function encodeU64Arg (value) {
  return new Bcs().u64(value).toBytes()
}

/**
 * Serializes the BCS bytes of a `RawTransaction`.
 *
 * @param {RawTransactionInput} raw - The raw transaction.
 * @returns {Uint8Array} The serialized raw transaction.
 */
export function encodeRawTransaction ({ sender, sequenceNumber, payload, maxGasAmount, gasUnitPrice, expirationTimestampSecs, chainId }) {
  const bcs = new Bcs()

  bcs.address(sender)
  bcs.u64(sequenceNumber)
  bcs.bytes(payload)
  bcs.u64(maxGasAmount)
  bcs.u64(gasUnitPrice)
  bcs.u64(expirationTimestampSecs)
  bcs.u8(chainId)

  return bcs.toBytes()
}

/**
 * Builds the signing message for a serialized raw transaction by prefixing it
 * with the Aptos `RawTransaction` domain-separation salt.
 *
 * @param {Uint8Array} rawTransactionBytes - The serialized raw transaction.
 * @returns {Uint8Array} The signing message.
 */
export function buildSigningMessage (rawTransactionBytes) {
  const message = new Uint8Array(RAW_TRANSACTION_SALT.length + rawTransactionBytes.length)

  message.set(RAW_TRANSACTION_SALT, 0)
  message.set(rawTransactionBytes, RAW_TRANSACTION_SALT.length)

  return message
}
