import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sketchy } from '../components/Sketchy'
import { SketchButton } from '../components/SketchButton'
import { LEVEL_UP_STREAK, levelUp, snoozeLevelUp, suggestNextLevel, type LevelHabit } from './levelling'

/** "You've nailed this. Ready for a bigger one?" */
export function LevelUpCard({ h, streakDays, onDone }: { h: LevelHabit; streakDays: number; onDone: () => void }) {
  const [name, setName] = useState(() => suggestNextLevel(h))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr('')
    try { await fn(); onDone() } catch (e) { setErr((e as Error).message); setBusy(false) }
  }

  return (
    <motion.div initial={{ y: -20, opacity: 0, rotate: 2 }} animate={{ y: 0, opacity: 1, rotate: -1 }} exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', damping: 14 }}>
      <Sketchy fill="#f2cc8f" roughness={2} seed={77} className="p-4">
        <div className="flex items-start gap-3">
          <motion.span className="text-4xl" animate={{ y: [0, -6, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>🆙</motion.span>
          <div className="min-w-0 flex-1">
            <p className="hand text-xl font-bold leading-tight">Level {h.level + 1} unlocked</p>
            <p className="text-sm">
              <b>{h.name}</b>: {streakDays} days straight (needed {LEVEL_UP_STREAK}). Ready for a bigger chore?
            </p>
          </div>
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)}
          className="mt-3 w-full rounded-xl border-2 border-ink/60 bg-white px-3 py-2 outline-none focus:border-clay" />
        <div className="mt-3 flex items-center justify-between">
          <button disabled={busy} className="hand text-lg underline decoration-wavy" onClick={() => run(() => snoozeLevelUp(h))}>not yet</button>
          <SketchButton fill="#81b29a" disabled={busy} onClick={() => run(() => levelUp(h, name))}>{busy ? '…' : 'Level up →'}</SketchButton>
        </div>
        {err && <p className="mt-1 text-sm text-clay">{err}</p>}
      </Sketchy>
    </motion.div>
  )
}
