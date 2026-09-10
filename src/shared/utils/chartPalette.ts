// Chart palette for EDA visualizations — professional, high-contrast, brutal-compatible
// Used for correlation diverging scale, histograms, boxplots, categorical bars

export type RGB = [number, number, number]

// Strong endpoints — match CSS vars
const BLUE_STRONG: RGB = [0, 85, 255]
const RED_STRONG: RGB = [220, 38, 38]
const WHITE: RGB = [255, 255, 255]

// Distinct categorical palette — rotated per column / histogram
export const CATEGORICAL_PALETTE: Array<{ fill: string; stroke: string; kde: string; solid: string }> = [
  { fill: 'rgba(0, 85, 255, 0.18)', stroke: 'rgb(0, 85, 255)', kde: 'rgb(0, 85, 255)', solid: 'rgb(0, 85, 255)' },
  { fill: 'rgba(16, 185, 129, 0.18)', stroke: 'rgb(16, 185, 129)', kde: 'rgb(16, 185, 129)', solid: 'rgb(16, 185, 129)' },
  { fill: 'rgba(147, 51, 234, 0.18)', stroke: 'rgb(147, 51, 234)', kde: 'rgb(147, 51, 234)', solid: 'rgb(147, 51, 234)' },
  { fill: 'rgba(249, 115, 22, 0.18)', stroke: 'rgb(249, 115, 22)', kde: 'rgb(249, 115, 22)', solid: 'rgb(249, 115, 22)' },
  { fill: 'rgba(236, 72, 153, 0.18)', stroke: 'rgb(236, 72, 153)', kde: 'rgb(236, 72, 153)', solid: 'rgb(236, 72, 153)' },
  { fill: 'rgba(6, 182, 212, 0.18)', stroke: 'rgb(6, 182, 212)', kde: 'rgb(6, 182, 212)', solid: 'rgb(6, 182, 212)' },
  { fill: 'rgba(234, 179, 8, 0.22)', stroke: 'rgb(180, 140, 0)', kde: 'rgb(180, 140, 0)', solid: 'rgb(234, 179, 8)' },
  { fill: 'rgba(100, 116, 139, 0.18)', stroke: 'rgb(100, 116, 139)', kde: 'rgb(100, 116, 139)', solid: 'rgb(100, 116, 139)' },
]

export function paletteForIndex(idx: number) {
  return CATEGORICAL_PALETTE[idx % CATEGORICAL_PALETTE.length]
}

// Correlation diverging color — solid interpolation from white (0) to blue (+1) / red (-1)
export function corrCellFill(val: number): string {
  const abs = Math.abs(val)
  if (abs < 0.02) return 'rgb(255,255,255)'
  // slight non-linear boost for visibility of weak correlations
  const t = Math.pow(abs, 0.92)
  const target: RGB = val >= 0 ? BLUE_STRONG : RED_STRONG
  const r = Math.round(WHITE[0] + (target[0] - WHITE[0]) * t)
  const g = Math.round(WHITE[1] + (target[1] - WHITE[1]) * t)
  const b = Math.round(WHITE[2] + (target[2] - WHITE[2]) * t)
  return `rgb(${r}, ${g}, ${b})`
}

// WCAG relative luminance helper
function luminance(r: number, g: number, b: number): number {
  const toLinear = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

export function corrTextColor(val: number): string {
  const abs = Math.abs(val)
  if (abs < 0.02) return 'rgb(0,0,0)'
  const t = Math.pow(abs, 0.92)
  const target: RGB = val >= 0 ? BLUE_STRONG : RED_STRONG
  const r = Math.round(WHITE[0] + (target[0] - WHITE[0]) * t)
  const g = Math.round(WHITE[1] + (target[1] - WHITE[1]) * t)
  const b = Math.round(WHITE[2] + (target[2] - WHITE[2]) * t)
  const lum = luminance(r, g, b)
  // dark backgrounds -> white text, light -> black. Threshold ~0.45
  return lum < 0.45 ? 'rgb(255,255,255)' : 'rgb(0,0,0)'
}

// Boxplot palette — alternating brutal tints with high-contrast median
export function boxplotPalette(idx: number) {
  const p = paletteForIndex(idx)
  return {
    boxFill: p.fill,
    boxStroke: p.stroke,
    medianStroke: 'rgb(15, 23, 42)', // slate-900 almost black
    whisker: 'rgb(15, 23, 42)',
  }
}
