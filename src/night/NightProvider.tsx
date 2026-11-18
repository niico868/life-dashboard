import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { life } from '../lib/supabase'
import { dayKey, setCount, type Habit } from '../habits/data'
import { playAlert, showSimpleNotification } from '../work/notify'
import { DEFAULT_SETTINGS, loadSettings, nightDate, reminderAt, saveSettings, type NightSettings } from './settings'

type NightCtx = {
  steps: Habit[]
  done: Set<string>
  settings: NightSettings
  /** true once the reminder time has passed and steps are still open */
  nagging: boolean
  loaded: boolean
  toggle: (h: Habit) => Promise<void>
  updateSettings: (s: NightSettings) => Promise<void>
}

const Ctx = createContext<NightCtx | null>(null)
export const useNight = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('useNight must be used inside NightProvider')
  return c
}

/** Tell every screen that habit logs changed, so they reload. */
export const HABITS_CHANGED = 'habits-changed'
export const announceHabitsChanged = () => window.dispatchEvent(new Event(HABITS_CHANGED))

const NAG_LINES = [
  ['🌙 Night routine time', 'Knock out the list, then sleep.'],
  ['Still not done 👀', '{n} left. He doesn’t go to bed with loose ends.'],
  ['Hey. The list.', '{n} steps between you and your pillow.'],
  ['Not sleeping yet 😤', 'Get up, finish the {n}. Two minutes.'],
]

export function NightProvider({ children }: { children: ReactNode }) {
  const [steps, setSteps] = useState<Habit[]>([])
  const [done, setDone] = useState<Set<string>>(new Set())
  const [settings, setSettings] = useState<NightSettings>(DEFAULT_SETTINGS)
  const [now, setNow] = useState(Date.now())
  const [loaded, setLoaded] = useState(false)
  const lastNag = useRef<{ night: string; at: number; count: number } | null>(null)

  const load = useCallback(async () => {
    const night = nightDate()
    const { data: hs } = await life().from('habits').select('*')
      .eq('active', true).eq('kind', 'routine_step').eq('routine', 'night').order('sort_order')
    const todays = ((hs ?? []) as Habit[]).filter((h) => h.days_of_week.includes(night.getDay()))
    const { data: logs } = todays.length
      ? await life().from('habit_logs').select('habit_id').eq('log_date', dayKey(night)).in('habit_id', todays.map((h) => h.id))
      : { data: [] }
    setSteps(todays)
    setDone(new Set((logs ?? []).map((l) => l.habit_id)))
    setLoaded(true)
  }, [])

  useEffect(() => { void load(); loadSettings().then(setSettings).catch(() => {}) }, [load])
  useEffect(() => {
    window.addEventListener(HABITS_CHANGED, load)
    return () => window.removeEventListener(HABITS_CHANGED, load)
  }, [load])

  // Check every 30s. (If the night rolled over, reload the list.)
  const nightRef = useRef(dayKey(nightDate()))
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now())
      const k = dayKey(nightDate())
      if (k !== nightRef.current) { nightRef.current = k; void load() }
    }, 30_000)
    return () => clearInterval(id)
  }, [load])

  const left = steps.filter((s) => !done.has(s.id)).length
  const nagging = loaded && settings.night_reminder_on && steps.length > 0 && left > 0 && now >= reminderAt(settings, new Date(now)).getTime()

  // The nag: sound + notification at reminder time, then again every N minutes until done.
  useEffect(() => {
    if (!nagging) return
    const night = dayKey(nightDate(new Date(now)))
    const last = lastNag.current?.night === night ? lastNag.current : null
    if (last && now - last.at < settings.night_nag_minutes * 60_000) return
    const count = (last?.count ?? 0) + 1
    lastNag.current = { night, at: now, count }
    const [title, body] = NAG_LINES[Math.min(count - 1, NAG_LINES.length - 1)]
    playAlert('night')
    void showSimpleNotification(title, body.replace('{n}', String(left)), 'night')
  }, [nagging, now, left, settings.night_nag_minutes])

  const toggle = useCallback(async (h: Habit) => {
    const key = dayKey(nightDate())
    const wasDone = done.has(h.id)
    const flip = (on: boolean) => setDone((d) => { const n = new Set(d); if (on) n.add(h.id); else n.delete(h.id); return n })
    flip(!wasDone)
    if (!wasDone) navigator.vibrate?.(18)
    try { await setCount(h.id, key, wasDone ? 0 : 1); announceHabitsChanged() } catch { flip(wasDone) }
  }, [done])

  const updateSettings = useCallback(async (s: NightSettings) => {
    setSettings(s)
    lastNag.current = null
    await saveSettings(s)
  }, [])

  return <Ctx.Provider value={{ steps, done, settings, nagging, loaded, toggle, updateSettings }}>{children}</Ctx.Provider>
}
