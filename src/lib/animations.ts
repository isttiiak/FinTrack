import type { Variants } from 'framer-motion'

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1,    transition: { duration: 0.15 } },
  exit:    { opacity: 0, scale: 0.95, transition: { duration: 0.1 } },
}

export const slideFromBottom: Variants = {
  initial: { opacity: 0, y: 24 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 400, damping: 30 },
  },
  exit: { opacity: 0, y: 24, transition: { duration: 0.15 } },
}

export const slideOutLeft: Variants = {
  initial: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -80, transition: { duration: 0.3 } },
}

export const staggerContainer: Variants = {
  animate: { transition: { staggerChildren: 0.05 } },
}

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
}

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' } },
}

export const rubberStamp: Variants = {
  initial: { opacity: 0, scale: 1.4, rotate: -15 },
  animate: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { type: 'spring', stiffness: 500, damping: 20 },
  },
}

export const shake: Variants = {
  animate: {
    x: [0, -6, 6, -6, 6, -4, 4, 0],
    transition: { duration: 0.5 },
  },
}

export const hoverScale = {
  whileHover: { scale: 1.02, transition: { duration: 0.15 } },
  whileTap:   { scale: 0.97 },
}

// Scroll-reveal for long pages (e.g. Analytics) — animates in once as it enters view.
export const revealOnScroll = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5, ease: 'easeOut' },
}

export const modalIn: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 30 } },
  exit:    { opacity: 0, scale: 0.96, transition: { duration: 0.15 } },
}
