import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sketchy } from '../components/Sketchy'
import { life } from '../lib/supabase'
import { KIND_META } from '../onboarding/areas'
import type { StandardKind } from '../onboarding/types'

type Belief = { id: string; statement: string; kind: StandardKind }

/** Morning affirmation: show who he is, then "I read it" ticks the habit. */
export function AffirmationSheet({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [identity, setIdentity] = useState<string | null>(null)
  const [beliefs, setBeliefs] = useState<Belief[]>([])

  useEffect(() => {
    void Promise.all([
      life().from('vision').select('identity, ideal_self').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      life().from('standards').select('id, statement, kind').eq('area', 'beliefs').eq('active', true).order('sort_order'),
    ]).then(([v, b]) => {
      setIdentity(v.data?.identity || v.data?.ideal_self || '')
      setBeliefs((b.data ?? []) as Belief[])
    })
  }, [])

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="w-full max-w-md" initial={{ y: 60, rotate: 2 }} animate={{ y: 0, rotate: -0.5 }} exit={{ y: 60 }}
        transition={{ type: 'spring', damping: 16 }} onClick={(e) => e.stopPropagation()}>
        <Sketchy fill="#fffaf0" roughness={1.8} seed={7} className="p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-soft">Read it like you mean it</p>
          {identity === null ? <p className="hand mt-3 text-2xl">…</p> : (
            <>
              <motion.p className="hand mt-3 text-3xl font-bold leading-tight" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                {identity || 'Add an identity line in onboarding.'}
              </motion.p>
              {beliefs.length > 0 && (
                <ul className="mt-4 flex flex-col gap-1.5">
                  {beliefs.map((b, i) => (
                    <motion.li key={b.id} className="flex items-baseline gap-2 text-lg" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.25 }}>
                      <span className="hand font-bold" style={{ color: KIND_META[b.kind].color }}>{KIND_META[b.kind].mark}</span>
                      <span>I {b.statement.replace(/^(he )/i, '')}</span>
                    </motion.li>
                  ))}
                </ul>
              )}
            </>
          )}
          <div className="mt-6 flex items-center justify-between">
            <button className="text-sm text-ink-soft underline" onClick={onClose}>later</button>
            <button onClick={onDone}
              className="hand rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-ink bg-sage px-5 py-2 text-xl">
              I read it ✓
            </button>
          </div>
        </Sketchy>
      </motion.div>
    </motion.div>
  )
}
