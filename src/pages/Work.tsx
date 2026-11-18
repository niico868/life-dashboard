import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { fmtClock, fmtDuration, fmtTime } from '../lib/time'
import { Sketchy } from '../components/Sketchy'
import { SketchButton } from '../components/SketchButton'
import { useWork } from '../work/WorkProvider'
import { TimerFace } from '../work/TimerFace'
import { CheckIn } from '../work/CheckIn'
import { pipSupported, useOpenPip } from '../work/FloatingTimer'
import type { WorkSession } from '../work/types'
import { useWorkToday } from '../work/useWorkToday'

export function Work() {
  const w = useWork()
  const [ending, setEnding] = useState(false)
  const [justDone, setJustDone] = useState<WorkSession | null>(null)
  const [refresh, setRefresh] = useState(0)

  const today = useWorkToday(refresh)

  if (w.loading) return <p className="hand text-xl">Loading…</p>

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-end justify-between">
        <h1 className="text-4xl font-bold">Work</h1>
        <Sketchy fill="#8fb8de" roughness={1.8} seed={5} className="px-3 py-1">
          <span className="hand text-lg">today: <b className="tabular-nums">{fmtDuration(today)}</b></span>
        </Sketchy>
      </header>

      <AnimatePresence mode="wait">
        {justDone ? (
          <SessionDone key="done" s={justDone} onClose={() => setJustDone(null)} />
        ) : w.session ? (
          <motion.div key="run" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <Running onEnd={() => { void w.pause(); setEnding(true) }} />
          </motion.div>
        ) : (
          <motion.div key="start" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <StartCard />
          </motion.div>
        )}
      </AnimatePresence>

      {/* In-app check-in (when the floating window isn't showing it) */}
      <AnimatePresence>
        {w.checkinOpen && !w.pipWindow && w.session && (
          <motion.div className="fixed inset-0 z-30 flex items-center bg-paper/60 px-5 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="w-full"><CheckIn onSubmit={w.submitCheckin} onLater={w.closeCheckin} /></div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ending && w.session && (
          <EndSheet
            onCancel={() => setEnding(false)}
            onFinish={async (summary) => {
              const done = await w.finish(summary)
              setEnding(false)
              setJustDone(done)
              setRefresh((r) => r + 1)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function StartCard() {
  const { start } = useWork()
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<'stopwatch' | 'pomodoro'>('stopwatch')
  const [mins, setMins] = useState(25)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  return (
    <Sketchy fill="#fffdf7" className="p-5">
      <form className="flex flex-col gap-4" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setErr('')
        try { await start({ title, mode, pomodoroMinutes: mins }) } catch (x) { setErr((x as Error).message) }
        setBusy(false)
      }}>
        <label className="hand text-xl">What are we working on?
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. client site homepage"
            className="mt-1 w-full border-0 border-b-2 border-dashed border-ink/40 bg-transparent py-1 font-[Nunito] text-base outline-none focus:border-clay" />
        </label>

        <div className="flex gap-2">
          {(['stopwatch', 'pomodoro'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`hand flex-1 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-ink py-1.5 text-lg transition ${mode === m ? (m === 'pomodoro' ? 'bg-clay text-white' : 'bg-sage') : 'bg-white opacity-70'}`}>
              {m === 'stopwatch' ? '⏱ stopwatch' : '🍅 pomodoro'}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {mode === 'pomodoro' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="flex items-center gap-2 overflow-hidden">
              <span className="hand text-lg">blocks of</span>
              {[25, 50, 90].map((m) => (
                <button key={m} type="button" onClick={() => setMins(m)}
                  className={`hand rounded-full border-2 border-ink px-3 text-lg ${mins === m ? 'bg-honey' : 'bg-white'}`}>{m}</button>
              ))}
              <span className="hand text-lg">min</span>
            </motion.div>
          )}
        </AnimatePresence>

        <SketchButton type="submit" disabled={busy} fill="#81b29a">{busy ? 'starting…' : "Let's go →"}</SketchButton>
        {err && <p className="text-sm text-clay">{err}</p>}
      </form>
    </Sketchy>
  )
}

function Running({ onEnd }: { onEnd: () => void }) {
  const w = useWork()
  const openPip = useOpenPip()
  const s = w.session!
  const [noteText, setNoteText] = useState('')

  return (
    <div className="flex flex-col gap-5">
      {s.title && <p className="hand text-center text-2xl">{s.title}</p>}
      <TimerFace session={s} elapsed={w.elapsed} />

      <div className="flex flex-wrap justify-center gap-3">
        {s.status === 'running'
          ? <SketchButton onClick={() => void w.pause()}>⏸ pause</SketchButton>
          : <SketchButton fill="#81b29a" onClick={() => void w.resume()}>▶ resume</SketchButton>}
        <SketchButton fill="#e07a5f" onClick={onEnd}>■ end</SketchButton>
      </div>
      <div className="flex flex-wrap justify-center gap-4 text-ink-soft">
        {pipSupported() && !w.pipWindow && (
          <button className="hand text-lg underline decoration-wavy" onClick={() => void openPip()}>float it on top ↗</button>
        )}
        <button className="hand text-lg underline decoration-wavy" onClick={w.openCheckin}>check in now</button>
      </div>

      <section>
        <h2 className="mb-2 text-2xl font-bold">Session notes</h2>
        <form className="mb-3 flex gap-2" onSubmit={async (e) => { e.preventDefault(); await w.addNote('note', noteText); setNoteText('') }}>
          <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="jot something…"
            className="flex-1 border-0 border-b-2 border-dashed border-ink/40 bg-transparent py-1 outline-none focus:border-clay" />
          <button className="hand text-lg">add</button>
        </form>
        <NoteList />
      </section>
    </div>
  )
}

const NOTE_STYLE = {
  working_on: { icon: '✏️', color: 'bg-sky/40' },
  distraction: { icon: '🌀', color: 'bg-clay/25' },
  note: { icon: '📌', color: 'bg-honey/50' },
} as const

function NoteList() {
  const { notes } = useWork()
  if (!notes.length) return <p className="text-sm text-ink-soft">Nothing yet. Check-ins land here.</p>
  return (
    <ul className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {[...notes].reverse().map((n) => (
          <motion.li key={n.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className={`rounded-[15px_225px_15px_255px/255px_15px_225px_15px] px-3 py-2 ${NOTE_STYLE[n.kind].color}`}>
            <span className="mr-2">{NOTE_STYLE[n.kind].icon}</span>{n.body}
            <span className="ml-2 text-xs text-ink-soft">{fmtTime(n.created_at)}</span>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}

function EndSheet({ onCancel, onFinish }: { onCancel: () => void; onFinish: (summary: string) => Promise<void> }) {
  const { elapsed, notes } = useWork()
  const [summary, setSummary] = useState('')
  const [busy, setBusy] = useState(false)
  const distractions = notes.filter((n) => n.kind === 'distraction')
  return (
    <motion.div className="fixed inset-0 z-30 flex items-end bg-ink/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="mx-auto w-full max-w-md px-3 pb-24" initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
        transition={{ type: 'spring', damping: 22 }}>
        <Sketchy fill="#fbf6ec" roughness={1.8} className="p-5">
          <h2 className="text-3xl font-bold">Wrap it up</h2>
          <p className="mt-1">You put in <b>{fmtClock(elapsed)}</b> with {notes.filter((n) => n.kind === 'working_on').length} check-ins
            and {distractions.length} distraction{distractions.length === 1 ? '' : 's'} logged.</p>
          <label className="hand mt-3 block text-lg">How did it go? What got done?
            <textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)}
              className="mt-1 w-full rounded-xl border-2 border-ink/50 bg-white p-2 font-[Nunito] text-base outline-none focus:border-clay" />
          </label>
          <div className="mt-3 flex items-center justify-between">
            <button className="hand text-lg text-ink-soft underline decoration-wavy" onClick={onCancel}>keep going</button>
            <SketchButton fill="#81b29a" disabled={busy} onClick={async () => { setBusy(true); await onFinish(summary) }}>
              {busy ? 'saving…' : 'finish ✓'}
            </SketchButton>
          </div>
        </Sketchy>
      </motion.div>
    </motion.div>
  )
}

function SessionDone({ s, onClose }: { s: WorkSession; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, rotate: -3, y: 20 }} animate={{ opacity: 1, rotate: 0, y: 0 }} exit={{ opacity: 0 }}>
      <Sketchy fill="#fffdf7" className="p-5 text-center">
        <motion.div className="text-5xl" initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ delay: 0.2 }}>🎉</motion.div>
        <h2 className="mt-2 text-3xl font-bold">Session done</h2>
        <p className="hand mt-1 text-2xl">{fmtDuration(s.active_seconds)} of real work</p>
        <p className="mt-1 text-sm text-ink-soft">{fmtTime(s.started_at)} → {s.ended_at && fmtTime(s.ended_at)}</p>
        {s.summary && <p className="mt-3 italic">“{s.summary}”</p>}
        <div className="mt-4 flex justify-center"><SketchButton onClick={onClose}>start another</SketchButton></div>
      </Sketchy>
    </motion.div>
  )
}
