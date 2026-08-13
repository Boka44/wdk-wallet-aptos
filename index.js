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

/** @typedef {import('@tetherto/wdk-wallet').FeeRates} FeeRates */
/** @typedef {import('@tetherto/wdk-wallet').KeyPair} KeyPair */
/** @typedef {import('@tetherto/wdk-wallet').TransactionResult} TransactionResult */
/** @typedef {import('@tetherto/wdk-wallet').TransferOptions} TransferOptions */
/** @typedef {import('@tetherto/wdk-wallet').TransferResult} TransferResult */
/** @typedef {import('@tetherto/wdk-wallet').Finality} Finality */
/** @typedef {import('@tetherto/wdk-wallet').TransactionReceipt} TransactionReceipt */
/** @typedef {import('@tetherto/wdk-wallet').WaitForTransactionTarget} WaitForTransactionTarget */
/** @typedef {import('@tetherto/wdk-wallet').WaitForTransactionOptions} WaitForTransactionOptions */

/** @typedef {import('./src/wallet-account-read-only-aptos.js').AptosTransaction} AptosTransaction */
/** @typedef {import('./src/wallet-account-read-only-aptos.js').AptosWalletConfig} AptosWalletConfig */
/** @typedef {import('./src/wallet-account-read-only-aptos.js').AptosTransactionInfo} AptosTransactionInfo */

export { default } from './src/wallet-manager-aptos.js'

export { default as WalletAccountReadOnlyAptos } from './src/wallet-account-read-only-aptos.js'

export { default as WalletAccountAptos } from './src/wallet-account-aptos.js'
