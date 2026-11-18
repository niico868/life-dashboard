import { fmtClock } from '../lib/time'
import type { WorkSession } from './types'

/** The clock + hand-drawn progress ring. Plain CSS motion only, so it also animates inside the PiP window. */
export function TimerFace({ session, elapsed, size = 220 }: { session: WorkSession; elapsed: number; size?: number }) {
  const pomodoro = session.mode === 'pomodoro' && session.pomodoro_minutes
  const block = pomodoro ? session.pomodoro_minutes! * 60 : 3600
  const inBlock = elapsed % block
  const progress = inBlock / block
  const big = pomodoro ? fmtClock(block - inBlock) : fmtClock(elapsed)
  const r = 44
  const c = 2 * Math.PI * r
  const running = session.status === 'running'

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
        {/* wobbly track */}
        <path d="M50 5 C76 4 96 24 95 50 C96 76 75 96 50 95 C24 96 4 76 5 50 C4 25 25 5 50 5Z"
          fill="#fffdf7" stroke="#2b2a33" strokeWidth="1.6" strokeDasharray="3 2.5" opacity="0.6" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={pomodoro ? '#e07a5f' : '#81b29a'} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - progress)}
          style={{ transition: 'stroke-dashoffset 1s linear' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="hand font-bold tabular-nums leading-none" style={{ fontSize: size * 0.22 }}>{big}</span>
        <span className="mt-1 text-xs font-bold uppercase tracking-wider text-ink-soft">
          {running ? (pomodoro ? `block ${Math.floor(elapsed / block) + 1} · ${fmtClock(elapsed)} total` : 'in the zone') : 'paused'}
        </span>
        {running && <span className="mt-2 h-2 w-2 animate-ping rounded-full bg-clay" />}
      </div>
    </div>
  )
}
