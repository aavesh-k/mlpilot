import { describe, it, expect } from 'vitest'
import { formatFileSize, formatPercentage } from './format'

describe('formatFileSize', () => {
  it('should format bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(1024)).toBe('1.0 KB')
    expect(formatFileSize(1048576)).toBe('1.0 MB')
    expect(formatFileSize(1073741824)).toBe('1.0 GB')
  })
})

describe('formatPercentage', () => {
  it('should format as percentage string', () => {
    expect(formatPercentage(0.5)).toBe('50.0%')
    expect(formatPercentage(0.1234)).toBe('12.3%')
    expect(formatPercentage(1)).toBe('100.0%')
  })
})
