import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sketchy } from '../components/Sketchy'
import { SketchButton } from '../components/SketchButton'
import { fmtTime } from '../lib/time'
import { addDays } from '../habits/data'
import { EventEditor } from '../calendar/EventEditor'
import { Stars } from '../calendar/Stars'
import {
  KINDS, dueAt, loadEvents, loadRatingStats, loadUnrated, offsetLabel, rateEvent, setPrepDone,
  type CalEvent, type EventKind, type EventWithPrep, type Prep,
} from '../calendar/data'

/** The waking-hours window used for the free/busy bar. */
const DAY_START = 7, DAY_END = 22

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
/** Weeks start on Monday. */
const weekStart = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7))

export function Calendar() {
  const [selected, setSelected] = useState(() => startOfDay(new Date()))
  const [week, setWeek] = useState<EventWithPrep[]>([])
  const [soon, setSoon] = useState<EventWithPrep[]>([])
  const [unrated, setUnrated] = useState<CalEvent[]>([])
  const [stats, setStats] = useState<{ kind: EventKind; rating: number }[]>([])
  const [editing, setEditing] = useState<EventWithPrep | 'new' | null>(null)
  const [error, setError] = useState('')

  const ws = useMemo(() => weekStart(selected), [selected])

  const reload = useCallback(async () => {
    try {
      const now = new Date()
      const [w, s, u, r] = await Promise.all([
        loadEvents(ws, addDays(ws, 7)),
        loadEvents(addDays(now, -1), addDays(now, 8)), // for prep due soon
        loadUnrated(), loadRatingStats(),
      ])
      setWeek(w); setSoon(s); setUnrated(u); setStats(r)
    } catch (e) { setError((e as Error).message) }
  }, [ws])
  useEffect(() => { void reload() }, [reload])

  const dayEvents = week.filter((e) => sameDay(new Date(e.starts_at), selected))

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-4xl font-bold">Calendar</h1>
        <SketchButton onClick={() => setEditing('new')}>+ event</SketchButton>
      </header>

      <PrepDue events={soon} onChange={reload} />
      <AnimatePresence>{unrated[0] && <RatePrompt key={unrated[0].id} event={unrated[0]} onDone={reload} />}</AnimatePresence>

      <WeekStrip ws={ws} selected={selected} events={week} onPick={setSelected}
        onShift={(n) => setSelected((d) => addDays(d, n * 7))} />

      <section>
        <h2 className="mb-2 text-2xl font-bold">
          {sameDay(selected, new Date()) ? 'Today' : selected.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
        </h2>
        <FreeBusy day={selected} events={dayEvents} />
        {dayEvents.length === 0 ? (
          <p className="mt-3 text-ink-soft">Nothing booked. Wide open.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {dayEvents.map((e, i) => <EventCard key={e.id} e={e} i={i} onOpen={() => setEditing(e)} />)}
          </ul>
        )}
      </section>

      <RatingSummary stats={stats} />
      {error && <p className="text-sm text-clay">{error}</p>}

      <AnimatePresence>
        {editing && (
          <EventEditor event={editing === 'new' ? undefined : editing} day={selected}
            onClose={(changed) => { setEditing(null); if (changed) void reload() }} />
        )}
      </AnimatePresence>
    </div>
  )
}

function WeekStrip({ ws, selected, events, onPick, onShift }: {
  ws: Date; selected: Date; events: CalEvent[]; onPick: (d: Date) => void; onShift: (n: number) => void
}) {
  const today = new Date()
  return (
    <div className="flex items-center gap-1">
      <button aria-label="Previous week" className="hand px-1 text-2xl" onClick={() => onShift(-1)}>‹</button>
      <div className="grid flex-1 grid-cols-7 gap-1">
        {Array.from({ length: 7 }, (_, i) => {
          const d = addDays(ws, i)
          const evs = events.filter((e) => sameDay(new Date(e.starts_at), d))
          const isSel = sameDay(d, selected)
          return (
            <button key={i} onClick={() => onPick(d)} className="relative flex flex-col items-center rounded-2xl py-1.5">
              {isSel && <motion.span layoutId="day-blob" className="absolute inset-0 -z-10 rounded-[40%_60%_55%_45%] bg-honey" />}
              <span className="text-[11px] font-bold uppercase text-ink-soft">{d.toLocaleDateString([], { weekday: 'narrow' })}</span>
              <span className={`hand text-xl ${sameDay(d, today) ? 'underline decoration-clay decoration-wavy' : ''}`}>{d.getDate()}</span>
              <span className="flex h-2 gap-0.5">
                {evs.slice(0, 3).map((e) => <span key={e.id} className="h-1.5 w-1.5 rounded-full" style={{ background: KINDS[e.kind].color }} />)}
              </span>
            </button>
          )
        })}
      </div>
      <button aria-label="Next week" className="hand px-1 text-2xl" onClick={() => onShift(1)}>›</button>
    </div>
  )
}

