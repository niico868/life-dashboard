import { life } from '../lib/supabase'
import { addDays, dayKey, streak, type Habit, type LogMap } from './data'

/** Days in a row a chore must be hit before we offer a bigger one. */
export const LEVEL_UP_STREAK = 7
const SNOOZE_DAYS = 7

// Known chores → their next step up.
const LADDER: [RegExp, string][] = [
  [/^make the bed$/i, 'Make the bed + clear the nightstand'],
  [/^do the dishes$/i, 'Dishes + wipe down the counters'],
  [/^laundry$/i, 'Laundry: wash, fold AND put away'],
  [/^wipe down shoes$/i, 'Clean and condition one pair of shoes'],
  [/^grooming check$/i, 'Full grooming routine (beard, nails, skin)'],
]

/** Suggest the bigger version of a chore. "10 minutes" doubles; known chores climb the ladder. */
export function suggestNextLevel(h: Habit) {
  const rung = LADDER.find(([re]) => re.test(h.name.trim()))
  if (rung) return rung[1]
  const mins = h.name.match(/(\d+)\s*(min|minutes)/i)
  if (mins) return h.name.replace(mins[0], `${Math.min(Number(mins[1]) * 2, 60)} ${mins[2]}`)
  return `${h.name}, plus one more step`
}

export type LevelHabit = Habit & { levelled_from?: string | null; level_up_snoozed_until?: string | null }

/** Chores with a long enough streak that haven't been snoozed. */
export function readyToLevel(habits: LevelHabit[], logs: LogMap, today = new Date()) {
  const t = dayKey(today)
  return habits.filter((h) =>
    h.kind === 'chore' &&
    streak(logs, h, today) >= LEVEL_UP_STREAK &&
    !(h.level_up_snoozed_until && h.level_up_snoozed_until > t))
}

/** Switch the old chore off and start the new, bigger one at level + 1. */
export async function levelUp(h: LevelHabit, newName: string) {
  const db = life()
  const { error: e1 } = await db.from('habits').insert({
    standard_id: h.standard_id, name: newName.trim() || h.name, kind: 'chore', routine: h.routine,
    level: h.level + 1, times_per_day: h.times_per_day, days_of_week: h.days_of_week,
    sort_order: h.sort_order, levelled_from: h.id,
  })
  if (e1) throw e1
  const { error: e2 } = await db.from('habits').update({ active: false }).eq('id', h.id)
  if (e2) throw e2
}

export async function snoozeLevelUp(h: Habit) {
  const { error } = await life().from('habits')
    .update({ level_up_snoozed_until: dayKey(addDays(new Date(), SNOOZE_DAYS)) }).eq('id', h.id)
  if (error) throw error
}
