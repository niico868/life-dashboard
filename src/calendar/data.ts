import { life } from '../lib/supabase'

export type EventKind = 'client' | 'meeting' | 'social' | 'errand' | 'other'
export type CalEvent = {
  id: string; title: string; kind: EventKind; starts_at: string; ends_at: string
  location: string | null; notes: string | null; rating: number | null; rating_note: string | null
}
export type Prep = { id?: string; key: string; event_id?: string; label: string; due_offset_minutes: number; done: boolean; sort_order: number }
export type EventWithPrep = CalEvent & { prep: Prep[] }

export const KINDS: Record<EventKind, { label: string; emoji: string; color: string }> = {
  client: { label: 'Client', emoji: '🤝', color: '#e07a5f' },
  meeting: { label: 'Meeting', emoji: '🗣️', color: '#8fb8de' },
  social: { label: 'Social', emoji: '🎉', color: '#f2cc8f' },
  errand: { label: 'Errand', emoji: '🛒', color: '#81b29a' },
  other: { label: 'Other', emoji: '📌', color: '#c9b8a6' },
}

const H = 60, D = 24 * 60
/** Planning ahead, baked in. Offsets are minutes before the start. */
export const TEMPLATES: Record<EventKind, [string, number][]> = {
  client: [
    ['Write talking points', 2 * D], ['Prep the sheet work / proposal', 1 * D], ['Confirm time with the client', 1 * D],
    ['Lay out the outfit', 12 * H], ['Charge phone + laptop', 3 * H], ['Leave on time', 45],
  ],
  meeting: [['Jot an agenda / what I want out of it', 1 * D], ['Lay out the outfit', 12 * H], ['Charge phone', 2 * H], ['Leave on time', 30]],
  social: [['Pick the outfit', 4 * H], ['Charge phone', 2 * H], ['Leave on time', 30]],
  errand: [['Write the list', 2 * H], ['Charge phone', 1 * H], ['Leave on time', 15]],
  other: [['Charge phone', 2 * H], ['Leave on time', 30]],
}

export const OFFSET_CHOICES: [number, string][] = [
  [15, '15 min before'], [30, '30 min before'], [45, '45 min before'], [H, '1h before'], [2 * H, '2h before'],
  [3 * H, '3h before'], [4 * H, '4h before'], [12 * H, 'night before'], [D, '1 day before'], [2 * D, '2 days before'], [7 * D, '1 week before'],
]
export const offsetLabel = (m: number) => OFFSET_CHOICES.find(([v]) => v === m)?.[1] ?? `${Math.round(m / 60)}h before`

export const newKey = () => crypto.randomUUID()
export const templatePrep = (k: EventKind): Prep[] =>
  TEMPLATES[k].map(([label, due], i) => ({ key: newKey(), label, due_offset_minutes: due, done: false, sort_order: i }))

export const dueAt = (e: CalEvent, p: Prep) => new Date(new Date(e.starts_at).getTime() - p.due_offset_minutes * 60_000)

export async function loadEvents(from: Date, to: Date): Promise<EventWithPrep[]> {
  const { data, error } = await life().from('events').select('*, event_prep(*)')
    .gte('starts_at', from.toISOString()).lt('starts_at', to.toISOString()).order('starts_at')
  if (error) throw error
  return (data ?? []).map((e) => ({
    ...e,
    prep: ((e.event_prep ?? []) as Prep[]).map((p) => ({ ...p, key: p.id! })).sort((a, b) => a.sort_order - b.sort_order),
  }))
}

/** Past events that ended but haven't been rated yet (last 2 weeks). */
export async function loadUnrated(): Promise<CalEvent[]> {
  const since = new Date(Date.now() - 14 * D * 60_000)
  const { data } = await life().from('events').select('*').is('rating', null)
    .lt('ends_at', new Date().toISOString()).gte('ends_at', since.toISOString()).order('ends_at', { ascending: false })
  return (data ?? []) as CalEvent[]
}

export async function loadRatingStats() {
  const since = new Date(Date.now() - 30 * D * 60_000)
  const { data } = await life().from('events').select('kind, rating').not('rating', 'is', null).gte('starts_at', since.toISOString())
  return (data ?? []) as { kind: EventKind; rating: number }[]
}

export async function saveEvent(e: Omit<CalEvent, 'id' | 'rating' | 'rating_note'> & { id?: string }, prep: Prep[]) {
  const row = { title: e.title.trim(), kind: e.kind, starts_at: e.starts_at, ends_at: e.ends_at, location: e.location || null, notes: e.notes || null }
  const res = e.id
    ? await life().from('events').update(row).eq('id', e.id).select('id').single()
    : await life().from('events').insert(row).select('id').single()
  if (res.error) throw res.error
  const eventId = res.data.id as string

  const keep = prep.filter((p) => p.label.trim())
  const existingIds = keep.filter((p) => p.id).map((p) => p.id!)
  let del = life().from('event_prep').delete().eq('event_id', eventId)
  if (existingIds.length) del = del.not('id', 'in', `(${existingIds.join(',')})`)
  const d = await del
  if (d.error) throw d.error
  for (const [i, p] of keep.entries()) {
    const r = { label: p.label.trim(), due_offset_minutes: p.due_offset_minutes, done: p.done, sort_order: i }
    const q = p.id ? await life().from('event_prep').update(r).eq('id', p.id) : await life().from('event_prep').insert({ ...r, event_id: eventId })
    if (q.error) throw q.error
  }
  return eventId
}

export async function deleteEvent(id: string) {
  const { error } = await life().from('events').delete().eq('id', id)
  if (error) throw error
}

export async function setPrepDone(id: string, done: boolean) {
  const { error } = await life().from('event_prep').update({ done }).eq('id', id)
  if (error) throw error
}

export async function rateEvent(id: string, rating: number, note: string) {
  const { error } = await life().from('events').update({ rating, rating_note: note.trim() || null }).eq('id', id)
  if (error) throw error
}
