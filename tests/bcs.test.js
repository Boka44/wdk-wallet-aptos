'use strict'

import { describe, it, expect } from '@jest/globals'

import Bcs from '../src/bcs.js'

function toHex (bcs) {
  return Array.from(bcs.toBytes(), (b) => b.toString(16).padStart(2, '0')).join('')
}

describe('Bcs.u64', () => {
  it('encodes values across the u64 range little-endian', () => {
    expect(toHex(new Bcs().u64(0n))).toBe('0000000000000000')
    expect(toHex(new Bcs().u64(1n))).toBe('0100000000000000')
    expect(toHex(new Bcs().u64(0xffffffffffffffffn))).toBe('ffffffffffffffff')
  })

  it('throws on values above the u64 maximum (no silent truncation)', () => {
    expect(() => new Bcs().u64(0xffffffffffffffffn + 1n)).toThrow('out of u64 range')
    expect(() => new Bcs().u64(2n ** 70n)).toThrow('out of u64 range')
  })

  it('throws on negative values (no wraparound)', () => {
    expect(() => new Bcs().u64(-1n)).toThrow('out of u64 range')
  })
})

describe('Bcs.u8', () => {
  it('encodes a single byte', () => {
    expect(toHex(new Bcs().u8(0))).toBe('00')
    expect(toHex(new Bcs().u8(255))).toBe('ff')
  })

  it('throws on out-of-range or non-integer values (no & 0xff truncation)', () => {
    for (const bad of [256, 257, -1, 1.5, NaN]) {
      expect(() => new Bcs().u8(bad)).toThrow('out of u8 range')
    }
  })
})

describe('Bcs.address', () => {
  it('left-pads short addresses to 32 bytes', () => {
    expect(toHex(new Bcs().address('0x1'))).toBe('00'.repeat(31) + '01')
  })

  it('throws on over-length addresses (no silent truncation)', () => {
    expect(() => new Bcs().address('0x' + 'a'.repeat(66))).toThrow('Invalid Aptos address')
  })

  it('throws on non-hex addresses (no NaN-to-zero corruption)', () => {
    expect(() => new Bcs().address('0xZZZ')).toThrow('Invalid Aptos address')
    expect(() => new Bcs().address('notanaddress')).toThrow('Invalid Aptos address')
  })

  it('throws on an empty address', () => {
    expect(() => new Bcs().address('')).toThrow('Invalid Aptos address')
    expect(() => new Bcs().address('0x')).toThrow('Invalid Aptos address')
  })
})

describe('Bcs.uleb128', () => {
  it('encodes single-byte and multi-byte values', () => {
    expect(toHex(new Bcs().uleb128(0))).toBe('00')
    expect(toHex(new Bcs().uleb128(127))).toBe('7f')
    expect(toHex(new Bcs().uleb128(128))).toBe('8001')
    expect(toHex(new Bcs().uleb128(16384))).toBe('808001')
  })
})
