import { life } from '../lib/supabase'

export type Fuel = { id: string; url: string | null; title: string; takeaways: string[]; created_at: string }

export async function loadFuel() {
  const { data, error } = await life().from('fuel').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Fuel[]
}

export async function addFuel(f: { url: string; title: string; takeaways: string[] }) {
  const { error } = await life().from('fuel').insert({ url: f.url.trim() || null, title: f.title.trim(), takeaways: f.takeaways.map((t) => t.trim()).filter(Boolean) })
  if (error) throw error
}

export async function deleteFuel(id: string) {
  const { error } = await life().from('fuel').delete().eq('id', id)
  if (error) throw error
}

/** One takeaway per day, the same all day, cycling through everything saved. */
export function takeawayOfDay(all: Fuel[], date = new Date()) {
  const pool = all.flatMap((f) => f.takeaways)
  if (!pool.length) return null
  const day = Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86_400_000)
  return pool[day % pool.length]
}
