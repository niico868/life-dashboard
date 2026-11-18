import { life } from '../lib/supabase'

export type NightSettings = { night_reminder_time: string; night_nag_minutes: number; night_reminder_on: boolean }
export const DEFAULT_SETTINGS: NightSettings = { night_reminder_time: '21:30', night_nag_minutes: 15, night_reminder_on: true }

export async function loadSettings(): Promise<NightSettings> {
  const { data } = await life().from('user_settings').select('night_reminder_time, night_nag_minutes, night_reminder_on').maybeSingle()
  if (!data) return DEFAULT_SETTINGS
  return { ...data, night_reminder_time: String(data.night_reminder_time).slice(0, 5) }
}

export async function saveSettings(s: NightSettings) {
  const { error } = await life().from('user_settings').upsert({ ...s, updated_at: new Date().toISOString() })
  if (error) throw error
}

/** Before 4am still counts as last night: brushing your teeth at 12:30 belongs to yesterday's routine. */
export const NIGHT_CUTOFF_HOUR = 4
export function nightDate(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (now.getHours() < NIGHT_CUTOFF_HOUR) d.setDate(d.getDate() - 1)
  return d
}

/** When tonight's reminder goes off. */
export function reminderAt(s: NightSettings, now = new Date()) {
  const [h, m] = s.night_reminder_time.split(':').map(Number)
  const d = nightDate(now)
  d.setHours(h, m, 0, 0)
  return d
}
