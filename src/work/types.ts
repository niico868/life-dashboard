export type WorkSession = {
  id: string
  title: string | null
  mode: 'stopwatch' | 'pomodoro'
  pomodoro_minutes: number | null
  status: 'running' | 'paused' | 'ended'
  started_at: string
  ended_at: string | null
  active_seconds: number
  resumed_at: string | null
  summary: string | null
}

export type SessionNote = {
  id: string
  session_id: string
  kind: 'working_on' | 'distraction' | 'note'
  body: string
  created_at: string
}

/** Seconds of real work in a session, right now. */
export function elapsedOf(s: WorkSession, now = Date.now()) {
  const live = s.status === 'running' && s.resumed_at ? (now - new Date(s.resumed_at).getTime()) / 1000 : 0
  return s.active_seconds + Math.max(0, live)
}
