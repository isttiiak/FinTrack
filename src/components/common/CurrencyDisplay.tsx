import { formatCurrency } from '@/lib/utils'

interface CurrencyDisplayProps {
  amount: number
  currency?: string
  className?: string
  colored?: boolean
  type?: 'expense' | 'income' | 'lent' | 'debt' | 'neutral'
}

export default function CurrencyDisplay({
  amount,
  currency = 'BDT',
  className,
  colored = false,
  type = 'neutral',
}: CurrencyDisplayProps) {
  const colorMap = {
    expense: 'var(--accent-coral)',
    debt:    'var(--accent-coral)',
    income:  'var(--accent-teal)',
    lent:    'var(--accent-teal)',
    neutral: 'inherit',
  }

  return (
    <span
      className={className}
      style={colored ? { color: colorMap[type] } : undefined}
    >
      {formatCurrency(amount, currency)}
    </span>
  )
}
