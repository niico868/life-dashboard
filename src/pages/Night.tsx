import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useNight } from '../night/NightProvider'
import { reminderAt } from '../night/settings'
import { askNotificationPermission } from '../work/notify'
import { disablePush, enablePush, isPushOn, pushAvailable } from '../night/push'

const STARS = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 47) % 100, top: (i * 29) % 60, size: 2 + (i % 3), delay: (i % 7) * 0.4,
}))

/** The evening checker: dark, calm, and stubborn until every step is ticked. */
export function Night() {
  const { steps, done, nagging, loaded, toggle, settings, updateSettings } = useNight()
  const [showSettings, setShowSettings] = useState(false)
  const [push, setPush] = useState(false)
  const [pushMsg, setPushMsg] = useState('')
  useEffect(() => { isPushOn().then(setPush).catch(() => {}) }, [])
  const togglePush = async (on: boolean) => {
    setPushMsg('')
    try { if (on) await enablePush(); else await disablePush(); setPush(on) } catch (e) { setPushMsg((e as Error).message) }
  }
  const left = steps.filter((s) => !done.has(s.id)).length
  const allDone = steps.length > 0 && left === 0
  const at = reminderAt(settings)

  return (
    <div className="relative -mx-4 -mt-6 min-h-[85dvh] overflow-hidden rounded-b-[40px] bg-[#2a2d43] px-5 pb-10 pt-8 text-[#f6efe1]">
      {/* twinkling sky */}
      {STARS.map((s, i) => (
        <motion.span key={i} className="absolute rounded-full bg-[#f6efe1]"
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size }}
          animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 2.5, repeat: Infinity, delay: s.delay }} />
      ))}
      <motion.div className="absolute right-6 top-6 text-5xl" animate={{ rotate: [-6, 6, -6] }} transition={{ duration: 6, repeat: Infinity }}>
        {allDone ? '🌕' : '🌙'}
      </motion.div>

      <div className="relative">
        <h1 className="text-4xl font-bold">Night routine</h1>
        <AnimatePresence mode="wait">
          <motion.p key={allDone ? 'done' : left} className="hand mt-1 text-xl text-honey"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {!loaded ? '…' : steps.length === 0 ? 'No routine set up yet.'
              : allDone ? 'All done. Goodnight, you earned it. 😴'
              : nagging ? `${left} left. No sleep until it's done. 😤`
              : `${left} to go before bed.`}
          </motion.p>
        </AnimatePresence>

        {steps.length === 0 && loaded && (
          <Link to="/onboarding" className="hand mt-4 inline-block text-lg underline decoration-wavy">Build your night routine →</Link>
        )}

        <ol className="mt-6 flex flex-col gap-3">
          {steps.map((s, i) => {
            const isDone = done.has(s.id)
            return (
              <motion.li key={s.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <motion.button onClick={() => void toggle(s)} whileTap={{ scale: 0.97 }}
                  animate={nagging && !isDone ? { x: [0, -3, 3, -2, 0] } : { x: 0 }}
                  transition={nagging && !isDone ? { duration: 0.5, repeat: Infinity, repeatDelay: 3 + i * 0.3 } : {}}
                  className={`flex w-full items-center gap-4 rounded-[18px_6px_20px_8px/8px_20px_6px_18px] border-2 px-4 py-3 text-left text-lg transition-colors ${isDone ? 'border-sage/70 bg-sage/20 text-[#f6efe1]/60' : 'border-[#f6efe1]/40 bg-white/5'}`}>
                  <span className="relative h-8 w-8 shrink-0">
                    <svg viewBox="0 0 40 40" className="absolute inset-0">
                      <path d="M20 3 C31 2 38 10 37 20 C38 31 30 38 20 37 C9 38 2 30 3 20 C2 10 10 3 20 3Z" fill={isDone ? '#81b29a' : 'transparent'} stroke="#f6efe1" strokeWidth="2.2" />
                      {isDone && <motion.path d="M11 21 L18 28 L30 12" fill="none" stroke="#2a2d43" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round"
                        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }} />}
                    </svg>
                  </span>
                  <span className={isDone ? 'line-through decoration-2' : ''}>{s.name}</span>
                </motion.button>
              </motion.li>
            )
          })}
        </ol>

        {steps.length > 0 && (
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full rounded-full bg-honey" animate={{ width: `${((steps.length - left) / steps.length) * 100}%` }} transition={{ type: 'spring', damping: 18 }} />
          </div>
        )}

        <button className="mt-8 text-sm text-[#f6efe1]/70 underline" onClick={() => setShowSettings((v) => !v)}>
          ⏰ {settings.night_reminder_on ? `Reminder at ${at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}, every ${settings.night_nag_minutes} min until done` : 'Reminder off'}
        </button>

        <AnimatePresence>
          {showSettings && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="relative mt-3 flex flex-col gap-3 rounded-2xl border-2 border-dashed border-[#f6efe1]/30 p-4 pt-8">
                <button aria-label="Close" className="absolute right-3 top-1 text-xl text-[#f6efe1]/70" onClick={() => setShowSettings(false)}>✕</button>
                <label className="flex items-center justify-between gap-3">
                  <span>Remind me</span>
                  <input type="checkbox" className="h-5 w-5 accent-[#f2cc8f]" checked={settings.night_reminder_on}
                    onChange={(e) => { void askNotificationPermission(); void updateSettings({ ...settings, night_reminder_on: e.target.checked }) }} />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>Start at</span>
                  <input type="time" className="rounded-lg bg-white/10 px-2 py-1 text-[#f6efe1]" value={settings.night_reminder_time}
                    onChange={(e) => e.target.value && void updateSettings({ ...settings, night_reminder_time: e.target.value })} />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>Nag every</span>
                  <select className="rounded-lg bg-white/10 px-2 py-1 text-[#f6efe1]" value={settings.night_nag_minutes}
                    onChange={(e) => void updateSettings({ ...settings, night_nag_minutes: Number(e.target.value) })}>
                    {[5, 10, 15, 30, 60].map((m) => <option key={m} value={m} className="text-ink">{m} min</option>)}
                  </select>
                </label>
                {pushAvailable() && (
                  <label className="flex items-center justify-between gap-3">
                    <span>Push to this device <span className="block text-xs text-[#f6efe1]/60">works even when the app is closed</span></span>
                    <input type="checkbox" className="h-5 w-5 accent-[#f2cc8f]" checked={push} onChange={(e) => void togglePush(e.target.checked)} />
                  </label>
                )}
                {pushMsg && <p className="text-xs text-clay">{pushMsg}</p>}
                <p className="text-xs text-[#f6efe1]/60">In-app reminders fire while the app is open. Turn on push for each device you want nagged when it's closed. A rooster alarm is coming later.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
