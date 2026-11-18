import { motion } from 'framer-motion'

const STAR = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z'

/** Hand-drawn stars. Pass onChange to make them tappable. */
export function Stars({ value, onChange, size = 28 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <span className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)}
          whileTap={{ scale: 1.4, rotate: 15 }} aria-label={`${n} star${n > 1 ? 's' : ''}`} className="disabled:cursor-default">
          <svg viewBox="0 0 24 24" width={size} height={size}>
            <motion.path d={STAR} stroke="#2b2a33" strokeWidth="1.6" strokeLinejoin="round"
              animate={{ fill: n <= value ? '#f2cc8f' : '#ffffff' }} transition={{ delay: n * 0.04 }} />
          </svg>
        </motion.button>
      ))}
    </span>
  )
}
