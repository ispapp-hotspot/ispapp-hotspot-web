import { describe, it, expect } from 'vitest'
import { formatUptime, usagePct } from '../device-utils'

describe('formatUptime', () => {
  it('returns — for undefined', () => {
    expect(formatUptime(undefined)).toBe('—')
  })

  it('returns — for zero', () => {
    expect(formatUptime(0)).toBe('—')
  })

  it('returns — for negative', () => {
    expect(formatUptime(-10)).toBe('—')
  })

  it('returns <1m for less than a minute', () => {
    expect(formatUptime(45)).toBe('<1m')
  })

  it('returns minutes only', () => {
    expect(formatUptime(120)).toBe('2m')
  })

  it('returns hours and minutes', () => {
    expect(formatUptime(3723)).toBe('1h 2m')
  })

  it('returns days hours minutes', () => {
    expect(formatUptime(93784)).toBe('1d 2h 3m')
  })

  it('omits zero components', () => {
    expect(formatUptime(86400)).toBe('1d')       // exactly 1 day
    expect(formatUptime(3600)).toBe('1h')         // exactly 1 hour
  })

  it('handles large uptime', () => {
    const seconds = 7 * 86400 + 23 * 3600 + 59 * 60
    expect(formatUptime(seconds)).toBe('7d 23h 59m')
  })
})

describe('usagePct', () => {
  it('returns 0 when total is zero', () => {
    expect(usagePct(100, 0)).toBe(0)
  })

  it('returns correct percentage', () => {
    expect(usagePct(512, 1024)).toBe(50)
  })

  it('rounds to integer', () => {
    expect(usagePct(1, 3)).toBe(33)
  })

  it('clamps to 100 when used > total', () => {
    expect(usagePct(1200, 1000)).toBe(100)
  })

  it('returns 0 for zero used', () => {
    expect(usagePct(0, 1024)).toBe(0)
  })

  it('returns 100 for full usage', () => {
    expect(usagePct(1024, 1024)).toBe(100)
  })
})
