import { useEffect, useRef } from 'react'
import { useMotionValue, useSpring, useTransform, motion } from 'framer-motion'

interface AnimatedNumberProps {
  value: number
  currency?: string
  className?: string
  duration?: number
}

export default function AnimatedNumber({ value, currency = 'BDT', className, duration = 0.6 }: AnimatedNumberProps) {
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { duration: duration * 1000, bounce: 0 })
  const display = useTransform(spring, (v) => {
    const formatted = v.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    return currency === 'BDT' ? `৳${formatted}` : formatted
  })
  const prevRef = useRef(0)

  useEffect(() => {
    motionValue.set(prevRef.current)
    spring.set(prevRef.current)
    motionValue.set(value)
    prevRef.current = value
  }, [value, motionValue, spring])

  return <motion.span className={className}>{display}</motion.span>
}
