// Persisted screen position of the floating calculator panel, so it reopens
// wherever the user last dragged it to. Follows the same localStorage helper
// shape as paymentMethodPrefs.ts.
const LS_CALC_POSITION = 'fintrack_calc_position'

export interface CalcPosition {
  x: number
  y: number
}

export function getCalculatorPosition(): CalcPosition | null {
  try {
    const raw = localStorage.getItem(LS_CALC_POSITION)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') return parsed
    return null
  } catch {
    return null
  }
}

export function setCalculatorPosition(pos: CalcPosition) {
  localStorage.setItem(LS_CALC_POSITION, JSON.stringify(pos))
}
