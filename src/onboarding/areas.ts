import type { StandardKind } from './types'

export const AREAS = [
  { id: 'body', label: 'Body', emoji: '💪', prompt: 'How does he treat his body?', examples: ['works out twice a day', 'sleeps by 11pm', 'drinks 2L of water a day'] },
  { id: 'food', label: 'Food', emoji: '🥗', prompt: 'What does he eat, and what does he skip?', examples: ["doesn't eat chicken", 'cooks at home most days', 'no fast food on weekdays'] },
  { id: 'mind', label: 'Mind', emoji: '🧠', prompt: 'How does he feed his mind?', examples: ['reads 20 minutes a day', 'meditates every morning', 'journals before bed'] },
  { id: 'beliefs', label: 'Beliefs', emoji: '🧭', prompt: 'What does he believe about himself and his life?', examples: ['believes he is the luckiest man walking', 'believes everything is working in his favour', "doesn't talk down on himself"] },
  { id: 'money', label: 'Money', emoji: '💰', prompt: 'How does he handle money?', examples: ['logs every expense', 'saves 20% of what comes in', "doesn't impulse buy"] },
  { id: 'home', label: 'Home & organisation', emoji: '🏠', prompt: 'What does his space look like?', examples: ['makes the bed every morning', 'does the dishes before bed', 'keeps the desk clear'] },
  { id: 'vices', label: 'Vices', emoji: '🚬', prompt: 'What does he cut out, or keep in check?', examples: ["doesn't smoke cigarettes", 'weed on occasion', 'drinks only on weekends'] },
  { id: 'style', label: 'Style', emoji: '👔', prompt: 'How does he show up looking?', examples: ["lays out tomorrow's outfit", 'keeps his shoes clean', 'gets a trim every 2 weeks'] },
  { id: 'work', label: 'Work', emoji: '💻', prompt: 'How does he work?', examples: ['codes 2 hours a day', 'answers clients within a day', 'plans tomorrow tonight'] },
  { id: 'relationships', label: 'Relationships', emoji: '❤️', prompt: 'How does he treat his people?', examples: ['calls family every week', 'no phone at the dinner table', 'shows up when he says he will'] },
] as const

export type AreaId = (typeof AREAS)[number]['id']
export const areaOf = (id: string) => AREAS.find((a) => a.id === id) ?? { id, label: id, emoji: '⭐', prompt: '', examples: [] }

export const NIGHT_PRESETS = [
  'Brush teeth', 'Wash face', 'Charge phone', "Lay out tomorrow's outfit", 'Set alarm',
  'Plan tomorrow', 'Tidy the desk', 'Skincare', 'Lock up', 'Fill water bottle',
]

/** Guess do / don't / limit from how a standard is written. */
export function guessKind(text: string): StandardKind {
  const t = text.toLowerCase().trim()
  if (/^(doesn'?t|does not|don'?t|do not|never|no |not |avoids|quits?)/.test(t)) return 'dont'
  if (/(on occasion|occasionally|only on|only |at most|max|limit|no more than|sometimes|in moderation)/.test(t)) return 'limit'
  return 'do'
}

export const KIND_META: Record<StandardKind, { label: string; mark: string; color: string }> = {
  do: { label: 'do', mark: '✓', color: '#81b29a' },
  dont: { label: "don't", mark: '✗', color: '#e07a5f' },
  limit: { label: 'limit', mark: '~', color: '#f2cc8f' },
}
