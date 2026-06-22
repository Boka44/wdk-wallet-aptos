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

import { ed25519 } from '@noble/curves/ed25519'
// eslint-disable-next-line camelcase
import { sha3_256 } from '@noble/hashes/sha3'
import { bytesToHex } from '@noble/hashes/utils'

import HDKey from 'micro-key-producer/slip10.js'

import * as bip39 from 'bip39'

// eslint-disable-next-line camelcase
import { sodium_memzero } from 'sodium-universal'

import WalletAccountReadOnlyAptos, { normalizeAddress } from './wallet-account-read-only-aptos.js'
import { encodeRawTransaction, buildSigningMessage } from './transaction.js'

/** @typedef {import('@tetherto/wdk-wallet').KeyPair} KeyPair */
/** @typedef {import('@tetherto/wdk-wallet').TransactionResult} TransactionResult */
/** @typedef {import('@tetherto/wdk-wallet').TransferOptions} TransferOptions */
/** @typedef {import('@tetherto/wdk-wallet').TransferResult} TransferResult */

/** @typedef {import('./wallet-account-read-only-aptos.js').AptosTransaction} AptosTransaction */
/** @typedef {import('./wallet-account-read-only-aptos.js').AptosWalletConfig} AptosWalletConfig */
/** @typedef {import('./wallet-account-read-only-aptos.js').EntryFunctionPayload} EntryFunctionPayload */

/**
 * The [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)
 * coin-type prefix for Aptos (see SLIP-0044). All path segments must be
 * hardened: SLIP-0010 Ed25519 derivation does not support non-hardened
 * children.
 *
 * @private
 */
const BIP_44_APTOS_DERIVATION_PATH_PREFIX = "m/44'/637'"

/**
 * The single-signer Ed25519 authentication scheme identifier, appended to the
 * public key before hashing to derive the authentication key.
 *
 * @private
 */
const ED25519_SCHEME = 0x00

/**
 * The buffer multiplier applied to a simulated `gas_used` to set the
 * transaction's `max_gas_amount`, accommodating minor on-chain state changes
 * between simulation and submission.
 *
 * @private
 */
const MAX_GAS_BUFFER = 2n

/**
 * The fallback `max_gas_amount` used when a simulation reports zero gas usage
 * (e.g. for an account that cannot cover the fee).
 *
 * @private
 */
const DEFAULT_MAX_GAS_AMOUNT = 100000n

/**
 * Asserts that a user-supplied derivation path is exactly three hardened
 * index segments with no leading zeros (the module prepends m/44'/637', so a
 * spec-compliant Aptos path leaves three segments).
 *
 * @param {string} path - The derivation path.
 * @throws {Error} If the path does not have exactly three hardened, leading-zero-free index segments.
 * @private
 */
