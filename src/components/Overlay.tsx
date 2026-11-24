import { useEffect, type ReactNode } from 'react'
import { motion } from 'framer-motion'

/**
 * Every pop-up uses this: tap outside the card, tap ✕, or press Esc to close.
 * `position` = 'bottom' slides up like a sheet; 'center' floats in the middle.
 */
export function Overlay({ onClose, children, position = 'bottom', z = 'z-40' }: {
  onClose: () => void; children: ReactNode; position?: 'bottom' | 'center'; z?: string
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div className={`fixed inset-0 ${z} flex justify-center bg-ink/35 px-3 ${position === 'bottom' ? 'items-end pb-6' : 'items-center'}`}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto"
        initial={{ y: position === 'bottom' ? 300 : 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: position === 'bottom' ? 300 : 20, opacity: 0 }}
        transition={{ type: 'spring', damping: 24 }} onClick={(e) => e.stopPropagation()}>
        <button aria-label="Close" onClick={onClose}
          className="hand absolute right-3 top-2 z-10 h-10 w-10 text-2xl leading-none text-ink-soft hover:text-ink">✕</button>
        {children}
      </motion.div>
    </motion.div>
  )
}
