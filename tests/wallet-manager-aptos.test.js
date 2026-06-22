'use strict'

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

import WalletManagerAptos from '../src/wallet-manager-aptos.js'
import WalletAccountAptos from '../src/wallet-account-aptos.js'

const SEED_PHRASE = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const RPC_URL = 'https://mock-aptos.test/v1'

// Known derivation vector for the canonical BIP-39 test mnemonic at m/44'/637'/0'/0'/0'.
const ACCOUNT_0_ADDRESS = '0xeb663b681209e7087d681c5d3eed12aaa8e1915e7c87794542c3f96e94b3d3bf'

function mockFetchOnce (status, body) {
  globalThis.fetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body))
  })
}

describe('WalletManagerAptos', () => {
  let wallet

  beforeEach(() => {
    globalThis.fetch = jest.fn()
    wallet = new WalletManagerAptos(SEED_PHRASE, { provider: RPC_URL })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getAccount', () => {
    it('returns the account at the given index with the expected address', async () => {
      const account = await wallet.getAccount(0)

      expect(account).toBeInstanceOf(WalletAccountAptos)
      expect(await account.getAddress()).toBe(ACCOUNT_0_ADDRESS)
      expect(account.path).toBe("m/44'/637'/0'/0'/0'")
      expect(account.index).toBe(0)
    })

    it('returns different accounts for different indices', async () => {
      const a0 = await wallet.getAccount(0)
      const a1 = await wallet.getAccount(1)

      expect(await a0.getAddress()).not.toBe(await a1.getAddress())
      expect(a1.path).toBe("m/44'/637'/1'/0'/0'")
    })

    it('caches the account for a given path', async () => {
      const a = await wallet.getAccount(0)
      const b = await wallet.getAccount(0)

      expect(a).toBe(b)
    })
  })

  describe('getAccountByPath', () => {
    it('derives an account at an explicit hardened path', async () => {
      const account = await wallet.getAccountByPath("0'/0'/1'")

      expect(account.path).toBe("m/44'/637'/0'/0'/1'")
    })

    it('throws on a non-hardened path', async () => {
      await expect(wallet.getAccountByPath("0'/0/0")).rejects.toThrow('hardened')
    })
  })

  describe('constructor', () => {
    it('accepts a Uint8Array seed', async () => {
      const bip39 = await import('bip39')
      const seed = bip39.mnemonicToSeedSync(SEED_PHRASE)
      const w = new WalletManagerAptos(seed, { provider: RPC_URL })
      const account = await w.getAccount(0)

      expect(await account.getAddress()).toBe(ACCOUNT_0_ADDRESS)
    })

    it('throws on an invalid seed phrase', () => {
      expect(() => new WalletManagerAptos('not a valid mnemonic')).toThrow()
    })
  })

  describe('getFeeRates', () => {
    it('maps the gas price estimate to normal/fast rates', async () => {
      mockFetchOnce(200, { gas_estimate: 100, prioritized_gas_estimate: 200, deprioritized_gas_estimate: 100 })

      const rates = await wallet.getFeeRates()

      expect(rates).toEqual({ normal: 100n, fast: 200n })
    })

    it('falls back to a multiplier when no prioritized estimate is returned', async () => {
      mockFetchOnce(200, { gas_estimate: 100 })

      const rates = await wallet.getFeeRates()

      expect(rates).toEqual({ normal: 100n, fast: 150n })
    })

    it('clamps fast to be at least normal when the provider returns an inverted estimate', async () => {
      mockFetchOnce(200, { gas_estimate: 100, prioritized_gas_estimate: 50 })

      const rates = await wallet.getFeeRates()

      expect(rates).toEqual({ normal: 100n, fast: 100n })
    })

    it('falls back to the multiplier when prioritized estimate is null', async () => {
      mockFetchOnce(200, { gas_estimate: 100, prioritized_gas_estimate: null })

      const rates = await wallet.getFeeRates()

      expect(rates).toEqual({ normal: 100n, fast: 150n })
    })

    it('throws a clear error when the gas estimate is missing or invalid', async () => {
      mockFetchOnce(200, { not_gas_estimate: 1 })
      await expect(wallet.getFeeRates()).rejects.toThrow('Invalid gas price estimate')

      mockFetchOnce(200, { gas_estimate: -5 })
      await expect(wallet.getFeeRates()).rejects.toThrow('Invalid gas price estimate')
    })

    it('throws when not connected to a provider', async () => {
      const offline = new WalletManagerAptos(SEED_PHRASE)

      await expect(offline.getFeeRates()).rejects.toThrow('must be connected to a provider')
    })
  })

  describe('dispose', () => {
    it('disposes derived accounts', async () => {
      const account = await wallet.getAccount(0)

      wallet.dispose()

      expect(account.keyPair.privateKey).toBeUndefined()
    })

    it('zeroes every account on dispose, with no orphan from concurrent derivation', async () => {
      // Concurrent calls for the same uncached path must share one account, so
      // dispose() zeroes the only derived key (no orphan leak).
      const [a, b] = await Promise.all([wallet.getAccount(0), wallet.getAccount(0)])

      expect(a).toBe(b)

      const key = a.keyPair.privateKey
      wallet.dispose()

      expect(a.keyPair.privateKey).toBeUndefined()
      expect(key.every((byte) => byte === 0)).toBe(true)
    })
  })
})