function assertFullHardenedPath (path) {
  const segments = path.split('/')

  // The module prepends m/44'/637', so a spec-compliant Aptos path
  // (m/44'/637'/account'/change'/address') leaves exactly three user segments.
  if (segments.length !== 3) {
    throw new Error("In Aptos, the derivation path must have exactly three hardened segments (e.g. \"0'/0'/0'\").")
  }

  // Each segment must be a hardened index with no leading zeros, so that
  // distinct path strings cannot alias the same derived key (e.g. "00'" vs "0'").
  const isValid = segments.every((segment) => /^(0|[1-9]\d*)'$/.test(segment))

  if (!isValid) {
    throw new Error('In Aptos, every child path in a derivation path must be a hardened index without leading zeros.')
  }
}

/**
 * Zeroes a key-material buffer in place, if present.
 *
 * @param {Uint8Array} [bytes] - The buffer to wipe.
 * @private
 */
function wipe (bytes) {
  if (bytes) {
    sodium_memzero(bytes)
  }
}

/**
 * Full-featured Aptos wallet account implementation with signing capabilities.
 *
 * @implements {import('@tetherto/wdk-wallet').IWalletAccount}
 */
export default class WalletAccountAptos extends WalletAccountReadOnlyAptos {
  /**
   * @private
   * Use {@link WalletAccountAptos.at} instead.
   */
  constructor (seed, path, config = {}) {
    // Only a seed we derive from a mnemonic is ours to wipe; a caller-supplied
    // Uint8Array seed is left untouched (it may be reused elsewhere).
    let ownedSeed
    if (typeof seed === 'string') {
      if (!bip39.validateMnemonic(seed)) {
        throw new Error('The seed phrase is invalid.')
      }

      seed = bip39.mnemonicToSeedSync(seed)
      ownedSeed = seed
    }

    assertFullHardenedPath(path)

    const fullPath = `${BIP_44_APTOS_DERIVATION_PATH_PREFIX}/${path}`

    const hdKey = HDKey.fromMasterSeed(seed)
    const { privateKey } = hdKey.derive(fullPath, true)
    const publicKey = ed25519.getPublicKey(privateKey)
    const address = deriveAddress(publicKey)

    // Scrub the intermediate key material: the master node's private key and
    // chain code, and the mnemonic-derived seed if we created it. The retained
    // account key (`privateKey`) is a distinct buffer, wiped on dispose().
    wipe(hdKey.privateKey)
    wipe(hdKey.chainCode)
    wipe(ownedSeed)

    super(address, config, publicKey)

    /**
     * The wallet account configuration.
     *
     * @protected
     * @type {AptosWalletConfig}
     */
    this._config = config

    /** @private */
    this._path = fullPath

    /**
     * The raw Ed25519 private key (32 bytes), or undefined once disposed.
     *
     * @private
     * @type {Uint8Array | undefined}
     */
    this._privateKey = privateKey
  }

  /**
   * Creates a new aptos wallet account.
   *
   * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed.
   * @param {string} path - The BIP-44 derivation path (e.g. "0'/0'/0'").
   * @param {AptosWalletConfig} [config] - The configuration object.
   * @returns {Promise<WalletAccountAptos>} The wallet account.
   */
  static async at (seed, path, config = {}) {
    return new WalletAccountAptos(seed, path, config)
  }

  /**
   * The derivation path's index of this account.
   *
   * @type {number}
   */
  get index () {
    const segments = this._path.split('/')

    return +segments[3].replace("'", '')
  }

  /**
   * The derivation path of this account.
   *
   * @type {string}
   */
  get path () {
    return this._path
  }

  /**
   * The account's key pair.
   *
   * @type {KeyPair}
   */
  get keyPair () {
    return {
      publicKey: this._publicKey,
      privateKey: this._privateKey
    }
  }

  /**
   * Signs a message.
   *
   * @param {string} message - The message to sign.
   * @returns {Promise<string>} The message's signature (hex).
   */
  async sign (message) {
    if (!this._privateKey) {
      throw new Error('The wallet account has been disposed.')
    }

    const signature = ed25519.sign(new TextEncoder().encode(message), this._privateKey)

    return bytesToHex(signature)
  }

  /**
   * Signs a native APT transfer without broadcasting it. Offline signing of
   * fungible-asset (token) transfers is not supported; use {@link transfer}
   * for tokens.
   *
   * @param {AptosTransaction} tx - The native APT transaction to sign.
   * @returns {Promise<Object>} The signed transaction (JSON form, ready to submit).
   */
  async signTransaction (tx) {
    if (!this._privateKey) {
      throw new Error('The wallet account has been disposed.')
    }

    if (!this._rpc) {
      throw new Error('The wallet must be connected to a provider to sign transactions.')
    }

    const { signedTransaction } = await this._buildSignedTransaction(this._buildNativeTransferPayload(tx.to, tx.value))

    return signedTransaction
  }

  /**
   * Sends a transaction.
   *
   * @param {AptosTransaction} tx - The transaction.
   * @returns {Promise<TransactionResult>} The transaction's result.
   */
  async sendTransaction (tx) {
    if (!this._privateKey) {
      throw new Error('The wallet account has been disposed.')
    }

    if (!this._rpc) {
      throw new Error('The wallet must be connected to a provider to send transactions.')
    }

    return this._submit(this._buildNativeTransferPayload(tx.to, tx.value))
  }

  /**
   * Transfers a fungible asset to another address.
   *
   * @param {TransferOptions} options - The transfer's options.
   * @returns {Promise<TransferResult>} The transfer's result.
   */
  async transfer (options) {
    if (!this._privateKey) {
      throw new Error('The wallet account has been disposed.')
    }

    if (!this._rpc) {
      throw new Error('The wallet must be connected to a provider to transfer tokens.')
    }

    const payload = this._buildFungibleAssetTransferPayload(options.token, options.recipient, options.amount)

    return this._submit(payload, this._config.transferMaxFee)
  }

  /**
   * Returns a read-only copy of the account.
   *
   * @returns {Promise<WalletAccountReadOnlyAptos>} The read-only account.
   */
  async toReadOnlyAccount () {
    const address = await this.getAddress()

    return new WalletAccountReadOnlyAptos(address, this._config, this._publicKey)
  }

  /**
   * Disposes the wallet account, erasing the private key from the memory.
   */
  dispose () {
    if (this._privateKey) {
      sodium_memzero(this._privateKey)
    }

    this._privateKey = undefined
  }

  /**
   * Signs a payload descriptor into a submittable transaction (JSON form),
   * using the supplied gas parameters.
   *
   * @private
   * @param {EntryFunctionPayload} payload - The payload descriptor.
   * @param {Object} gas - The gas parameters.
   * @param {bigint} gas.maxGasAmount - The maximum gas units.
   * @param {bigint} gas.gasUnitPrice - The gas unit price (in octas).
   * @returns {Promise<Object>} The signed transaction (JSON form).
   */
  async _signPayload (payload, { maxGasAmount, gasUnitPrice }) {
    const sender = await this.getAddress()
    const [sequenceNumber, chainId] = await Promise.all([
      this._getSequenceNumber(sender),
      this._getChainId()
    ])

    const expiration = BigInt(this._expirationTimestamp())

    const rawTransaction = encodeRawTransaction({
      sender,
      sequenceNumber,
      payload: this._encodePayloadBcs(payload),
      maxGasAmount,
      gasUnitPrice,
      expirationTimestampSecs: expiration,
      chainId
    })

    const signature = ed25519.sign(buildSigningMessage(rawTransaction), this._privateKey)

    return {
      sender,
      sequence_number: sequenceNumber.toString(),
      max_gas_amount: maxGasAmount.toString(),
      gas_unit_price: gasUnitPrice.toString(),
      expiration_timestamp_secs: expiration.toString(),
      payload: { type: 'entry_function_payload', ...payload },
      signature: {
        type: 'ed25519_signature',
        public_key: `0x${bytesToHex(this._publicKey)}`,
        signature: `0x${bytesToHex(signature)}`
      }
    }
  }

  /**
   * Simulates a payload once and signs it, deriving `max_gas_amount` from the
   * simulated usage (with a safety buffer) and `gas_unit_price` from the same
   * simulation. Optionally enforces a maximum fee.
   *
   * @private
   * @param {EntryFunctionPayload} payload - The payload descriptor.
   * @param {number | bigint} [maxFee] - The maximum allowed fee in octas.
   * @returns {Promise<{ signedTransaction: Object, fee: bigint }>} The signed transaction and its estimated fee.
   */
  async _buildSignedTransaction (payload, maxFee) {
    const simulation = await this._simulate(payload)
    const gasUsed = BigInt(simulation.gas_used)
    const gasUnitPrice = BigInt(simulation.gas_unit_price)
    const fee = gasUsed * gasUnitPrice

    if (maxFee !== undefined && fee >= BigInt(maxFee)) {
      throw new Error('Exceeded maximum fee cost for transfer operation.')
    }

    const maxGasAmount = gasUsed > 0n ? gasUsed * MAX_GAS_BUFFER : DEFAULT_MAX_GAS_AMOUNT

    const signedTransaction = await this._signPayload(payload, { maxGasAmount, gasUnitPrice })

    return { signedTransaction, fee }
  }

  /**
   * Signs and submits a transaction for a payload descriptor.
   *
   * @private
   * @param {EntryFunctionPayload} payload - The payload descriptor.
   * @param {number | bigint} [maxFee] - The maximum allowed fee in octas.
   * @returns {Promise<TransactionResult>} The transaction's result.
   */
  async _submit (payload, maxFee) {
    const { signedTransaction, fee } = await this._buildSignedTransaction(payload, maxFee)
    const { hash } = await this._rpc.submitTransaction(signedTransaction)

    return { hash, fee }
  }
}

/**
 * Derives an Aptos account address from an Ed25519 public key:
 * `sha3_256(publicKey ‖ 0x00)`, hex-encoded.
 *
 * @param {Uint8Array} publicKey - The 32-byte Ed25519 public key.
 * @returns {string} The account address.
 * @private
 */
function deriveAddress (publicKey) {
  const input = new Uint8Array(publicKey.length + 1)

  input.set(publicKey, 0)
  input[publicKey.length] = ED25519_SCHEME

  return normalizeAddress(bytesToHex(sha3_256(input)))
}
