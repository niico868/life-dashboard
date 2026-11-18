import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Sketchy } from './Sketchy'

type Props = {
  children: ReactNode
  onClick?: () => void
  fill?: string
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
}

export function SketchButton({ children, onClick, fill = '#f2cc8f', disabled, type = 'button', className = '' }: Props) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.94, rotate: -1 }}
      whileHover={{ y: -2 }}
      className={`hand text-lg disabled:opacity-50 ${className}`}
    >
      <Sketchy fill={fill} seed={type === 'submit' ? 3 : 11} className="px-5 py-2.5">
        {children}
      </Sketchy>
    </motion.button>
  )
}
