import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useNight } from './NightProvider'

/** A scrolling ticker across the top of every screen while the night routine is overdue. */
export function NightBanner() {
  const { nagging, steps, done } = useNight()
  const { pathname } = useLocation()
  const left = steps.filter((s) => !done.has(s.id)).length
  const text = `🌙 Night routine: ${left} left · no sleep until it's done · tap to finish ·`
  return (
    <AnimatePresence>
      {nagging && pathname !== '/night' && (
        <motion.div initial={{ y: -40 }} animate={{ y: 0 }} exit={{ y: -40 }} className="sticky top-0 z-30 overflow-hidden bg-[#2a2d43] text-[#f6efe1]">
          <Link to="/night" className="block py-1.5">
            <motion.div className="hand flex whitespace-nowrap text-base" animate={{ x: ['0%', '-50%'] }} transition={{ duration: 14, ease: 'linear', repeat: Infinity }}>
              <span className="px-4">{text} {text}</span><span className="px-4">{text} {text}</span>
            </motion.div>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
