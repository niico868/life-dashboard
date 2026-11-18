import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { Sketchy } from '../components/Sketchy'
import { KIND_META, areaOf } from '../onboarding/areas'
import {
  SCORE_DAYS, dayKey, discipline, isDone, isScheduled, loadHabits, setCount, streak,
  type Habit, type LogMap, type Standard,
} from '../habits/data'

const SECTIONS = [
  { id: 'morning', title: '🌅 Morning' },
  { id: 'anytime', title: '☀️ Any time' },
  { id: 'night', title: '🌙 Night routine' },
] as const

export function Habits() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [standards, setStandards] = useState<Standard[]>([])
  const [logs, setLogs] = useState<LogMap>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadHabits()
      .then((r) => { setHabits(r.habits); setStandards(r.standards); setLogs(r.logs) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const today = useMemo(() => new Date(), [])
  const todayKey = dayKey(today)
  const due = habits.filter((h) => isScheduled(h, today))
  const doneCount = due.filter((h) => isDone(logs, h, today)).length
  const overall = discipline(logs, habits, today)

  /** Tap: +1 until full, then a tap clears it (undo). Optimistic, rolls back on error. */
  async function tap(h: Habit) {
    const cur = logs.get(h.id)?.get(todayKey) ?? 0
    const nextCount = cur >= h.times_per_day ? 0 : cur + 1
    const write = (n: number) => setLogs((prev) => {
      const m = new Map(prev)
      const inner = new Map(m.get(h.id) ?? [])
      if (n) inner.set(todayKey, n); else inner.delete(todayKey)
      m.set(h.id, inner)
      return m
    })
    write(nextCount)
    if (nextCount >= h.times_per_day) navigator.vibrate?.(18)
    try { await setCount(h.id, todayKey, nextCount) } catch (e) { write(cur); setError((e as Error).message) }
  }

  if (loading) return <p className="hand text-2xl">Loading your day…</p>

  if (!habits.length) {
    return (
      <Sketchy fill="#fffaf0" className="p-5">
        <p className="hand text-2xl">No habits yet.</p>
        <p className="mt-1 text-ink-soft">Run onboarding to build them from your standards.</p>
        <Link to="/onboarding" className="hand mt-3 inline-block text-xl underline decoration-wavy">Start onboarding →</Link>
      </Sketchy>
    )
  }

  const allDone = due.length > 0 && doneCount === due.length

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold">Today</h1>
          <p className="text-ink-soft">{today.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</p>
        </div>
        <ScoreRing value={overall} />
      </header>

      <div>
        <div className="mb-1 flex justify-between text-sm font-bold text-ink-soft">
          <span>{doneCount} of {due.length} done</span>
          <span>{due.length ? Math.round((doneCount / due.length) * 100) : 0}%</span>
        </div>
        <div className="h-4 overflow-hidden rounded-[12px_40px_12px_40px] border-2 border-ink bg-white">
          <motion.div className="h-full bg-sage" initial={{ width: 0 }}
            animate={{ width: `${due.length ? (doneCount / due.length) * 100 : 0}%` }} transition={{ type: 'spring', damping: 18 }} />
        </div>
      </div>

      <AnimatePresence>
        {allDone && (
          <motion.div initial={{ scale: 0.6, rotate: -6, opacity: 0 }} animate={{ scale: 1, rotate: -1.5, opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ type: 'spring', damping: 12 }}>
            <Sketchy fill="#f2cc8f" roughness={2.2} className="p-4 text-center">
              <p className="hand text-2xl font-bold">Every box ticked. That's him. 🏆</p>
            </Sketchy>
          </motion.div>
        )}
      </AnimatePresence>

      {SECTIONS.map((sec) => {
        const items = due.filter((h) => h.routine === sec.id)
        if (!items.length) return null
        const secDone = items.filter((h) => isDone(logs, h, today)).length
        return (
          <section key={sec.id}>
            <h2 className="mb-2 flex items-baseline justify-between text-2xl font-bold">
              {sec.title}<span className="hand text-base font-normal text-ink-soft">{secDone}/{items.length}</span>
            </h2>
            <ul className="flex flex-col gap-2">
              {items.map((h) => (
                <HabitTick key={h.id} h={h} count={logs.get(h.id)?.get(todayKey) ?? 0} streakDays={streak(logs, h, today)} onTap={() => void tap(h)} />
              ))}
            </ul>
          </section>
        )
      })}

      {error && <p className="text-sm text-clay">Hmm: {error}</p>}

      <StandardScores standards={standards} habits={habits} logs={logs} />
    </div>
  )
}

/** Hand-drawn checkbox row. */
function HabitTick({ h, count, streakDays, onTap }: { h: Habit; count: number; streakDays: number; onTap: () => void }) {
  const done = count >= h.times_per_day
  return (
    <motion.li layout>
      <motion.button onClick={onTap} whileTap={{ scale: 0.97 }}
        className={`relative flex w-full items-center gap-3 rounded-[18px_6px_20px_8px/8px_20px_6px_18px] border-2 px-3 py-2.5 text-left transition-colors ${done ? 'border-sage bg-sage/20' : 'border-ink/25 bg-white/80'}`}>
        <span className="relative h-9 w-9 shrink-0">
          <svg viewBox="0 0 40 40" className="absolute inset-0">
            <path d="M20 3 C31 2 38 10 37 20 C38 31 30 38 20 37 C9 38 2 30 3 20 C2 10 10 3 20 3Z" fill={done ? '#81b29a' : '#fff'} stroke="#2b2a33" strokeWidth="2.2" />
            <AnimatePresence>
              {done && (
                <motion.path d="M11 21 L18 28 L30 12" fill="none" stroke="#2b2a33" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} exit={{ pathLength: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} />
              )}
            </AnimatePresence>
          </svg>
          <AnimatePresence>{done && <Burst key="b" />}</AnimatePresence>
        </span>

        <span className="min-w-0 flex-1">
          <span className={`block font-semibold leading-tight ${done ? 'text-ink-soft line-through decoration-2' : ''}`}>{h.name}</span>
          <span className="mt-0.5 flex items-center gap-2 text-xs text-ink-soft">
            {h.kind === 'chore' && <span className="rounded-full bg-sky/50 px-2 font-bold text-ink">chore · Lv {h.level}</span>}
            {h.times_per_day > 1 && (
              <span className="flex gap-1">
                {Array.from({ length: h.times_per_day }, (_, i) => (
                  <motion.span key={i} className="h-2.5 w-2.5 rounded-full border-2 border-ink"
                    animate={{ backgroundColor: i < count ? '#e07a5f' : '#ffffff', scale: i === count - 1 ? [1, 1.5, 1] : 1 }} />
                ))}
              </span>
            )}
          </span>
        </span>

        {streakDays > 0 && (
          <motion.span key={streakDays} initial={{ scale: 1.6 }} animate={{ scale: 1 }} className="hand shrink-0 text-lg" title={`${streakDays}-day streak`}>
            🔥{streakDays}
          </motion.span>
        )}
      </motion.button>
    </motion.li>
  )
}

/** Little confetti pop when a box gets ticked. */
function Burst() {
  const colors = ['#e07a5f', '#f2cc8f', '#81b29a', '#8fb8de']
  return (
    <span className="pointer-events-none absolute inset-0">
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <motion.span key={i} className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full" style={{ background: colors[i % 4] }}
            initial={{ x: 0, y: 0, opacity: 1 }} animate={{ x: Math.cos(a) * 26, y: Math.sin(a) * 26, opacity: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.55, ease: 'easeOut' }} />
        )
      })}
    </span>
  )
}

