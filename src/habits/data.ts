import { life } from '../lib/supabase'
import type { HabitKind, Routine, StandardKind } from '../onboarding/types'

export type Habit = {
  id: string; standard_id: string | null; name: string; kind: HabitKind; routine: Routine
  level: number; times_per_day: number; days_of_week: number[]; sort_order: number
}
export type Standard = { id: string; area: string; statement: string; kind: StandardKind }
/** habit_id → (YYYY-MM-DD → count) */
export type LogMap = Map<string, Map<string, number>>

/** Score window for the discipline score. */
export const SCORE_DAYS = 14
const HISTORY_DAYS = 120

/** Local calendar date as YYYY-MM-DD (not UTC, so late nights in T&T land on the right day). */
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }

export const isScheduled = (h: Habit, d: Date) => h.days_of_week.includes(d.getDay())

export async function loadHabits() {
  const since = dayKey(addDays(new Date(), -HISTORY_DAYS))
  const [h, s, l] = await Promise.all([
    life().from('habits').select('*').eq('active', true).order('sort_order'),
    life().from('standards').select('id, area, statement, kind').eq('active', true).order('sort_order'),
    life().from('habit_logs').select('habit_id, log_date, count').gte('log_date', since),
  ])
  if (h.error) throw h.error
  const logs: LogMap = new Map()
  for (const r of l.data ?? []) {
    if (!logs.has(r.habit_id)) logs.set(r.habit_id, new Map())
    logs.get(r.habit_id)!.set(r.log_date, r.count)
  }
  return { habits: (h.data ?? []) as Habit[], standards: (s.data ?? []) as Standard[], logs }
}

/** Save a day's count for a habit (0 removes the log). */
export async function setCount(habitId: string, date: string, count: number) {
  const q = count <= 0
    ? life().from('habit_logs').delete().eq('habit_id', habitId).eq('log_date', date)
    : life().from('habit_logs').upsert({ habit_id: habitId, log_date: date, count }, { onConflict: 'habit_id,log_date' })
  const { error } = await q
  if (error) throw error
}

const countOn = (logs: LogMap, h: Habit, d: Date) => logs.get(h.id)?.get(dayKey(d)) ?? 0
export const isDone = (logs: LogMap, h: Habit, d: Date) => countOn(logs, h, d) >= h.times_per_day

/**
 * Streak = scheduled days in a row that were fully done.
 * Today only counts once it's done; an unfinished today doesn't break the streak yet.
 */
export function streak(logs: LogMap, h: Habit, today = new Date()) {
  let n = 0
  let d = isDone(logs, h, today) ? today : addDays(today, -1)
  for (let i = 0; i < HISTORY_DAYS; i++, d = addDays(d, -1)) {
    if (!isScheduled(h, d)) continue
    if (!isDone(logs, h, d)) break
    n++
  }
  return n
}

/** 0–100: how much of what was scheduled got done over the last SCORE_DAYS (partial counts give partial credit). */
export function discipline(logs: LogMap, habits: Habit[], today = new Date()) {
  let due = 0, got = 0
  for (const h of habits) {
    for (let i = 0; i < SCORE_DAYS; i++) {
      const d = addDays(today, -i)
      if (!isScheduled(h, d)) continue
      // Today counts only for what's already done, so the morning doesn't tank your score.
      const c = Math.min(countOn(logs, h, d), h.times_per_day) / h.times_per_day
      if (i === 0 && c < 1) { got += c; due += c; continue }
      due += 1; got += c
    }
  }
  return due ? Math.round((got / due) * 100) : null
}
