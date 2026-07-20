'use strict'

// Read-only integration tests against Aptos mainnet. No funds are moved.
// Run with: npm run test:integration

import { describe, it, expect, beforeAll } from '@jest/globals'

import WalletManagerAptos from '../../src/wallet-manager-aptos.js'

const PROVIDER = process.env.APTOS_RPC_URL || 'https://fullnode.mainnet.aptoslabs.com/v1'
const SEED_PHRASE = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const USDT = '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b'
const RECIPIENT = '0x1111111111111111111111111111111111111111111111111111111111111111'

describe('WalletManagerAptos (mainnet, read-only)', () => {
  let wallet
  let account

  beforeAll(async () => {
    wallet = new WalletManagerAptos(SEED_PHRASE, { provider: PROVIDER })
    account = await wallet.getAccount(0)
  })

  it('derives the expected mainnet address', async () => {
    expect(await account.getAddress()).toBe('0xeb663b681209e7087d681c5d3eed12aaa8e1915e7c87794542c3f96e94b3d3bf')
  })

  it('reads the native APT balance', async () => {
    const balance = await account.getBalance()

    expect(typeof balance).toBe('bigint')
    expect(balance >= 0n).toBe(true)
  })

  it('reads the USDT fungible asset balance', async () => {
    const balance = await account.getTokenBalance(USDT)

    expect(typeof balance).toBe('bigint')
    expect(balance >= 0n).toBe(true)
  })

  it('returns positive fee rates', async () => {
    const rates = await wallet.getFeeRates()

    expect(rates.normal > 0n).toBe(true)
    expect(rates.fast >= rates.normal).toBe(true)
  })

  it('rejects a quote for a transfer the account cannot afford (simulation gate)', async () => {
    // The test account holds no USDT and no APT for gas, so the on-chain
    // simulation reports failure and the quote must surface it rather than
    // returning a fee for a transaction that would fail.
    await expect(account.quoteTransfer({ token: USDT, recipient: RECIPIENT, amount: 1_000_000n }))
      .rejects.toThrow('simulation failed')
  })

  it('returns null for an unknown transaction hash', async () => {
    const receipt = await account.getTransactionReceipt('0x' + '0'.repeat(64))

    expect(receipt).toBeNull()
  })
})
