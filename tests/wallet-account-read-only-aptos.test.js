'use strict'

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

import { hexToBytes } from '@noble/hashes/utils'

import WalletAccountReadOnlyAptos, { normalizeAddress } from '../src/wallet-account-read-only-aptos.js'
import WalletAccountAptos from '../src/wallet-account-aptos.js'

const SEED_PHRASE = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const PUBLIC_KEY = 'a686f0309ab80312979606cfccc10ea2740147ae6888351488d11c46f08fbf60'

const ADDRESS = '0xeb663b681209e7087d681c5d3eed12aaa8e1915e7c87794542c3f96e94b3d3bf'
const RPC_URL = 'https://mock-aptos.test/v1'
const USDT = '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b'
const RECIPIENT = '0x1111111111111111111111111111111111111111111111111111111111111111'

function mockFetchOnce (status, body) {
  globalThis.fetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : 'OK',
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body))
  })
}

describe('WalletAccountReadOnlyAptos', () => {
  let account

  beforeEach(() => {
    globalThis.fetch = jest.fn()
    account = new WalletAccountReadOnlyAptos(ADDRESS, { provider: RPC_URL, chainId: 1 })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getAddress', () => {
    it('returns the configured address', async () => {
      expect(await account.getAddress()).toBe(ADDRESS)
    })
  })

  describe('getBalance', () => {
    it('returns the native APT balance', async () => {
      mockFetchOnce(200, '12345')

      expect(await account.getBalance()).toBe(12345n)
    })

    it('returns 0 for a non-existent account', async () => {
      mockFetchOnce(404, { message: 'not found' })

      expect(await account.getBalance()).toBe(0n)
    })

    it('preserves precision for balances above the safe-integer range', async () => {
      // 90071992547409910001 octas — would round if parsed as a JS float.
      mockFetchOnce(200, '90071992547409910001')

      expect(await account.getBalance()).toBe(90071992547409910001n)
    })

    it('throws a clear error on a non-numeric balance body', async () => {
      mockFetchOnce(200, 'not-a-number')

      await expect(account.getBalance()).rejects.toThrow('Unexpected balance response')
    })

    it('throws when not connected to a provider', async () => {
      const offline = new WalletAccountReadOnlyAptos(ADDRESS)

      await expect(offline.getBalance()).rejects.toThrow('must be connected to a provider')
    })
  })

  describe('getTokenBalance', () => {
    it('returns the fungible asset balance', async () => {
      mockFetchOnce(200, '5000000')

      expect(await account.getTokenBalance(USDT)).toBe(5000000n)
    })

    it('returns 0 when the primary store does not exist', async () => {
      mockFetchOnce(404, { message: 'not found' })

      expect(await account.getTokenBalance(USDT)).toBe(0n)
    })
  })

  describe('getTransactionReceipt', () => {
    it('returns the transaction when committed', async () => {
      mockFetchOnce(200, { hash: '0xabc', success: true })

      expect(await account.getTransactionReceipt('0xabc')).toEqual({ hash: '0xabc', success: true })
    })

    it('returns null when the transaction is not found', async () => {
      mockFetchOnce(404, { message: 'not found' })

      expect(await account.getTransactionReceipt('0xabc')).toBeNull()
    })
  })

  describe('verify', () => {
    it('throws with a clear error when the public key is unknown (address-only account)', async () => {
      await expect(account.verify('msg', '00'.repeat(64)))
        .rejects.toThrow('public key is required')
    })

    it('verifies a signature produced by the matching full account', async () => {
      const full = await WalletAccountAptos.at(SEED_PHRASE, "0'/0'/0'")
      const signature = await full.sign('hello world')

      const readOnly = new WalletAccountReadOnlyAptos(ADDRESS, { provider: RPC_URL }, hexToBytes(PUBLIC_KEY))

      expect(await readOnly.verify('hello world', signature)).toBe(true)
      expect(await readOnly.verify('tampered', signature)).toBe(false)
    })

    it('verifies via the account returned by toReadOnlyAccount()', async () => {
      const full = await WalletAccountAptos.at(SEED_PHRASE, "0'/0'/0'")
      const signature = await full.sign('round trip')
      const readOnly = await full.toReadOnlyAccount()

      expect(await readOnly.verify('round trip', signature)).toBe(true)
    })

    it('accepts a 0x-prefixed signature (the form signTransaction and the SDK emit)', async () => {
      const full = await WalletAccountAptos.at(SEED_PHRASE, "0'/0'/0'")
      const signature = await full.sign('prefixed')
      const readOnly = new WalletAccountReadOnlyAptos(ADDRESS, { provider: RPC_URL }, hexToBytes(PUBLIC_KEY))

      expect(await readOnly.verify('prefixed', `0x${signature}`)).toBe(true)
    })

    it('returns false (does not throw) on malformed signatures', async () => {
      const readOnly = new WalletAccountReadOnlyAptos(ADDRESS, { provider: RPC_URL }, hexToBytes(PUBLIC_KEY))

      for (const bad of ['', 'abc', 'zzzz', 'aabb', '00'.repeat(65)]) {
        expect(await readOnly.verify('msg', bad)).toBe(false)
      }
    })
  })

  describe('quote operations', () => {
    it('throws on an address-only account (no public key for simulation)', async () => {
      await expect(account.quoteSendTransaction({ to: ADDRESS, value: 1n }))
        .rejects.toThrow('public key is required')
    })

    it('returns the simulated fee when the public key is known', async () => {
      const withKey = new WalletAccountReadOnlyAptos(ADDRESS, { provider: RPC_URL, chainId: 1 }, hexToBytes(PUBLIC_KEY))
      globalThis.fetch.mockImplementation(async (url) => {
        const u = String(url)
        let body
        if (u.includes('/estimate_gas_price')) body = { gas_estimate: 100 }
        else if (u.endsWith('/accounts/' + ADDRESS)) body = { sequence_number: '4', authentication_key: ADDRESS }
        else if (u.includes('/transactions/simulate')) body = [{ success: true, vm_status: 'ok', gas_used: '7', gas_unit_price: '100' }]
        else body = {}
        return { ok: true, status: 200, statusText: 'OK', text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) }
      })

      expect(await withKey.quoteSendTransaction({ to: RECIPIENT, value: 1n })).toEqual({ fee: 700n })
      expect(await withKey.quoteTransfer({ token: USDT, recipient: RECIPIENT, amount: 1n })).toEqual({ fee: 700n })
    })

    it('rejects a quote when the simulation fails', async () => {
      const withKey = new WalletAccountReadOnlyAptos(ADDRESS, { provider: RPC_URL, chainId: 1 }, hexToBytes(PUBLIC_KEY))
      globalThis.fetch.mockImplementation(async (url) => {
        const u = String(url)
        let body
        if (u.includes('/estimate_gas_price')) body = { gas_estimate: 100 }
        else if (u.endsWith('/accounts/' + ADDRESS)) body = { sequence_number: '4', authentication_key: ADDRESS }
        else if (u.includes('/transactions/simulate')) body = [{ success: false, vm_status: 'OUT_OF_GAS', gas_used: '0', gas_unit_price: '100' }]
        else body = {}
        return { ok: true, status: 200, statusText: 'OK', text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) }
      })

      await expect(withKey.quoteTransfer({ token: USDT, recipient: RECIPIENT, amount: 1n }))
        .rejects.toThrow('simulation failed')
    })
  })

  describe('provider failover', () => {
    const PROVIDERS = ['https://a.test/v1', 'https://b.test/v1']

    it('does NOT retry a deterministic 4xx across providers', async () => {
      let calls = 0
      globalThis.fetch.mockImplementation(async () => {
        calls++
        return { ok: false, status: 400, statusText: 'Bad Request', text: async () => JSON.stringify({ message: 'invalid asset type' }) }
      })

      const acct = new WalletAccountReadOnlyAptos(ADDRESS, { provider: PROVIDERS, chainId: 1 })

      await expect(acct.getTokenBalance('0x' + '1'.repeat(64))).rejects.toThrow('400')
      expect(calls).toBe(1)
    })

    it('fails over to the next provider on a transient network error', async () => {
      let calls = 0
      globalThis.fetch.mockImplementation(async () => {
        calls++
        if (calls === 1) throw new Error('network down')
        return { ok: true, status: 200, statusText: 'OK', text: async () => '777' }
      })

      const acct = new WalletAccountReadOnlyAptos(ADDRESS, { provider: PROVIDERS, chainId: 1 })

      expect(await acct.getBalance()).toBe(777n)
      expect(calls).toBe(2)
    })
  })
})

describe('normalizeAddress', () => {
  it('left-pads a short address to 32 bytes', () => {
    expect(normalizeAddress('0xa')).toBe('0x000000000000000000000000000000000000000000000000000000000000000a')
  })

  it('accepts addresses without a 0x prefix', () => {
    expect(normalizeAddress('1')).toBe('0x0000000000000000000000000000000000000000000000000000000000000001')
  })

  it('leaves a full-length address unchanged', () => {
    expect(normalizeAddress(ADDRESS)).toBe(ADDRESS)
  })
})
