import { paragraphToFirstPerson, toFirstPerson } from '../lib/voice'
import { motion } from 'framer-motion'
import { Sketchy } from '../components/Sketchy'
import { AREAS, KIND_META, areaOf } from './areas'
import type { Draft } from './types'

/** "This is me." The vision + standards on one card. */
export function HimCard({ draft }: { draft: Draft }) {
  const byArea = AREAS.map((a) => ({ area: a, items: draft.standards.filter((s) => s.area === a.id && s.statement.trim()) }))
    .filter((g) => g.items.length)
  const other = draft.standards.filter((s) => !AREAS.some((a) => a.id === s.area))
  if (other.length) byArea.push({ area: areaOf('general') as (typeof AREAS)[number], items: other })

  return (
    <Sketchy fill="#fffaf0" roughness={1.6} seed={42} className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-soft">This is me</p>
      {draft.vision.identity && (
        <motion.p className="hand mt-2 rounded-xl bg-honey/50 px-3 py-2 text-3xl font-bold leading-tight" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          {draft.vision.identity}
        </motion.p>
      )}
      {draft.vision.ideal_self && (
        <motion.p className="hand mt-2 text-2xl leading-snug" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          “{paragraphToFirstPerson(draft.vision.ideal_self)}”
        </motion.p>
      )}
      {draft.vision.why && <p className="mt-2 text-sm text-ink-soft"><b>Why:</b> {draft.vision.why}</p>}

      <div className="mt-4 flex flex-col gap-3">
        {byArea.map(({ area, items }, gi) => (
          <motion.div key={area.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + gi * 0.07 }}>
            <p className="hand text-lg font-bold">{area.emoji} {area.label}</p>
            <ul className="ml-1">
              {items.map((s) => (
                <li key={s.key} className="flex items-baseline gap-2">
                  <span className="hand w-4 text-center text-lg font-bold" style={{ color: KIND_META[s.kind].color === '#f2cc8f' ? '#c99a3b' : KIND_META[s.kind].color }}>
                    {KIND_META[s.kind].mark}
                  </span>
                  <span>{toFirstPerson(s.statement)}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-sage/30 px-3 py-0.5">{draft.habits.length} daily habits & chores</span>
        <span className="rounded-full bg-sky/40 px-3 py-0.5">🌙 {draft.night.length}-step night routine</span>
      </div>
    </Sketchy>
  )
}
