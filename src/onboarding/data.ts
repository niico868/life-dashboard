import { life } from '../lib/supabase'
import { newKey, type Draft, type HabitDraft, type StandardDraft } from './types'
import { parseTimesPerDay } from './suggest'

export const emptyDraft = (): Draft => ({ vision: { current_self: '', ideal_self: '', why: '' }, standards: [], habits: [], night: [] })

/** True once onboarding has been saved at least once. */
export async function hasVision() {
  const { count } = await life().from('vision').select('id', { count: 'exact', head: true })
  return (count ?? 0) > 0
}

/** Load what's saved so a redo starts pre-filled (edit in place). */
export async function loadDraft(): Promise<Draft> {
  const [v, s, h] = await Promise.all([
    life().from('vision').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    life().from('standards').select('*').eq('active', true).order('sort_order'),
    life().from('habits').select('*').eq('active', true).order('sort_order'),
  ])
  const d = emptyDraft()
  if (v.data) d.vision = { id: v.data.id, current_self: v.data.current_self ?? '', ideal_self: v.data.ideal_self ?? '', why: v.data.why ?? '' }
  const keyById = new Map<string, string>()
  d.standards = (s.data ?? []).map((r) => {
    const key = newKey(); keyById.set(r.id, key)
    return { key, id: r.id, area: r.area, statement: r.statement, kind: r.kind, target_per_day: r.target_per_day }
  })
  for (const r of h.data ?? []) {
    const hd: HabitDraft = { key: newKey(), id: r.id, standardKey: r.standard_id ? keyById.get(r.standard_id) ?? null : null, name: r.name, kind: r.kind, routine: r.routine, times_per_day: r.times_per_day }
    if (r.kind === 'routine_step' && r.routine === 'night') d.night.push(hd)
    else d.habits.push(hd)
  }
  return d
}

/**
 * Save the whole draft. Rows that exist get updated, new rows get inserted,
 * and rows that were removed are switched off (active = false) so history stays.
 */
export async function saveDraft(d: Draft) {
  const db = life()
  const vision = { current_self: d.vision.current_self, ideal_self: d.vision.ideal_self, why: d.vision.why, updated_at: new Date().toISOString() }
  const vr = d.vision.id
    ? await db.from('vision').update(vision).eq('id', d.vision.id)
    : await db.from('vision').insert(vision)
  if (vr.error) throw vr.error

  // Standards
  const idByKey = new Map<string, string>()
  const keptStandardIds: string[] = []
  for (const [i, s] of d.standards.entries()) {
    const row = { area: s.area, statement: s.statement.trim(), kind: s.kind, target_per_day: s.target_per_day ?? parseTimesPerDay(s.statement), sort_order: i, active: true }
    const id = await upsertRow('standards', s, row)
    idByKey.set(s.key, id); keptStandardIds.push(id)
  }
  await deactivateOthers('standards', keptStandardIds)

  // Habits + nightly routine steps
  const keptHabitIds: string[] = []
  const all: HabitDraft[] = [
    ...d.habits,
    ...d.night.map((n) => ({ ...n, kind: 'routine_step' as const, routine: 'night' as const, times_per_day: 1 })),
  ]
  for (const [i, h] of all.entries()) {
    if (!h.name.trim()) continue
    const row = {
      name: h.name.trim(), kind: h.kind, routine: h.routine, times_per_day: h.times_per_day, sort_order: i, active: true,
      standard_id: h.standardKey ? idByKey.get(h.standardKey) ?? null : null,
    }
    keptHabitIds.push(await upsertRow('habits', h, row))
  }
  await deactivateOthers('habits', keptHabitIds)
}

async function upsertRow(table: 'standards' | 'habits', draft: StandardDraft | HabitDraft, row: Record<string, unknown>) {
  if (draft.id) {
    const { error } = await life().from(table).update(row).eq('id', draft.id)
    if (error) throw error
    return draft.id
  }
  const { data, error } = await life().from(table).insert(row).select('id').single()
  if (error) throw error
  return data.id as string
}

async function deactivateOthers(table: 'standards' | 'habits', keep: string[]) {
  let q = life().from(table).update({ active: false }).eq('active', true)
  if (keep.length) q = q.not('id', 'in', `(${keep.join(',')})`)
  const { error } = await q
  if (error) throw error
}
