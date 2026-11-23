import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Sketchy } from '../components/Sketchy'
import { addFuel, deleteFuel, loadFuel, type Fuel as FuelRow } from '../fuel/data'

const input = 'w-full rounded-xl border-2 border-ink/50 bg-white p-3 outline-none focus:border-clay'

/** Fuel: videos and links that feed the mind, with your own takeaways. */
export function Fuel() {
  const [items, setItems] = useState<FuelRow[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const reload = () => loadFuel().then(setItems).catch((e) => setError(e.message))
  useEffect(() => { void reload() }, [])

  async function save() {
    if (!title.trim()) return setError('Give it a title.')
    try {
      await addFuel({ url, title, takeaways: notes.split('\n') })
      setUrl(''); setTitle(''); setNotes(''); setAdding(false); setError('')
      await reload()
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <Link to="/" className="text-sm text-ink-soft underline">← home</Link>
        <h1 className="text-4xl font-bold">🔥 Fuel</h1>
        <p className="text-ink-soft">What's feeding your mind. One takeaway a day shows up on Home.</p>
      </header>

      {!adding ? (
        <button onClick={() => setAdding(true)} className="hand self-start rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-ink bg-honey px-5 py-2 text-xl">
          + save a video
        </button>
      ) : (
        <Sketchy fill="#fffaf0" className="flex flex-col gap-3 p-5">
          <input className={input} placeholder="Link (YouTube, TikTok…)" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} />
          <input className={input} placeholder="Title, e.g. Have the audacity to be delusional" value={title} onChange={(e) => setTitle(e.target.value)} />
          <label className="hand text-lg">Your takeaways, one per line
            <textarea rows={4} className={`${input} mt-1 font-[Nunito] text-base`} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder={'Belief is the compass, the system is the engine.\nMy mind works for me or against me.'} />
          </label>
          {error && <p className="text-sm text-clay">{error}</p>}
          <div className="flex justify-between">
            <button className="text-sm underline" onClick={() => setAdding(false)}>cancel</button>
            <button onClick={() => void save()} className="hand rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-ink bg-sage px-5 py-1.5 text-xl">save</button>
          </div>
        </Sketchy>
      )}

      {items === null ? <p className="hand text-2xl">…</p> : !items.length ? (
        <p className="text-ink-soft">Nothing saved yet. The next video that hits, save it here.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {items.map((f, i) => (
              <motion.li key={f.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 80 }} transition={{ delay: i * 0.04 }}>
                <Sketchy fill="#ffffff" seed={i + 11} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="hand text-xl font-bold leading-snug">{f.url ? <a href={f.url} target="_blank" rel="noreferrer" className="underline decoration-wavy">{f.title} ↗</a> : f.title}</p>
                    <button aria-label="delete" className="text-ink-soft" onClick={() => { if (confirm('Delete this?')) void deleteFuel(f.id).then(reload) }}>✕</button>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1">
                    {f.takeaways.map((t) => <li key={t} className="flex gap-2"><span>→</span><span>{t}</span></li>)}
                  </ul>
                  <p className="mt-2 text-xs text-ink-soft">{new Date(f.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
                </Sketchy>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}
