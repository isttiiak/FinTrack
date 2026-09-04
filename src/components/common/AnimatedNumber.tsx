import { useEffect, useRef } from 'react'
import { useMotionValue, useSpring, useTransform, motion } from 'framer-motion'
import { formatCurrency } from '@/lib/utils'

interface AnimatedNumberProps {
  value: number
  currency?: string
  className?: string
  duration?: number
}

// `currency` intentionally has no default here — omitting it (as every call
// site does) lets it fall through to formatCurrency's own default, the
// signed-in user's actual currency. This component previously hardcoded its
// own 'BDT'-only formatting independent of formatCurrency entirely, so every
// KPI using it stayed pinned to ৳ regardless of the Profile currency
// setting. See TODO.md §3.13.
export default function AnimatedNumber({ value, currency, className, duration = 0.6 }: AnimatedNumberProps) {
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { duration: duration * 1000, bounce: 0 })
  const display = useTransform(spring, (v) => formatCurrency(Math.round(v), currency))
  const prevRef = useRef(0)

  useEffect(() => {
    motionValue.set(prevRef.current)
    spring.set(prevRef.current)
    motionValue.set(value)
    prevRef.current = value
  }, [value, motionValue, spring])

  return <motion.span className={className}>{display}</motion.span>
}
