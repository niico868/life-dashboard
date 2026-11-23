import { newKey, type HabitDraft, type HabitKind, type Routine, type StandardDraft } from './types'

/** Pull a per-day count out of text: "twice a day" → 2, "3 times" → 3. */
export function parseTimesPerDay(text: string): number | null {
  const t = text.toLowerCase()
  if (/\btwice\b/.test(t)) return 2
  if (/\b(three|3) times\b/.test(t)) return 3
  const m = t.match(/\b(\d+)\s*(x|times)\b/)
  if (m) return Math.min(12, Number(m[1]))
  return null
}

type Rule = { test: RegExp; name: string; kind?: HabitKind; routine?: Routine; times?: number }

// "do" standards: keyword → a concrete, tickable habit.
const DO_RULES: Rule[] = [
  { test: /work ?s? ?out|gym|exercise|train/, name: 'Workout' },
  { test: /\brun|jog/, name: 'Go for a run' },
  { test: /water/, name: 'Drink a bottle of water', times: 4 },
  { test: /sleep|bed by|in bed/, name: 'In bed on time', routine: 'night' },
  { test: /read/, name: 'Read 20 minutes' },
  { test: /meditat/, name: 'Meditate', routine: 'morning' },
  { test: /journal/, name: 'Journal', routine: 'night' },
  { test: /cook/, name: 'Cook a meal at home' },
  { test: /expense|log.*spend|track.*money|budget/, name: 'Log today’s spending', routine: 'night' },
  { test: /sav(e|es|ing)/, name: 'Move money to savings' },
  { test: /make.*bed/, name: 'Make the bed', kind: 'chore', routine: 'morning' },
  { test: /dish/, name: 'Do the dishes', kind: 'chore', routine: 'night' },
  { test: /laundry|clothes washed/, name: 'Laundry', kind: 'chore' },
  { test: /desk|tidy|clean|organi[sz]/, name: 'Tidy up for 10 minutes', kind: 'chore' },
  { test: /outfit/, name: "Lay out tomorrow's outfit", routine: 'night' },
  { test: /shoe/, name: 'Wipe down shoes', kind: 'chore' },
  { test: /trim|groom|haircut/, name: 'Grooming check', kind: 'chore' },
  { test: /\bcode|coding|programm/, name: 'Deep-work coding block' },
  { test: /plan/, name: 'Plan tomorrow', routine: 'night' },
  { test: /client|email|inbox/, name: 'Clear client messages' },
  { test: /call|family|mum|mom|dad/, name: 'Reach out to family' },
  { test: /phone/, name: 'Phone away at meals' },
]

const DONT_RULES: Rule[] = [
  { test: /smok|cigarette/, name: 'Smoke-free today' },
  { test: /drink|alcohol|rum|beer/, name: 'No alcohol today' },
  { test: /impulse|buy|spend/, name: 'No impulse buys today' },
  { test: /fast food/, name: 'No fast food today' },
  { test: /phone|scroll|social/, name: 'No mindless scrolling' },
]

const CHORE_AREAS = new Set(['home'])

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Turn one standard into suggested habits/chores. Always editable after. */
export function suggestHabits(s: StandardDraft): HabitDraft[] {
  const text = s.statement.toLowerCase().trim()
  if (!text) return []
  // Beliefs are covered by the morning affirmation, not separate habits.
  if (s.area === 'beliefs') return []
  const base = { key: newKey(), standardKey: s.key, routine: 'anytime' as Routine, times_per_day: 1 }

  if (s.kind === 'dont') {
    const rule = DONT_RULES.find((r) => r.test.test(text))
    if (rule) return [{ ...base, name: rule.name, kind: 'habit' }]
    // "doesn't eat chicken" → "Didn't eat chicken today"; "no sugar" → "Stayed clear: no sugar"
    const neg = /^(doesn'?t|does not|don'?t|do not|never)\s+/
    const name = neg.test(text) ? `Didn't ${text.replace(neg, '')} today` : `Stayed clear: ${text}`
    return [{ ...base, name, kind: 'habit' }]
  }

  if (s.kind === 'limit') {
    return [{ ...base, name: `Kept in check: ${text}`, kind: 'habit' }]
  }

  const rule = DO_RULES.find((r) => r.test.test(text))
  const times = parseTimesPerDay(text) ?? rule?.times ?? s.target_per_day ?? 1
  return [{
    ...base,
    name: rule?.name ?? cap(text.replace(/^he\s+/, '')),
    kind: rule?.kind ?? (CHORE_AREAS.has(s.area) ? 'chore' : 'habit'),
    routine: rule?.routine ?? 'anytime',
    times_per_day: times,
  }]
}
