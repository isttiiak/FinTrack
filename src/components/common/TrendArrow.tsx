import { TrendingUp, TrendingDown } from 'lucide-react'

interface TrendArrowProps {
  positive: boolean
  size?: number
}

// A direction glyph to sit beside a gain/loss figure, so "up" vs "down" never
// depends on telling emerald from coral apart. Decorative: the figure itself
// already carries a +/− sign for screen readers.
export default function TrendArrow({ positive, size = 16 }: TrendArrowProps) {
  const Icon = positive ? TrendingUp : TrendingDown
  return <Icon size={size} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6, flexShrink: 0 }} />
}
