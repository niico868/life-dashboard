import { useState } from 'react'
import { Sketchy } from '../components/Sketchy'

type Props = {
  onSubmit: (workingOn: string, distraction: string) => Promise<void> | void
  onLater: () => void
  compact?: boolean
}

/** The rough, scribbled-note check-in. Deliberately not a boxed corporate modal. */
export function CheckIn({ onSubmit, onLater, compact }: Props) {
  const [working, setWorking] = useState('')
  const [distraction, setDistraction] = useState('')
  const [saving, setSaving] = useState(false)

  const line = 'w-full resize-none bg-transparent border-0 border-b-2 border-dashed border-ink/40 outline-none focus:border-clay py-1 text-base'

  return (
    <div className={`checkin-pop ${compact ? '' : 'mx-auto max-w-sm'}`} style={{ transform: 'rotate(-1.5deg)' }}>
      {/* masking-tape strip */}
      <div className="relative z-10 mx-auto -mb-3 h-5 w-24 rotate-2 bg-honey/80" style={{ clipPath: 'polygon(3% 0,97% 8%,100% 92%,0 100%)' }} />
      <Sketchy fill="#fffaf0" roughness={2.6} seed={21} className={compact ? 'p-3' : 'p-5'}>
        <p className="hand text-2xl font-bold leading-tight">Hey, quick one ✏️</p>
        <form
          className="mt-3 flex flex-col gap-3"
          onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSubmit(working, distraction); setSaving(false) }}
        >
          <label className="hand text-lg">What are you working on right now?
            <textarea autoFocus rows={1} className={line} value={working} onChange={(e) => setWorking(e.target.value)} />
          </label>
          <label className="hand text-lg">Any distractions since the last check?
            <textarea rows={1} className={line} value={distraction} onChange={(e) => setDistraction(e.target.value)}
              placeholder="none, all good" />
          </label>
          <div className="mt-1 flex items-center justify-between">
            <button type="button" onClick={onLater} className="hand text-ink-soft underline decoration-wavy">later</button>
            <button type="submit" disabled={saving}
              className="hand rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-ink bg-sage px-5 py-1.5 text-lg font-bold">
              {saving ? 'saving…' : 'got it →'}
            </button>
          </div>
        </form>
      </Sketchy>
    </div>
  )
}
