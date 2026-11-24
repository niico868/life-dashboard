import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Overlay } from '../components/Overlay'
import { Sketchy } from '../components/Sketchy'
import { SketchButton } from '../components/SketchButton'
import {
  KINDS, OFFSET_CHOICES, deleteEvent, newKey, saveEvent, templatePrep,
  type EventKind, type EventWithPrep, type Prep,
} from './data'

const pad = (n: number) => String(n).padStart(2, '0')
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const fromInputs = (date: string, time: string) => new Date(`${date}T${time}`)

type Props = { event?: EventWithPrep; day: Date; onClose: (changed: boolean) => void }

/** Create or edit an event and its prep checklist. A bottom sheet. */
export function EventEditor({ event, day, onClose }: Props) {
  const start0 = event ? new Date(event.starts_at) : (() => { const d = new Date(day); d.setHours(10, 0, 0, 0); return d })()
  const end0 = event ? new Date(event.ends_at) : new Date(start0.getTime() + 60 * 60_000)

  const [title, setTitle] = useState(event?.title ?? '')
  const [kind, setKind] = useState<EventKind>(event?.kind ?? 'meeting')
  const [date, setDate] = useState(toDateInput(start0))
  const [start, setStart] = useState(toTimeInput(start0))
  const [end, setEnd] = useState(toTimeInput(end0))
  const [location, setLocation] = useState(event?.location ?? '')
  const [notes, setNotes] = useState(event?.notes ?? '')
  const [prep, setPrep] = useState<Prep[]>(event?.prep ?? templatePrep('meeting'))
  const [touchedPrep, setTouchedPrep] = useState(!!event)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // Switching type on a new event swaps in that type's template (until you edit the list yourself).
  const pickKind = (k: EventKind) => { setKind(k); if (!touchedPrep) setPrep(templatePrep(k)) }
  const editPrep = (key: string, patch: Partial<Prep>) => { setTouchedPrep(true); setPrep((ps) => ps.map((p) => (p.key === key ? { ...p, ...patch } : p))) }

  async function save() {
    if (!title.trim()) return setErr('Give it a name first.')
    const s = fromInputs(date, start)
    let e = fromInputs(date, end)
    if (e < s) e = new Date(s.getTime() + 60 * 60_000)
    setBusy(true); setErr('')
    try {
      await saveEvent({ id: event?.id, title, kind, starts_at: s.toISOString(), ends_at: e.toISOString(), location, notes }, prep)
      onClose(true)
    } catch (x) { setErr((x as Error).message); setBusy(false) }
  }

  async function remove() {
    if (!event || !confirm(`Delete “${event.title}”?`)) return
    setBusy(true)
    try { await deleteEvent(event.id); onClose(true) } catch (x) { setErr((x as Error).message); setBusy(false) }
  }

  const field = 'w-full rounded-xl border-2 border-ink/40 bg-white px-3 py-2 outline-none focus:border-clay'

  return (
    <Overlay onClose={() => onClose(false)}>
        <Sketchy fill="#fbf6ec" roughness={1.6} className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold">{event ? 'Edit event' : 'New event'}</h2>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <input className={field} placeholder="What is it? e.g. Onboarding: Rivers & Co" value={title} onChange={(e) => setTitle(e.target.value)} />

            <div className="flex flex-wrap gap-2">
              {(Object.keys(KINDS) as EventKind[]).map((k) => (
                <button key={k} type="button" onClick={() => pickKind(k)}
                  className={`hand rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-ink px-3 py-0.5 ${kind === k ? '' : 'opacity-50'}`}
                  style={{ background: kind === k ? KINDS[k].color : '#fff' }}>
                  {KINDS[k].emoji} {KINDS[k].label}
                </button>
              ))}
            </div>

            <input type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-bold text-ink-soft">STARTS
                <input type="time" className={`${field} min-w-0`} value={start} onChange={(e) => setStart(e.target.value)} />
              </label>
              <label className="text-xs font-bold text-ink-soft">ENDS
                <input type="time" className={`${field} min-w-0`} value={end} onChange={(e) => setEnd(e.target.value)} />
              </label>
            </div>
            <input className={field} placeholder="Where? (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
            <textarea className={field} rows={2} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

            <div>
              <h3 className="text-2xl font-bold">Prep checklist</h3>
              <p className="text-sm text-ink-soft">Planned ahead, so you show up ready. Each item shows up as “due” at its time.</p>
              <ul className="mt-2 flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {prep.map((p) => (
                    <motion.li key={p.key} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}
                      className="rounded-xl bg-white/80 p-2">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" className="h-5 w-5 accent-[#81b29a]" checked={p.done} onChange={(e) => editPrep(p.key, { done: e.target.checked })} />
                        <input className="min-w-0 flex-1 bg-transparent outline-none" value={p.label} onChange={(e) => editPrep(p.key, { label: e.target.value })} />
                        <button aria-label="Remove" className="px-1 text-ink-soft" onClick={() => { setTouchedPrep(true); setPrep((ps) => ps.filter((x) => x.key !== p.key)) }}>✕</button>
                      </div>
                      <select className="mt-1 ml-7 rounded-lg bg-paper-2 px-2 py-0.5 text-sm" value={p.due_offset_minutes}
                        onChange={(e) => editPrep(p.key, { due_offset_minutes: Number(e.target.value) })}>
                        {OFFSET_CHOICES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        {!OFFSET_CHOICES.some(([v]) => v === p.due_offset_minutes) && <option value={p.due_offset_minutes}>{Math.round(p.due_offset_minutes / 60)}h before</option>}
                      </select>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
              <button className="mt-2 text-sm underline" onClick={() => { setTouchedPrep(true); setPrep((ps) => [...ps, { key: newKey(), label: '', due_offset_minutes: 60, done: false, sort_order: ps.length }]) }}>
                + add prep item
              </button>
            </div>

            {err && <p className="text-sm text-clay">{err}</p>}
            <div className="mt-2 flex items-center justify-between">
              {event ? <button className="hand text-lg text-clay underline decoration-wavy" disabled={busy} onClick={remove}>delete</button> : <span />}
              <SketchButton fill="#81b29a" disabled={busy} onClick={save}>{busy ? 'saving…' : 'Save ✓'}</SketchButton>
            </div>
          </div>
        </Sketchy>
    </Overlay>
  )
}
