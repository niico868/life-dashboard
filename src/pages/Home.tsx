import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sketchy } from '../components/Sketchy'
import { HimCard } from '../onboarding/HimCard'
import { loadDraft } from '../onboarding/data'
import type { Draft } from '../onboarding/types'

export function Home() {
  const [draft, setDraft] = useState<Draft | null | undefined>(undefined)
  useEffect(() => { loadDraft().then((d) => setDraft(d.vision.id ? d : null)).catch(() => setDraft(null)) }, [])

  if (draft === undefined) return <p className="hand text-2xl">…</p>

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-4xl font-bold">Hey Nico 👋</h1>
      {draft ? (
        <>
          <HimCard draft={draft} />
          <Link to="/onboarding" className="hand self-center text-lg underline decoration-wavy">redo / edit him</Link>
        </>
      ) : (
        <motion.div initial={{ rotate: -2, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}>
          <Sketchy fill="#fffaf0" roughness={2} className="p-5">
            <p className="hand text-2xl">First things first.</p>
            <p className="mt-1 text-ink-soft">Let's sketch out the man you're becoming. Everything else in here is built from it.</p>
            <Link to="/onboarding" className="hand mt-4 inline-block rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-ink bg-honey px-5 py-2 text-xl">
              Start onboarding →
            </Link>
          </Sketchy>
        </motion.div>
      )}
    </div>
  )
}
