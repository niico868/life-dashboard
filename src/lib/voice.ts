/**
 * Everything in the app speaks as "I". Standards may be written either way
 * ("works out twice a day", "he works out", "I work out"), so we translate on display.
 */

const IRREGULAR: Record<string, string> = {
  is: 'am', "isn't": "am not", has: 'have', "hasn't": "haven't", does: 'do', "doesn't": "don't",
  was: 'was', "wasn't": "wasn't", goes: 'go',
}

/** "works" → "work", "watches" → "watch", "tries" → "try". */
function baseVerb(w: string) {
  const lower = w.toLowerCase()
  if (IRREGULAR[lower]) return IRREGULAR[lower]
  if (/(ss|sh|ch|x|z|o)es$/.test(lower)) return w.slice(0, -2)
  if (/[^aeiou]ies$/.test(lower)) return w.slice(0, -3) + 'y'
  if (/[^s]s$/.test(lower)) return w.slice(0, -1)
  return w
}

const isVerb = (w: string) => !!IRREGULAR[w.toLowerCase()] || /[^s's]s$/i.test(w) || /^(believes|lives|loves|does)$/i.test(w)
const capitalise = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** Remove a leading subject ("he", "I") so rules can match the verb. */
export function stripSubject(text: string) {
  return text.trim().replace(/^(he|i)\s+/i, '').replace(/^(he's|i'm)\s+/i, 'is ')
}

/** Turn a third-person or subject-less statement into first person. */
export function toFirstPerson(text: string) {
  let t = text.trim()
  if (!t) return t
  if (/^(i|i'm|i've|i'll|my|me)\b/i.test(t)) return capitalise(t)
  // Leading verb (with or without "he"): convert the first verb.
  t = t.replace(/^he's\s+/i, "I'm ").replace(/^he\s+/i, '')
  if (!/^I'm /.test(t)) {
    const words = t.split(/\s+/)
    // "never smokes", "always shows up": keep the adverb, convert the verb after it.
    const adv = /^(never|always|only|rarely|still|also)$/i.test(words[0]) ? 1 : 0
    if (isVerb(words[adv] ?? '')) {
      words[adv] = baseVerb(words[adv])
      t = ['I', ...words].join(' ')
    } else {
      // A noun phrase ("weed on occasion", "no phone at dinner") reads fine on its own.
      return capitalise(t)
    }
  }
  // Remaining pronouns.
  t = t
    .replace(/\bhe is\b/gi, 'I am').replace(/\bhe's\b/gi, "I'm").replace(/\bhe\b/gi, 'I')
    .replace(/\bhimself\b/gi, 'myself').replace(/\bhim\b/gi, 'me').replace(/\bhis\b/gi, 'my')
  // After "I", fix verbs in "I believe I is"-style chains.
  t = t.replace(/\bI (is)\b/g, 'I am').replace(/\bI (has)\b/g, 'I have')
  return t
}

/** A full paragraph ("He wakes up at 5. His day starts…") → first person, sentence by sentence. */
export function paragraphToFirstPerson(text: string) {
  if (!/\b(he|his|him)\b/i.test(text)) return text
  return text.replace(/\bHe's\b/g, "I'm").replace(/\bhe's\b/g, "I'm")
    .replace(/\b(He|he) (\w+)/g, (_m, _h, v: string) => `I ${baseVerb(v)}`)
    .replace(/\bhimself\b/gi, 'myself').replace(/\bhim\b/gi, 'me').replace(/\bHis\b/g, 'My').replace(/\bhis\b/g, 'my')
}