/** A bar from 7am–10pm with busy blocks, plus a list of the free gaps. */
function FreeBusy({ day, events }: { day: Date; events: CalEvent[] }) {
  const base = startOfDay(day)
  const win0 = base.getTime() + DAY_START * 3600_000, win1 = base.getTime() + DAY_END * 3600_000
  const span = win1 - win0
  const blocks = events
    .map((e) => [Math.max(new Date(e.starts_at).getTime(), win0), Math.min(new Date(e.ends_at).getTime(), win1), e] as const)
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0])

  // Free gaps of 30+ minutes.
  const free: [number, number][] = []
  let cursor = win0
  for (const [a, b] of blocks) { if (a - cursor >= 30 * 60_000) free.push([cursor, a]); cursor = Math.max(cursor, b) }
  if (win1 - cursor >= 30 * 60_000) free.push([cursor, win1])
  const t = (ms: number) => fmtTime(new Date(ms).toISOString())

  return (
    <div>
      <div className="relative h-7 overflow-hidden rounded-[10px_30px_10px_30px] border-2 border-ink bg-sage/25">
        {blocks.map(([a, b, e], i) => (
          <motion.div key={i} className="absolute inset-y-0 origin-left border-x border-ink/40" title={e.title}
            style={{ left: `${((a - win0) / span) * 100}%`, width: `${((b - a) / span) * 100}%`, background: KINDS[e.kind].color }}
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: i * 0.08 }} />
        ))}
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] text-ink-soft"><span>7am</span><span>12pm</span><span>5pm</span><span>10pm</span></div>
      <p className="mt-1 text-sm">
        <b className="text-sage">Free:</b>{' '}
        {free.length ? free.map(([a, b]) => `${t(a)}–${t(b)}`).join(' · ') : 'fully booked'}
      </p>
    </div>
  )
}

function EventCard({ e, i, onOpen }: { e: EventWithPrep; i: number; onOpen: () => void }) {
  const done = e.prep.filter((p) => p.done).length
  return (
    <motion.li initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
      <button onClick={onOpen} className="w-full text-left">
        <Sketchy fill="#fffdf7" seed={i + 30} className="p-3">
          <div className="flex gap-3">
            <span className="w-1.5 shrink-0 rounded-full" style={{ background: KINDS[e.kind].color }} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-ink-soft">{fmtTime(e.starts_at)} – {fmtTime(e.ends_at)} · {KINDS[e.kind].emoji} {KINDS[e.kind].label}</p>
              <p className="hand text-xl font-bold leading-tight">{e.title}</p>
              {e.location && <p className="text-sm text-ink-soft">📍 {e.location}</p>}
              <div className="mt-1 flex items-center gap-3 text-sm">
                {e.prep.length > 0 && <span className={done === e.prep.length ? 'text-sage' : ''}>prep {done}/{e.prep.length}</span>}
                {e.rating && <Stars value={e.rating} size={16} />}
              </div>
            </div>
          </div>
        </Sketchy>
      </button>
    </motion.li>
  )
}

