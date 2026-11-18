import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { Sketchy } from '../components/Sketchy'
import { HimCard } from '../onboarding/HimCard'
import { loadDraft } from '../onboarding/data'
import type { Draft } from '../onboarding/types'
import { addDays, dayKey, discipline, isDone, isScheduled, loadHabits, setCount, streak, type Habit, type LogMap } from '../habits/data'
import { HABITS_CHANGED, announceHabitsChanged, useNight } from '../night/NightProvider'
import { nightDate, reminderAt } from '../night/settings'
import { useWork } from '../work/WorkProvider'
import { useWorkToday } from '../work/useWorkToday'
import { KINDS, dueAt, loadEvents, type EventWithPrep } from '../calendar/data'
import { fmtClock, fmtDuration, fmtTime } from '../lib/time'

/** Ticks every `ms` so countdowns and greetings stay live. */
function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const id = setInterval(() => setNow(new Date()), ms); return () => clearInterval(id) }, [ms])
  return now
}

function greeting(h: number) {
  if (h < 5) return 'Up late, Nico 🌙'
  if (h < 12) return 'Morning, Nico ☀️'
  if (h < 17) return 'Afternoon, Nico 👋'
  return 'Evening, Nico 🌆'
}

export function Home() {
  const now = useNow()
  const [draft, setDraft] = useState<Draft | null | undefined>(undefined)
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<LogMap>(new Map())
  const [events, setEvents] = useState<EventWithPrep[]>([])
  const [showHim, setShowHim] = useState(false)
  const work = useWork()
  const workToday = useWorkToday()
  const night = useNight()

  const loadAll = useCallback(async () => {
    const [d, h, ev] = await Promise.all([
      loadDraft().catch(() => null),
      loadHabits().catch(() => null),
      loadEvents(addDays(new Date(), -1), addDays(new Date(), 14)).catch(() => []),
    ])
    setDraft(d?.vision.id ? d : null)
    if (h) { setHabits(h.habits); setLogs(h.logs) }
    setEvents(ev)
  }, [])
  useEffect(() => { void loadAll() }, [loadAll])
  useEffect(() => { window.addEventListener(HABITS_CHANGED, loadAll); return () => window.removeEventListener(HABITS_CHANGED, loadAll) }, [loadAll])

  // --- derived numbers ---
  const dateFor = useCallback((h: Habit) => (h.routine === 'night' ? nightDate(now) : now), [now])
  const dayHabits = habits.filter((h) => h.kind !== 'routine_step' && isScheduled(h, dateFor(h)))
  const habitsDone = dayHabits.filter((h) => isDone(logs, h, dateFor(h))).length
  const score = discipline(logs, habits, now)
  const nextUp = dayHabits.filter((h) => !isDone(logs, h, dateFor(h)) && h.routine !== 'night').slice(0, 3)
  const nextEvent = events.find((e) => new Date(e.ends_at) > now)
  const nightLeft = night.steps.filter((s) => !night.done.has(s.id)).length
  const bestStreak = useMemo(() => {
    let best: { h: Habit; n: number } | null = null
    for (const h of habits) { const n = streak(logs, h, dateFor(h)); if (n >= 3 && (!best || n > best.n)) best = { h, n } }
    return best
  }, [habits, logs, dateFor])

  // --- the alert ticker ---
  const alerts = useMemo(() => {
    const a: string[] = []
    const t = now.getTime()
    for (const e of events) {
      if (new Date(e.starts_at).getTime() < t) continue
      for (const p of e.prep) {
        if (p.done) continue
        const due = dueAt(e, p).getTime()
        if (due < t) a.push(`⚠️ Overdue: ${p.label} (${e.title})`)
        else if (due < t + 6 * 3600_000) a.push(`🧳 ${p.label} by ${fmtTime(new Date(due).toISOString())}`)
      }
    }
    if (night.nagging) a.push(`🌙 Night routine: ${nightLeft} left, no sleep yet`)
    else if (night.steps.length && nightLeft) a.push(`🌙 Night routine starts ${fmtTime(reminderAt(night.settings, now).toISOString())}`)
    if (dayHabits.length - habitsDone > 0) a.push(`✅ ${dayHabits.length - habitsDone} habits left today`)
    else if (dayHabits.length) a.push('🏆 Every habit ticked today')
    if (work.session?.status === 'running') a.push(`⏱ Working on ${work.session.title ?? 'something'}: ${fmtClock(work.elapsed)}`)
    if (bestStreak) a.push(`🔥 ${bestStreak.n} days straight: ${bestStreak.h.name}`)
    if (nextEvent) a.push(`📅 Next: ${nextEvent.title} ${relTime(new Date(nextEvent.starts_at), now)}`)
    return a
  }, [events, night, nightLeft, dayHabits.length, habitsDone, work.session, work.elapsed, bestStreak, nextEvent, now])

  async function quickTick(h: Habit) {
    const key = dayKey(dateFor(h))
    const cur = logs.get(h.id)?.get(key) ?? 0
    const next = Math.min(cur + 1, h.times_per_day)
    setLogs((prev) => { const m = new Map(prev); const inner = new Map(m.get(h.id) ?? []); inner.set(key, next); m.set(h.id, inner); return m })
    navigator.vibrate?.(15)
    await setCount(h.id, key, next).catch(() => {})
    announceHabitsChanged()
  }

  if (draft === undefined) return <p className="hand text-2xl">…</p>

  if (draft === null) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-4xl font-bold">{greeting(now.getHours())}</h1>
        <motion.div initial={{ rotate: -2, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}>
          <Sketchy fill="#fffaf0" roughness={2} className="p-5">
            <p className="hand text-2xl">First things first.</p>
            <p className="mt-1 text-ink-soft">Let's sketch out the man you're becoming. Everything else in here is built from it.</p>
            <Link to="/onboarding" className="hand mt-4 inline-block rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-ink bg-honey px-5 py-2 text-xl">
              Start onboarding →
            </Link>
          </Sketchy>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-4xl font-bold">{greeting(now.getHours())}</h1>
        <p className="text-ink-soft">{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </header>

      <Ticker items={alerts} />

      <div className="grid grid-cols-2 gap-3">
        <Tile to="/habits" fill="#81b29a33" seed={3} delay={0}>
          <TileLabel>Habits today</TileLabel>
          <div className="flex items-center gap-3">
            <Ring value={dayHabits.length ? habitsDone / dayHabits.length : 0} color="#81b29a" />
            <span className="hand text-3xl font-bold">{habitsDone}<span className="text-lg text-ink-soft">/{dayHabits.length}</span></span>
          </div>
        </Tile>

        <Tile to="/habits" fill="#e07a5f22" seed={4} delay={0.05}>
          <TileLabel>Discipline</TileLabel>
          {score == null ? <span className="hand text-4xl font-bold">–</span> : <CountUp value={score} className="hand text-4xl font-bold" />}
          <Bar value={(score ?? 0) / 100} color="#e07a5f" />
        </Tile>

        <Tile to="/work" fill="#8fb8de33" seed={5} delay={0.1}>
          <TileLabel>Work today {work.session?.status === 'running' && <span className="ml-1 inline-block h-2 w-2 animate-ping rounded-full bg-clay" />}</TileLabel>
          <p className="hand text-3xl font-bold tabular-nums">{fmtDuration(workToday)}</p>
          <p className="text-xs text-ink-soft">{work.session ? (work.session.status === 'running' ? `running · ${fmtClock(work.elapsed)}` : 'paused') : 'tap to start'}</p>
        </Tile>

        <Tile to="/night" fill={night.nagging ? '#2a2d43' : '#f2cc8f33'} seed={6} delay={0.15} dark={night.nagging}>
          <TileLabel dark={night.nagging}>Night routine</TileLabel>
          <p className="hand text-3xl font-bold">
            {night.steps.length === 0 ? '–' : nightLeft === 0 ? '🌕 done' : `${night.steps.length - nightLeft}/${night.steps.length}`}
          </p>
          <p className={`text-xs ${night.nagging ? 'text-honey' : 'text-ink-soft'}`}>
            {night.nagging ? `${nightLeft} left, no sleep yet` : night.steps.length ? `from ${fmtTime(reminderAt(night.settings, now).toISOString())}` : 'set it up'}
          </p>
        </Tile>
      </div>

      {nextEvent ? <NextEvent e={nextEvent} now={now} /> : (
        <Link to="/calendar" className="text-ink-soft underline decoration-wavy">No appointments coming up. Plan something →</Link>
      )}

      {nextUp.length > 0 && (
        <section>
          <h2 className="mb-2 text-2xl font-bold">Up next</h2>
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {nextUp.map((h) => (
                <motion.li key={h.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 80, rotate: 4 }}>
                  <button onClick={() => void quickTick(h)}
                    className="flex w-full items-center gap-3 rounded-[18px_6px_20px_8px/8px_20px_6px_18px] border-2 border-ink/25 bg-white/80 px-3 py-2 text-left">
                    <span className="h-7 w-7 shrink-0 rounded-full border-2 border-ink bg-white" />
                    <span className="flex-1 font-semibold">{h.name}</span>
                    {h.times_per_day > 1 && <span className="hand text-ink-soft">{logs.get(h.id)?.get(dayKey(dateFor(h))) ?? 0}/{h.times_per_day}</span>}
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      )}

      <section>
        <button className="hand text-xl underline decoration-wavy" onClick={() => setShowHim((v) => !v)}>
          {showHim ? 'hide him ▴' : 'remember who you’re becoming ▾'}
        </button>
        <AnimatePresence>
          {showHim && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="pt-3"><HimCard draft={draft} /></div>
              <Link to="/onboarding" className="mt-2 block text-center text-sm underline">redo / edit him</Link>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  )
}

function relTime(d: Date, now: Date) {
  const mins = Math.round((d.getTime() - now.getTime()) / 60_000)
  if (mins <= 0) return 'now'
  if (mins < 60) return `in ${mins} min`
  if (mins < 24 * 60) return `in ${Math.floor(mins / 60)}h ${mins % 60}m`
  const days = Math.round(mins / (24 * 60))
  return days === 1 ? 'tomorrow' : `in ${days} days`
}

/** Scrolling strip of alerts and reminders. Pauses on hover; static if reduced motion is on. */
function Ticker({ items }: { items: string[] }) {
  const reduce = useReducedMotion()
  if (!items.length) return null
  if (reduce) return <ul className="hand rounded-xl bg-honey/40 px-3 py-2 text-lg">{items.map((i) => <li key={i}>{i}</li>)}</ul>
  const line = items.join('   ·   ')
  const duration = Math.max(14, line.length * 0.18)
  return (
    <div className="ticker -mx-4 overflow-hidden border-y-2 border-dashed border-ink/30 bg-honey/40 py-1.5">
      <motion.div className="hand flex w-max whitespace-nowrap text-lg" animate={{ x: ['0%', '-50%'] }}
        transition={{ duration, ease: 'linear', repeat: Infinity }}>
        <span className="px-6">{line}</span><span className="px-6">{line}</span>
      </motion.div>
    </div>
  )
}

function Tile({ to, fill, seed, delay, dark, children }: { to: string; fill: string; seed: number; delay: number; dark?: boolean; children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14, rotate: seed % 2 ? 1 : -1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay, type: 'spring', damping: 16 }}
      whileTap={{ scale: 0.96 }}>
      <Link to={to}>
        <Sketchy fill={fill} seed={seed} stroke={dark ? '#f6efe1' : '#2b2a33'} className={`h-full min-h-[118px] p-3 ${dark ? 'text-[#f6efe1]' : ''}`}>
          <div className="flex flex-col gap-1">{children}</div>
        </Sketchy>
      </Link>
    </motion.div>
  )
}

const TileLabel = ({ children, dark }: { children: ReactNode; dark?: boolean }) =>
  <p className={`text-[11px] font-bold uppercase tracking-wider ${dark ? 'text-[#f6efe1]/70' : 'text-ink-soft'}`}>{children}</p>

function Ring({ value, color }: { value: number; color: string }) {
  const r = 16, c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 40 40" className="h-12 w-12 -rotate-90">
      <circle cx="20" cy="20" r={r} fill="#fff" stroke="#2b2a33" strokeWidth="1.2" strokeDasharray="2 2" />
      <motion.circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={c}
        initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - value) }} transition={{ duration: 1, ease: 'easeOut' }} />
    </svg>
  )
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="mt-1 h-2.5 overflow-hidden rounded-full border border-ink/30 bg-white">
      <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${value * 100}%` }} transition={{ duration: 1.1, ease: 'easeOut' }} />
    </div>
  )
}

function CountUp({ value, className }: { value: number; className?: string }) {
  const mv = useMotionValue(0)
  const [n, setN] = useState(0)
  useEffect(() => { const c = animate(mv, value, { duration: 1.1, ease: 'easeOut', onUpdate: (v) => setN(Math.round(v)) }); return c.stop }, [value, mv])
  return <span className={className}>{n}</span>
}

function NextEvent({ e, now }: { e: EventWithPrep; now: Date }) {
  const done = e.prep.filter((p) => p.done).length
  const nextPrep = e.prep.filter((p) => !p.done).sort((a, b) => dueAt(e, a).getTime() - dueAt(e, b).getTime())[0]
  const started = new Date(e.starts_at) <= now
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Link to="/calendar">
        <Sketchy fill="#fffdf7" seed={14} className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{started ? 'Happening now' : 'Next up'} · {KINDS[e.kind].emoji} {KINDS[e.kind].label}</p>
              <p className="hand text-2xl font-bold leading-tight">{e.title}</p>
              <p className="text-sm text-ink-soft">
                {new Date(e.starts_at).toLocaleDateString([], { weekday: 'short' })} {fmtTime(e.starts_at)}{e.location ? ` · ${e.location}` : ''}
              </p>
            </div>
            <span className="hand shrink-0 rounded-full bg-honey px-3 py-0.5 text-lg">{started ? 'now' : relTime(new Date(e.starts_at), now)}</span>
          </div>
          {e.prep.length > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs font-bold text-ink-soft"><span>Prep</span><span>{done}/{e.prep.length}</span></div>
              <Bar value={done / e.prep.length} color={KINDS[e.kind].color} />
              {nextPrep && (
                <p className={`mt-1.5 text-sm ${dueAt(e, nextPrep) < now ? 'font-bold text-clay' : ''}`}>
                  Next: {nextPrep.label} · {dueAt(e, nextPrep) < now ? 'overdue' : `by ${fmtTime(dueAt(e, nextPrep).toISOString())}`}
                </p>
              )}
            </div>
          )}
        </Sketchy>
      </Link>
    </motion.div>
  )
}