/** Overall discipline score as a wobbly ring that counts up. */
function ScoreRing({ value }: { value: number | null }) {
  const mv = useMotionValue(0)
  const shown = useTransform(mv, (v) => Math.round(v))
  const [num, setNum] = useState(0)
  useEffect(() => shown.on('change', setNum), [shown])
  useEffect(() => { const c = animate(mv, value ?? 0, { duration: 1.1, ease: 'easeOut' }); return c.stop }, [value, mv])
  const r = 30, c = 2 * Math.PI * r
  return (
    <div className="relative h-20 w-20 shrink-0" title={`Discipline score, last ${SCORE_DAYS} days`}>
      <svg viewBox="0 0 72 72" className="absolute inset-0 -rotate-90">
        <circle cx="36" cy="36" r={r} fill="#fffdf7" stroke="#2b2a33" strokeWidth="1.5" strokeDasharray="3 3" />
        <motion.circle cx="36" cy="36" r={r} fill="none" stroke="#e07a5f" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - (value ?? 0) / 100) }}
          transition={{ duration: 1.1, ease: 'easeOut' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="hand text-2xl font-bold">{value == null ? '–' : num}</span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">discipline</span>
      </div>
    </div>
  )
}

function StandardScores({ standards, habits, logs }: { standards: Standard[]; habits: Habit[]; logs: LogMap }) {
  const rows = standards
    .map((s) => ({ s, score: discipline(logs, habits.filter((h) => h.standard_id === s.id)) }))
    .filter((r) => r.score != null)
  if (!rows.length) return null
  return (
    <section>
      <h2 className="mb-1 text-2xl font-bold">Standards</h2>
      <p className="mb-3 text-sm text-ink-soft">Discipline over the last {SCORE_DAYS} days.</p>
      <ul className="flex flex-col gap-3">
        {rows.map(({ s, score }, i) => (
          <li key={s.id}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">{areaOf(s.area).emoji} <span className="hand text-base" style={{ color: KIND_META[s.kind].color === '#f2cc8f' ? '#c99a3b' : KIND_META[s.kind].color }}>{KIND_META[s.kind].mark}</span> {s.statement}</span>
              <span className="hand shrink-0 text-lg">{score}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-paper-2">
              <motion.div className="h-full rounded-full" style={{ background: KIND_META[s.kind].color }}
                initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.8, delay: 0.05 * i }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
