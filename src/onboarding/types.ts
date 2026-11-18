export type StandardKind = 'do' | 'dont' | 'limit'
export type HabitKind = 'habit' | 'chore' | 'routine_step'
export type Routine = 'morning' | 'night' | 'anytime'

/** Drafts carry a local `key`; `id` is set once the row exists in Supabase. */
export type StandardDraft = { key: string; id?: string; area: string; statement: string; kind: StandardKind; target_per_day: number | null }
export type HabitDraft = { key: string; id?: string; standardKey: string | null; name: string; kind: HabitKind; routine: Routine; times_per_day: number }
export type VisionDraft = { id?: string; current_self: string; ideal_self: string; why: string }

export type Draft = { vision: VisionDraft; standards: StandardDraft[]; habits: HabitDraft[]; night: HabitDraft[] }

export const newKey = () => crypto.randomUUID()
