import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { life } from '../lib/supabase'
import { dayBounds, fmtDuration, fmtTime } from '../lib/time'
import { Sketchy } from '../components/Sketchy'
import { elapsedOf, type SessionNote, type WorkSession } from '../work/types'

/** End-of-day report built from the time logs and check-in notes. */
export function Report() {
  const [day, setDay] = useState(() => new Date())
  const [sessions, setSessions] = useState<WorkSession[]>([])
  const [notes, setNotes] = useState<SessionNote[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const { start, end } = dayBounds(day)
    ;(async () => {
      const { data: s } = await life().from('work_sessions').select('*').gte('started_at', start).lt('started_at', end).order('started_at')
      const list = (s ?? []) as WorkSession[]
      setSessions(list)
      if (!list.length) { setNotes([]); return }
      const { data: n } = await life().from('session_notes').select('*').in('session_id', list.map((x) => x.id)).order('created_at')
      setNotes((n ?? []) as SessionNote[])
    })()
  }, [day])

  const secs = sessions.map((s) => elapsedOf(s))
  const total = secs.reduce((a, b) => a + b, 0)
  const longest = Math.max(0, ...secs)
  const distractions = notes.filter((n) => n.kind === 'distraction')
  const isToday = day.toDateString() === new Date().toDateString()
  const shift = (d: number) => setDay((x) => { const y = new Date(x); y.setDate(y.getDate() + d); return y })

  const text = [
    `Work report: ${day.toDateString()}`,
    `Total: ${fmtDuration(total)} across ${sessions.length} session(s). Longest: ${fmtDuration(longest)}.`,
    ...sessions.map((s, i) => `• ${fmtTime(s.started_at)} ${s.title ?? 'Untitled'} (${fmtDuration(secs[i])})${s.summary ? `: ${s.summary}` : ''}`),
    distractions.length ? `Distractions: ${distractions.map((d) => d.body).join('; ')}` : 'Distractions: none logged',
  ].join('\n')

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <button className="hand text-2xl" onClick={() => shift(-1)} aria-label="Previous day">←</button>
        <h1 className="text-3xl font-bold">{isToday ? 'Today' : day.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</h1>
        <button className="hand text-2xl disabled:opacity-30" disabled={isToday} onClick={() => shift(1)} aria-label="Next day">→</button>
      </header>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'worked', value: fmtDuration(total), fill: '#81b29a' },
          { label: 'longest', value: fmtDuration(longest), fill: '#f2cc8f' },
          { label: 'distractions', value: String(distractions.length), fill: '#e07a5f' },
        ].map((t, i) => (
          <motion.div key={t.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Sketchy fill={t.fill + '55'} seed={i + 2} className="px-2 py-3 text-center">
              <div className="hand text-2xl font-bold">{t.value}</div>
              <div className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t.label}</div>
            </Sketchy>
          </motion.div>
        ))}
      </div>

      {sessions.length === 0 ? (
        <Sketchy fill="#fffdf7" className="p-5"><p className="text-ink-soft">No sessions logged this day.</p></Sketchy>
      ) : (
        <ul className="flex flex-col gap-4">
          {sessions.map((s, i) => {
            const sn = notes.filter((n) => n.session_id === s.id)
            return (
              <li key={s.id}>
                <Sketchy fill="#fffdf7" seed={i + 9} className="p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-xl font-bold">{s.title ?? 'Untitled session'}</h3>
                    <span className="hand whitespace-nowrap text-lg">{fmtDuration(secs[i])}</span>
                  </div>
                  <p className="text-xs text-ink-soft">
                    {fmtTime(s.started_at)} → {s.ended_at ? fmtTime(s.ended_at) : 'still going'} · {s.mode === 'pomodoro' ? `🍅 ${s.pomodoro_minutes}m blocks` : '⏱ stopwatch'}
                  </p>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-paper-2">
                    <motion.div className="h-full rounded-full bg-sage" initial={{ width: 0 }}
                      animate={{ width: `${longest ? (secs[i] / longest) * 100 : 0}%` }} transition={{ duration: 0.8, delay: 0.1 * i }} />
                  </div>
                  {s.summary && <p className="mt-2 italic">“{s.summary}”</p>}
                  {sn.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm">
                      {sn.map((n) => (
                        <li key={n.id}>
                          <span className="text-ink-soft">{fmtTime(n.created_at)}</span>{' '}
                          {n.kind === 'distraction' ? '🌀' : n.kind === 'working_on' ? '✏️' : '📌'} {n.body}
                        </li>
                      ))}
                    </ul>
                  )}
                </Sketchy>
              </li>
            )
          })}
        </ul>
      )}

      {sessions.length > 0 && (
        <button className="hand self-center text-lg underline decoration-wavy"
          onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>
          {copied ? 'copied ✓' : 'copy report as text'}
        </button>
      )}
    </div>
  )
}
