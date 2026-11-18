import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { life } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { elapsedOf, type SessionNote, type WorkSession } from './types'
import { askNotificationPermission, playAlert, showCheckinNotification, showSimpleNotification } from './notify'

/** Random gap between check-ins, in minutes. */
const CHECKIN_MIN = 15
const CHECKIN_MAX = 35

type StartOpts = { title: string; mode: WorkSession['mode']; pomodoroMinutes?: number }

type WorkCtx = {
  session: WorkSession | null
  notes: SessionNote[]
  elapsed: number
  loading: boolean
  checkinOpen: boolean
  pipWindow: Window | null
  start: (o: StartOpts) => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  finish: (summary: string) => Promise<WorkSession | null>
  submitCheckin: (workingOn: string, distraction: string) => Promise<void>
  addNote: (kind: SessionNote['kind'], body: string, sessionId?: string) => Promise<void>
  openCheckin: () => void
  closeCheckin: () => void
  setPipWindow: (w: Window | null) => void
}

const Ctx = createContext<WorkCtx | null>(null)
export const useWork = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('useWork must be used inside WorkProvider')
  return c
}

export function WorkProvider({ children }: { children: ReactNode }) {
  const { session: auth } = useAuth()
  const [session, setSession] = useState<WorkSession | null>(null)
  const [notes, setNotes] = useState<SessionNote[]>([])
  const [now, setNow] = useState(Date.now())
  const [loading, setLoading] = useState(true)
  const [checkinOpen, setCheckinOpen] = useState(false)
  const [pipWindow, setPipWindow] = useState<Window | null>(null)
  const nextCheckinAt = useRef<number | null>(null)
  const lastPomodoroBlock = useRef(0)

  // Load any unfinished session when signed in.
  useEffect(() => {
    if (!auth) { setSession(null); setLoading(false); return }
    let cancelled = false
    ;(async () => {
      const { data } = await life().from('work_sessions').select('*').neq('status', 'ended')
        .order('started_at', { ascending: false }).limit(1).maybeSingle()
      if (cancelled) return
      setSession(data as WorkSession | null)
      if (data) {
        const { data: n } = await life().from('session_notes').select('*').eq('session_id', data.id).order('created_at')
        if (!cancelled) setNotes((n ?? []) as SessionNote[])
        lastPomodoroBlock.current = blockIndex(data as WorkSession)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [auth])

  // Tick once a second while running.
  useEffect(() => {
    if (session?.status !== 'running') return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [session?.status])

  const elapsed = session ? elapsedOf(session, now) : 0

  const scheduleCheckin = useCallback(() => {
    const mins = CHECKIN_MIN + Math.random() * (CHECKIN_MAX - CHECKIN_MIN)
    nextCheckinAt.current = Date.now() + mins * 60_000
  }, [])

  // Random check-ins + Pomodoro block alerts, evaluated on each tick.
  useEffect(() => {
    if (!session || session.status !== 'running') return
    if (nextCheckinAt.current == null) scheduleCheckin()
    if (!checkinOpen && nextCheckinAt.current && now >= nextCheckinAt.current) {
      nextCheckinAt.current = null
      setCheckinOpen(true)
      playAlert('checkin')
      if (document.hidden && !pipWindow) void showCheckinNotification(session.id)
    }
    if (session.mode === 'pomodoro' && session.pomodoro_minutes) {
      const b = blockIndex(session, now)
      if (b > lastPomodoroBlock.current) {
        lastPomodoroBlock.current = b
        playAlert('pomodoro')
        void showSimpleNotification(`Block ${b} done 🍅`, 'Stretch, sip some water, then go again.')
      }
    }
  }, [now, session, checkinOpen, pipWindow, scheduleCheckin])

  const patch = useCallback(async (id: string, changes: Partial<WorkSession>) => {
    const { data, error } = await life().from('work_sessions').update(changes).eq('id', id).select().single()
    if (error) throw error
    setSession(data.status === 'ended' ? null : (data as WorkSession))
    return data as WorkSession
  }, [])

  const start = useCallback(async ({ title, mode, pomodoroMinutes }: StartOpts) => {
    void askNotificationPermission()
    const { data, error } = await life().from('work_sessions').insert({
      title: title || null, mode, pomodoro_minutes: mode === 'pomodoro' ? pomodoroMinutes ?? 25 : null,
    }).select().single()
    if (error) throw error
    setNotes([])
    lastPomodoroBlock.current = 0
    scheduleCheckin()
    setNow(Date.now())
    setSession(data as WorkSession)
  }, [scheduleCheckin])

  const pause = useCallback(async () => {
    if (!session || session.status !== 'running') return
    await patch(session.id, { status: 'paused', active_seconds: Math.round(elapsedOf(session)), resumed_at: null })
  }, [session, patch])

  const resume = useCallback(async () => {
    if (!session || session.status !== 'paused') return
    scheduleCheckin()
    await patch(session.id, { status: 'running', resumed_at: new Date().toISOString() })
  }, [session, patch, scheduleCheckin])

  const finish = useCallback(async (summary: string) => {
    if (!session) return null
    const done = await patch(session.id, {
      status: 'ended', active_seconds: Math.round(elapsedOf(session)), resumed_at: null,
      ended_at: new Date().toISOString(), summary: summary.trim() || null,
    })
    nextCheckinAt.current = null
    setCheckinOpen(false)
    pipWindow?.close()
    return done
  }, [session, patch, pipWindow])

  const addNote = useCallback(async (kind: SessionNote['kind'], body: string, sessionId?: string) => {
    const sid = sessionId ?? session?.id
    if (!sid || !body.trim()) return
    const { data, error } = await life().from('session_notes').insert({ session_id: sid, kind, body: body.trim() }).select().single()
    if (error) throw error
    if (sid === session?.id) setNotes((n) => [...n, data as SessionNote])
  }, [session?.id])

  const submitCheckin = useCallback(async (workingOn: string, distraction: string) => {
    await addNote('working_on', workingOn)
    await addNote('distraction', distraction)
    setCheckinOpen(false)
    scheduleCheckin()
  }, [addNote, scheduleCheckin])

  // Replies typed straight into the phone notification arrive from the service worker.
  useEffect(() => {
    const sw = navigator.serviceWorker
    if (!sw) return
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'checkin-reply') {
        void addNote('working_on', e.data.body, e.data.sessionId)
        setCheckinOpen(false)
        scheduleCheckin()
      }
      if (e.data?.type === 'checkin-open') setCheckinOpen(true)
    }
    sw.addEventListener('message', onMsg)
    return () => sw.removeEventListener('message', onMsg)
  }, [addNote, scheduleCheckin])

  // Reply that cold-opened the app (no window was open): /work?reply=...&session=...
  useEffect(() => {
    if (!auth) return
    const p = new URLSearchParams(window.location.search)
    const reply = p.get('reply'), sid = p.get('session')
    if (reply && sid) void addNote('working_on', reply, sid)
    if (p.get('checkin')) setCheckinOpen(true)
    if (reply || p.get('checkin')) window.history.replaceState(null, '', window.location.pathname)
  }, [auth, addNote])

  return (
    <Ctx.Provider value={{
      session, notes, elapsed, loading, checkinOpen, pipWindow,
      start, pause, resume, finish, submitCheckin, addNote,
      openCheckin: () => setCheckinOpen(true),
      closeCheckin: () => { setCheckinOpen(false); scheduleCheckin() },
      setPipWindow,
    }}>
      {children}
    </Ctx.Provider>
  )
}

function blockIndex(s: WorkSession, now = Date.now()) {
  if (s.mode !== 'pomodoro' || !s.pomodoro_minutes) return 0
  return Math.floor(elapsedOf(s, now) / (s.pomodoro_minutes * 60))
}
