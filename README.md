# @tetherto/wdk-wallet-aptos

[![license](https://img.shields.io/badge/license-Apache--2.0-blue.svg?style=flat-square)](./LICENSE)

**Note**: This package is currently in beta. Please test thoroughly in development environments before using in production.

A WDK module to manage [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki) wallets for the Aptos blockchain. It implements the `@tetherto/wdk-wallet` `WalletManager` / `IWalletAccount` contract so Aptos accounts can be registered and used through a `WDK` instance like any other chain.

## About WDK

This module is part of the [**WDK (Wallet Development Kit)**](https://docs.wallet.tether.io/) project, which empowers developers to build secure, non-custodial wallets with unified blockchain access, stateless architecture, and complete user control.

## Installation

```bash
npm install @tetherto/wdk-wallet-aptos
```

## Quick Start

```javascript
import WalletManagerAptos from '@tetherto/wdk-wallet-aptos'

const seedPhrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

const wallet = new WalletManagerAptos(seedPhrase, {
  provider: 'https://fullnode.mainnet.aptoslabs.com/v1'
})

const account = await wallet.getAccount(0)

console.log('Address:', await account.getAddress())
console.log('APT balance:', await account.getBalance())

// USDT (native fungible asset on Aptos)
const USDT = '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b'
console.log('USDT balance:', await account.getTokenBalance(USDT))

// Transfer 1 USDT (6 decimals)
const { hash, fee } = await account.transfer({
  token: USDT,
  recipient: '0x...',
  amount: 1_000_000n
})

account.dispose()
```

## Configuration

`WalletManagerAptos(seed, config)` accepts the following `config` options:

| Option | Type | Description |
|--------|------|-------------|
| `provider` | `string \| string[]` | Aptos fullnode REST url. An array enables automatic failover across endpoints. |
| `chainId` | `number` | The chain id (mainnet: `1`, testnet: `2`). Fetched from the ledger info on first use if omitted. |
| `retries` | `number` | Failover retry attempts when `provider` is a list (default: `3`). |
| `txnExpirationSecs` | `number` | Transaction expiration window in seconds from now (default: `60`). |
| `transferMaxFee` | `number \| bigint` | Maximum allowed fee in octas for `transfer` operations. |

## Aptos specifics

- **Derivation**: `m/44'/637'/account'/0'/0'` (SLIP-0010 Ed25519, all segments hardened). `getAccount(index)` maps to `account = index`.
- **Address**: 32-byte, derived as `sha3_256(publicKey ‖ 0x00)`, rendered as a `0x`-prefixed 64-hex string. Short forms (e.g. `0xa`) are accepted as inputs and normalized.
- **Token model**: tokens use the [Fungible Asset (FA)](https://aptos.dev/build/smart-contracts/fungible-asset) standard. `getTokenBalance(tokenAddress)` and `transfer({ token, ... })` take the **FA metadata address** (e.g. the USDT metadata address above), not a coin type tag.
- **Native APT**: sent via `0x1::aptos_account::transfer`; FA tokens via `0x1::primary_fungible_store::transfer`. Both auto-create the recipient's account / primary store. Balances are read through the unified `/accounts/{addr}/balance/{asset}` endpoint, which transparently aggregates legacy `Coin` and migrated FA balances and returns `0` for accounts that do not exist yet.
- **Decimals**: APT = 8, USDT = 6.
- **Offline signing**: `signTransaction` covers native APT transfers only. Token (fungible asset) transfers go through `transfer`, which simulates, signs, and submits in one call.
- **Runtime**: the module talks to the fullnode REST API over the global `fetch` and does not depend on the Aptos SDK at runtime, keeping it compatible with both Node.js and the Bare runtime.

## API

The module implements the standard WDK wallet contract:

- `WalletManagerAptos`: `getAccount(index)`, `getAccountByPath(path)`, `getFeeRates()`, `dispose()`
- `WalletAccountAptos`: `getAddress()`, `getBalance()`, `getTokenBalance(token)`, `sign(message)`, `verify(message, signature)`, `signTransaction(tx)`, `sendTransaction(tx)`, `transfer(options)`, `quoteSendTransaction(tx)`, `quoteTransfer(options)`, `getTransactionReceipt(hash)`, `toReadOnlyAccount()`, `dispose()`
- `WalletAccountReadOnlyAptos`: the read-only subset (no signing)

## Development

```bash
npm install
npm run lint
npm test
npm run build:types
```

## License

Apache-2.0. See [LICENSE](./LICENSE).