/** Prep items that are due now or within 48h, for upcoming events. */
function PrepDue({ events, onChange }: { events: EventWithPrep[]; onChange: () => void }) {
  const [, force] = useState(0)
  const now = Date.now()
  const items = events
    .filter((e) => new Date(e.starts_at).getTime() > now)
    .flatMap((e) => e.prep.filter((p) => !p.done).map((p) => ({ e, p, due: dueAt(e, p).getTime() })))
    .filter((x) => x.due <= now + 48 * 3600_000)
    .sort((a, b) => a.due - b.due)
  if (!items.length) return null

  const tick = async (p: Prep) => {
    p.done = true; force((n) => n + 1) // optimistic
    try { await setPrepDone(p.id!, true) } finally { onChange() }
  }

  return (
    <Sketchy fill="#fffaf0" roughness={1.8} seed={61} className="p-4">
      <h2 className="text-2xl font-bold">🧳 Prep due</h2>
      <ul className="mt-2 flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {items.map(({ e, p, due }) => {
            const overdue = due < now
            return (
              <motion.li key={p.id} layout exit={{ opacity: 0, x: 60 }} className="flex items-center gap-3">
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => void tick(p)} aria-label={`Done: ${p.label}`}
                  className="h-7 w-7 shrink-0 rounded-full border-2 border-ink bg-white" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight">{p.label}</p>
                  <p className={`text-xs ${overdue ? 'font-bold text-clay' : 'text-ink-soft'}`}>
                    {overdue ? 'overdue' : `due ${dueLabel(due)}`} · for {e.title} ({offsetLabel(p.due_offset_minutes)})
                  </p>
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </Sketchy>
  )
}

function dueLabel(ms: number) {
  const d = new Date(ms)
  const when = sameDay(d, new Date()) ? 'today' : sameDay(d, addDays(new Date(), 1)) ? 'tomorrow' : d.toLocaleDateString([], { weekday: 'short' })
  return `${when} ${fmtTime(d.toISOString())}`
}

/** "How did it go?" for the most recent unrated past event. */
function RatePrompt({ event, onDone }: { event: CalEvent; onDone: () => void }) {
  const [stars, setStars] = useState(0)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <motion.div initial={{ opacity: 0, rotate: 2, y: -10 }} animate={{ opacity: 1, rotate: -1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
      <Sketchy fill="#f2cc8f55" roughness={2} seed={88} className="p-4">
        <p className="hand text-xl font-bold">How did it go?</p>
        <p className="text-sm text-ink-soft">{KINDS[event.kind].emoji} {event.title} · {new Date(event.starts_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</p>
        <div className="mt-2"><Stars value={stars} onChange={setStars} /></div>
        <AnimatePresence>
          {stars > 0 && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
              <input className="mt-2 w-full border-0 border-b-2 border-dashed border-ink/40 bg-transparent py-1 outline-none focus:border-clay"
                placeholder="What went well? What would you do differently?" value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="mt-2 flex justify-end">
                <SketchButton fill="#81b29a" disabled={busy} onClick={async () => { setBusy(true); await rateEvent(event.id, stars, note); onDone() }}>
                  {busy ? '…' : 'save'}
                </SketchButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Sketchy>
    </motion.div>
  )
}

function RatingSummary({ stats }: { stats: { kind: EventKind; rating: number }[] }) {
  if (!stats.length) return null
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  const byKind = (Object.keys(KINDS) as EventKind[])
    .map((k) => ({ k, rs: stats.filter((s) => s.kind === k).map((s) => s.rating) }))
    .filter((x) => x.rs.length)
  return (
    <section>
      <h2 className="text-2xl font-bold">How things went</h2>
      <p className="text-sm text-ink-soft">Last 30 days, {stats.length} rated</p>
      <div className="mt-2 flex items-center gap-3">
        <span className="hand text-4xl font-bold">{avg(stats.map((s) => s.rating)).toFixed(1)}</span>
        <Stars value={Math.round(avg(stats.map((s) => s.rating)))} size={22} />
      </div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {byKind.map(({ k, rs }) => (
          <li key={k} className="flex items-center gap-2 text-sm">
            <span className="w-24">{KINDS[k].emoji} {KINDS[k].label}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper-2">
              <motion.div className="h-full rounded-full" style={{ background: KINDS[k].color }}
                initial={{ width: 0 }} animate={{ width: `${(avg(rs) / 5) * 100}%` }} transition={{ duration: 0.8 }} />
            </div>
            <span className="hand w-8 text-right">{avg(rs).toFixed(1)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
