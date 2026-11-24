import type { StandardKind } from './types'
import { stripSubject } from '../lib/voice'

export const AREAS = [
  { id: 'body', label: 'Body', emoji: '💪', prompt: 'How do I treat my body?', examples: ['I work out twice a day', 'I sleep by 11pm', 'I drink 2L of water a day'] },
  { id: 'food', label: 'Food', emoji: '🥗', prompt: 'What do I eat, and what do I skip?', examples: ["I don't eat chicken", 'I cook at home most days', 'No fast food on weekdays'] },
  { id: 'mind', label: 'Mind', emoji: '🧠', prompt: 'How do I feed my mind?', examples: ['I read 20 minutes a day', 'I meditate every morning', 'I journal before bed'] },
  { id: 'beliefs', label: 'Beliefs', emoji: '🧭', prompt: 'What do I believe about myself and my life?', examples: ['I am the luckiest man walking', 'Everything is working in my favour', "I don't talk down on myself"] },
  { id: 'money', label: 'Money', emoji: '💰', prompt: 'How do I handle money?', examples: ['I log every expense', 'I save 20% of what comes in', "I don't impulse buy"] },
  { id: 'home', label: 'Home & organisation', emoji: '🏠', prompt: 'What does my space look like?', examples: ['I make the bed every morning', 'I do the dishes before bed', 'I keep the desk clear'] },
  { id: 'vices', label: 'Vices', emoji: '🚬', prompt: 'What do I cut out, or keep in check?', examples: ["I don't smoke cigarettes", 'Weed on occasion', 'I drink only on weekends'] },
  { id: 'style', label: 'Style', emoji: '👔', prompt: 'How do I show up looking?', examples: ["I lay out tomorrow's outfit", 'I keep my shoes clean', 'I get a trim every 2 weeks'] },
  { id: 'work', label: 'Work', emoji: '💻', prompt: 'How do I work?', examples: ['I code 2 hours a day', 'I answer clients within a day', 'I plan tomorrow tonight'] },
  { id: 'relationships', label: 'Relationships', emoji: '❤️', prompt: 'How do I treat my people?', examples: ['I call family every week', 'No phone at the dinner table', 'I show up when I say I will'] },
] as const

export type AreaId = (typeof AREAS)[number]['id']
export const areaOf = (id: string) => AREAS.find((a) => a.id === id) ?? { id, label: id, emoji: '⭐', prompt: '', examples: [] }

export const NIGHT_PRESETS = [
  'Brush teeth', 'Wash face', 'Charge phone', "Lay out tomorrow's outfit", 'Set alarm',
  'Plan tomorrow', 'Tidy the desk', 'Skincare', 'Lock up', 'Fill water bottle',
]

/** Guess do / don't / limit from how a standard is written. */
export function guessKind(text: string): StandardKind {
  const t = stripSubject(text).toLowerCase()
  if (/^(doesn'?t|does not|don'?t|do not|never|no |not |avoids?|quits?)/.test(t)) return 'dont'
  if (/(on occasion|occasionally|only on|only |at most|max|limit|no more than|sometimes|in moderation)/.test(t)) return 'limit'
  return 'do'
}

export const KIND_META: Record<StandardKind, { label: string; mark: string; color: string }> = {
  do: { label: 'do', mark: '✓', color: '#81b29a' },
  dont: { label: "don't", mark: '✗', color: '#e07a5f' },
  limit: { label: 'limit', mark: '~', color: '#f2cc8f' },
}
