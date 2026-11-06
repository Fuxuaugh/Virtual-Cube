import { describe, expect, it } from 'vitest'
import { f2lGroupFromName } from './f2l-group.js'

describe('f2lGroupFromName', () => {
  it('mengambil nama grup tanpa nomor urut', () => {
    expect(f2lGroupFromName('Basic Inserts 1')).toBe('Basic Inserts')
    expect(f2lGroupFromName('Basic Inserts 4')).toBe('Basic Inserts')
    expect(f2lGroupFromName('Case 1.1')).toBe('Case 1')
    expect(f2lGroupFromName('Case 1.6')).toBe('Case 1')
    expect(f2lGroupFromName('Case 2.4')).toBe('Case 2')
    expect(f2lGroupFromName('Case 3.4')).toBe('Case 3')
    expect(f2lGroupFromName('Incorrectly Connected 6')).toBe(
      'Incorrectly Connected'
    )
    expect(f2lGroupFromName('Corner in Place 3')).toBe('Corner in Place')
    expect(f2lGroupFromName('Edge in Place 6')).toBe('Edge in Place')
    expect(f2lGroupFromName('Both in Place 5')).toBe('Both in Place')
  })

  it('mengabaikan spasi di ujung', () => {
    expect(f2lGroupFromName('  Case 2.1 ')).toBe('Case 2')
  })

  it('melempar error bila tidak ada nomor urut', () => {
    expect(() => f2lGroupFromName('Basic Inserts')).toThrow(/Basic Inserts/)
  })
})
