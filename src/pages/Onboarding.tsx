import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { SketchButton } from '../components/SketchButton'
import { AREAS, KIND_META, NIGHT_PRESETS, guessKind } from '../onboarding/areas'
import { emptyDraft, loadDraft, saveDraft } from '../onboarding/data'
import { suggestHabits, parseTimesPerDay } from '../onboarding/suggest'
import { HimCard } from '../onboarding/HimCard'
import { newKey, type Draft, type HabitDraft, type HabitKind, type Routine, type StandardKind } from '../onboarding/types'

const STEPS = ['intro', 'now', 'vision', 'standards', 'actions', 'night', 'summary'] as const

const input = 'w-full rounded-xl border-2 border-ink/50 bg-white p-3 outline-none focus:border-clay'
const pill = 'hand rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-ink px-3 py-0.5'

export function Onboarding() {
  const nav = useNavigate()
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [loaded, setLoaded] = useState(false)
  const [step, setStep] = useState(0)
  const [area, setArea] = useState(0)
  const [dir, setDir] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadDraft().then((d) => { setDraft(d); setLoaded(true) }).catch(() => setLoaded(true)) }, [])

  const set = (fn: (d: Draft) => Draft) => setDraft((d) => fn(structuredClone(d)))
  const name = STEPS[step]

  /** Before the actions step, suggest habits for any standard that has none yet. */
  function fillSuggestions() {
    set((d) => {
      const covered = new Set(d.habits.map((h) => h.standardKey))
      for (const s of d.standards) if (!covered.has(s.key)) d.habits.push(...suggestHabits(s))
      return d
    })
  }

  function next() {
    setDir(1)
    if (name === 'standards' && area < AREAS.length - 1) return setArea(area + 1)
    if (name === 'standards') fillSuggestions()
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  function back() {
    setDir(-1)
    if (name === 'standards' && area > 0) return setArea(area - 1)
    setStep((s) => Math.max(s - 1, 0))
  }

  async function save() {
    setSaving(true); setError('')
    try { await saveDraft(draft); nav('/', { replace: true }) }
    catch (e) { setError((e as Error).message); setSaving(false) }
  }

  if (!loaded) return <p className="hand text-2xl">Getting your notebook…</p>

  const progress = (step + (name === 'standards' ? area / AREAS.length : 0)) / (STEPS.length - 1)

  return (
    <div className="flex min-h-[70dvh] flex-col">
      {/* wobbly progress bar */}
      <div className="mb-6 h-3 overflow-hidden rounded-[10px_40px_10px_40px] border-2 border-ink bg-white">
        <motion.div className="h-full bg-honey" animate={{ width: `${progress * 100}%` }} transition={{ type: 'spring', damping: 20 }} />
      </div>

      <AnimatePresence mode="wait" custom={dir}>
        <motion.div key={`${name}-${name === 'standards' ? area : ''}`} custom={dir}
          initial={{ opacity: 0, x: dir * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -40 }}
          transition={{ duration: 0.22 }} className="flex-1">
          {name === 'intro' && (
            <Step title="Let's meet him." say="We're going to sketch out the man you're becoming: who he is, what he does, what he won't do. Then we turn that into a daily plan you can tick off. Takes about 10 minutes. Be honest, nobody sees this but you.">
              <div className="text-center text-7xl">✍️</div>
            </Step>
          )}

          {name === 'now' && (
            <Step title="Where you are now" say="First, the honest snapshot. How are things right now? Habits, energy, money, what's working, what's not. No judgement.">
              <textarea rows={7} className={input} value={draft.vision.current_self} placeholder="Right now I…"
                onChange={(e) => set((d) => { d.vision.current_self = e.target.value; return d })} />
            </Step>
          )}

          {name === 'vision' && (
            <Step title="Visualise him" say="Close your eyes for a sec. Picture the man you want to be. What's he like? What does his day look like, morning to night?">
              <textarea rows={6} className={input} value={draft.vision.ideal_self} placeholder="He wakes up at… He's the kind of man who…"
                onChange={(e) => set((d) => { d.vision.ideal_self = e.target.value; return d })} />
              <label className="hand mt-4 block text-lg">Now say it as one line, in the present tense. Who are you?
                <input className={`${input} mt-1 font-[Nunito] text-base`} value={draft.vision.identity} placeholder="I am the luckiest man walking."
                  onChange={(e) => set((d) => { d.vision.identity = e.target.value; return d })} />
              </label>
              <p className="mt-1 text-sm text-ink-soft">You'll read this every morning. Belief sets the direction, your habits do the work.</p>
              <label className="hand mt-4 block text-lg">And why does becoming him matter to you?
                <textarea rows={3} className={`${input} mt-1 font-[Nunito] text-base`} value={draft.vision.why}
                  onChange={(e) => set((d) => { d.vision.why = e.target.value; return d })} />
              </label>
            </Step>
          )}

          {name === 'standards' && <StandardsStep draft={draft} set={set} areaIndex={area} onJump={(i) => { setDir(i > area ? 1 : -1); setArea(i) }} />}
          {name === 'actions' && <ActionsStep draft={draft} set={set} />}
          {name === 'night' && <NightStep draft={draft} set={set} />}

          {name === 'summary' && (
            <Step title="This is him." say="Read it out loud. This is who you're building, one tick at a time.">
              <HimCard draft={draft} />
            </Step>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="sticky bottom-20 mt-6 flex items-center justify-between bg-paper/90 py-2">
        {step > 0 ? <button className="hand text-lg underline decoration-wavy" onClick={back}>← back</button> : <span />}
        {name === 'summary' ? (
          <SketchButton fill="#81b29a" disabled={saving} onClick={save}>{saving ? 'saving…' : 'Lock it in ✓'}</SketchButton>
        ) : (
          <SketchButton onClick={next}>
            {name === 'intro' ? "Let's go →" : name === 'standards' && area < AREAS.length - 1 ? `next: ${AREAS[area + 1].emoji} →` : 'next →'}
          </SketchButton>
        )}
      </div>
      {error && <p className="text-sm text-clay">Couldn't save: {error}</p>}
    </div>
  )
}

function Step({ title, say, children }: { title: string; say: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-4xl font-bold leading-tight">{title}</h1>
      <p className="text-lg leading-relaxed text-ink-soft">{say}</p>
      {children}
    </div>
  )
}

type SetDraft = (fn: (d: Draft) => Draft) => void

function StandardsStep({ draft, set, areaIndex, onJump }: { draft: Draft; set: SetDraft; areaIndex: number; onJump: (i: number) => void }) {
  const a = AREAS[areaIndex]
  const [text, setText] = useState('')
  const items = draft.standards.filter((s) => s.area === a.id)

  const add = (statement: string) => {
    const t = statement.trim()
    if (!t) return
    set((d) => { d.standards.push({ key: newKey(), area: a.id, statement: t, kind: guessKind(t), target_per_day: parseTimesPerDay(t) }); return d })
    setText('')
  }
  const cycle = (k: StandardKind): StandardKind => (k === 'do' ? 'dont' : k === 'dont' ? 'limit' : 'do')

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
        {AREAS.map((x, i) => {
          const n = draft.standards.filter((s) => s.area === x.id).length
          return (
            <button key={x.id} onClick={() => onJump(i)} aria-label={x.label}
              className={`relative shrink-0 rounded-full px-2 py-1 text-xl ${i === areaIndex ? 'bg-honey' : 'opacity-60'}`}>
              {x.emoji}{n > 0 && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-sage" />}
            </button>
          )
        })}
      </div>

      <Step title={`${a.emoji} ${a.label}`} say={`${a.prompt} Write it the way you'd describe him. Each line is a do, a don't, or a limit. Tap the tag to switch.`}>
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {items.map((s) => (
              <motion.li key={s.key} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: 40 }}
                className="flex items-center gap-2 rounded-xl bg-white/70 px-2 py-1.5">
                <button className={`${pill} shrink-0 text-sm`} style={{ background: KIND_META[s.kind].color }}
                  onClick={() => set((d) => { const t = d.standards.find((x) => x.key === s.key)!; t.kind = cycle(t.kind); return d })}>
                  {KIND_META[s.kind].mark} {KIND_META[s.kind].label}
                </button>
                <input className="min-w-0 flex-1 bg-transparent outline-none" value={s.statement}
                  onChange={(e) => set((d) => { d.standards.find((x) => x.key === s.key)!.statement = e.target.value; return d })} />
                <button aria-label="Remove" className="px-1 text-ink-soft"
                  onClick={() => set((d) => { d.standards = d.standards.filter((x) => x.key !== s.key); d.habits = d.habits.filter((h) => h.standardKey !== s.key); return d })}>✕</button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add(text) }}>
          <input className={`${input} py-2`} value={text} onChange={(e) => setText(e.target.value)} placeholder="He…" />
          <button className={`${pill} bg-honey text-lg`}>add</button>
        </form>
        <div className="flex flex-wrap gap-2">
          {a.examples.filter((ex) => !items.some((s) => s.statement === ex)).map((ex) => (
            <motion.button key={ex} whileTap={{ scale: 0.9 }} onClick={() => add(ex)}
              className="rounded-full border-2 border-dashed border-ink/40 px-3 py-1 text-sm">+ {ex}</motion.button>
          ))}
        </div>
      </Step>
    </div>
  )
}

const KIND_CYCLE: HabitKind[] = ['habit', 'chore']
const ROUTINE_CYCLE: Routine[] = ['anytime', 'morning', 'night']
const ROUTINE_ICON: Record<Routine, string> = { anytime: '☀️ any time', morning: '🌅 morning', night: '🌙 night' }

function HabitRow({ h, set }: { h: HabitDraft; set: SetDraft }) {
  const edit = (fn: (x: HabitDraft) => void) => set((d) => { fn(d.habits.find((x) => x.key === h.key)!); return d })
  return (
    <motion.li layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}
      className="rounded-xl bg-white/80 p-2">
      <div className="flex items-center gap-2">
        <input className="min-w-0 flex-1 bg-transparent font-semibold outline-none" value={h.name} onChange={(e) => edit((x) => { x.name = e.target.value })} />
        <button aria-label="Remove" className="px-1 text-ink-soft" onClick={() => set((d) => { d.habits = d.habits.filter((x) => x.key !== h.key); return d })}>✕</button>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
        <button className={`${pill} ${h.kind === 'chore' ? 'bg-sky/60' : 'bg-sage/50'}`}
          onClick={() => edit((x) => { x.kind = KIND_CYCLE[(KIND_CYCLE.indexOf(x.kind) + 1) % 2] })}>{h.kind}</button>
        <button className={`${pill} bg-white`} onClick={() => edit((x) => { x.routine = ROUTINE_CYCLE[(ROUTINE_CYCLE.indexOf(x.routine) + 1) % 3] })}>
          {ROUTINE_ICON[h.routine]}</button>
        <span className="flex items-center gap-1">
          <button className="hand h-7 w-7 rounded-full border-2 border-ink" onClick={() => edit((x) => { x.times_per_day = Math.max(1, x.times_per_day - 1) })}>−</button>
          <span className="hand w-10 text-center">{h.times_per_day}×/day</span>
          <button className="hand h-7 w-7 rounded-full border-2 border-ink" onClick={() => edit((x) => { x.times_per_day = Math.min(12, x.times_per_day + 1) })}>+</button>
        </span>
      </div>
    </motion.li>
  )
}

function ActionsStep({ draft, set }: { draft: Draft; set: SetDraft }) {
  const addHabit = (standardKey: string | null, name = '') =>
    set((d) => { d.habits.push({ key: newKey(), standardKey, name, kind: 'habit', routine: 'anytime', times_per_day: 1 }); return d })
  const loose = draft.habits.filter((h) => !h.standardKey || !draft.standards.some((s) => s.key === h.standardKey))

  return (
    <Step title="Turn it into action" say="Standards are who he is. Habits and chores are what he does today. I've suggested some, so rename, retune or delete anything that doesn't fit.">
      {draft.standards.length === 0 && <p className="text-ink-soft">No standards yet. Go back, or add habits directly below.</p>}
      {draft.standards.map((s) => {
        const hs = draft.habits.filter((h) => h.standardKey === s.key)
        return (
          <div key={s.key}>
            <p className="hand text-lg"><span style={{ color: KIND_META[s.kind].color === '#f2cc8f' ? '#c99a3b' : KIND_META[s.kind].color }}>{KIND_META[s.kind].mark}</span> {s.statement}</p>
            <ul className="mt-1 flex flex-col gap-2"><AnimatePresence initial={false}>{hs.map((h) => <HabitRow key={h.key} h={h} set={set} />)}</AnimatePresence></ul>
            <button className="mt-1 text-sm text-ink-soft underline" onClick={() => addHabit(s.key)}>+ another for this</button>
          </div>
        )
      })}
      <div>
        <p className="hand text-lg">Extras</p>
        <ul className="mt-1 flex flex-col gap-2"><AnimatePresence initial={false}>{loose.map((h) => <HabitRow key={h.key} h={h} set={set} />)}</AnimatePresence></ul>
        <button className="mt-1 text-sm text-ink-soft underline" onClick={() => addHabit(null, 'New habit')}>+ add a habit</button>
      </div>
    </Step>
  )
}

function NightStep({ draft, set }: { draft: Draft; set: SetDraft }) {
  const [text, setText] = useState('')
  const add = (name: string) => {
    if (!name.trim()) return
    set((d) => { d.night.push({ key: newKey(), standardKey: null, name: name.trim(), kind: 'routine_step', routine: 'night', times_per_day: 1 }); return d })
    setText('')
  }
  const move = (i: number, by: number) => set((d) => {
    const j = i + by
    if (j < 0 || j >= d.night.length) return d
    ;[d.night[i], d.night[j]] = [d.night[j], d.night[i]]
    return d
  })

  return (
    <Step title="🌙 The non-negotiables" say="Your “I can't sleep until this is done” list. Put them in the order you'll do them. Later, the app will nag you until every one is ticked.">
      <ol className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {draft.night.map((n, i) => (
            <motion.li key={n.key} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: 40 }}
              className="flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2">
              <span className="hand w-6 text-lg font-bold">{i + 1}.</span>
              <input className="min-w-0 flex-1 bg-transparent outline-none" value={n.name}
                onChange={(e) => set((d) => { d.night[i].name = e.target.value; return d })} />
              <button aria-label="Move up" className="px-1" onClick={() => move(i, -1)}>↑</button>
              <button aria-label="Move down" className="px-1" onClick={() => move(i, 1)}>↓</button>
              <button aria-label="Remove" className="px-1 text-ink-soft" onClick={() => set((d) => { d.night.splice(i, 1); return d })}>✕</button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add(text) }}>
        <input className={`${input} py-2`} value={text} onChange={(e) => setText(e.target.value)} placeholder="Before bed I…" />
        <button className={`${pill} bg-honey text-lg`}>add</button>
      </form>
      <div className="flex flex-wrap gap-2">
        {NIGHT_PRESETS.filter((p) => !draft.night.some((n) => n.name === p)).map((p) => (
          <motion.button key={p} whileTap={{ scale: 0.9 }} onClick={() => add(p)}
            className="rounded-full border-2 border-dashed border-ink/40 px-3 py-1 text-sm">+ {p}</motion.button>
        ))}
      </div>
    </Step>
  )
}
