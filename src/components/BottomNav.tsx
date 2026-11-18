import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'

const tabs = [
  { to: '/', label: 'Home', icon: 'M4 11l8-7 8 7v9H4z' },
  { to: '/habits', label: 'Habits', icon: 'M5 12l4 4 10-10' },
  { to: '/work', label: 'Work', icon: 'M12 7v5l3 2M12 3a9 9 0 110 18 9 9 0 010-18z' },
  { to: '/calendar', label: 'Plan', icon: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4' },
  { to: '/report', label: 'Report', icon: 'M5 20V10M12 20V4M19 20v-7' },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-dashed border-ink/30 bg-paper/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md justify-around">
        {tabs.map((t) => (
          <li key={t.to}>
            <NavLink to={t.to} end={t.to === '/'} className="relative flex flex-col items-center px-3 py-2">
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span layoutId="nav-blob" className="absolute inset-1 -z-10 rounded-[40%_60%_55%_45%] bg-honey" />
                  )}
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d={t.icon} />
                  </svg>
                  <span className="hand text-sm">{t.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
