/**
 * Notifications + sounds (work timer and night routine).
 * Every sound goes through playAlert(): the hook for custom alert sounds.
 * Drop an audio file in /public and map it here to swap one in, e.g.
 *   night: '/sounds/rooster.mp3'
 */
export type AlertKind = 'checkin' | 'pomodoro' | 'night'
export const ALERT_SOUNDS: Partial<Record<AlertKind, string>> = {}

const CHIMES: Record<AlertKind, number[]> = {
  checkin: [523, 784],
  pomodoro: [660, 880, 990],
  night: [880, 660, 880, 660, 523], // a bit more insistent
}

export function playAlert(kind: AlertKind) {
  const url = ALERT_SOUNDS[kind]
  if (url) { void new Audio(url).play().catch(() => {}); return }
  // Default: a soft two-note chime made with Web Audio, no file needed.
  try {
    const ctx = new AudioContext()
    const notes = CHIMES[kind]
    notes.forEach((f, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = f
      o.type = 'sine'
      const t = ctx.currentTime + i * 0.18
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
      o.connect(g).connect(ctx.destination)
      o.start(t)
      o.stop(t + 0.55)
    })
  } catch { /* audio not allowed yet */ }
}

export async function askNotificationPermission() {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'default') return Notification.requestPermission()
  return Notification.permission
}

/** Shows a check-in notification with a text reply box (where the browser supports it). */
export async function showCheckinNotification(sessionId: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker?.getRegistration()
  const options = {
    body: 'What are you working on right now?',
    tag: 'checkin',
    requireInteraction: true,
    icon: '/icon.svg',
    data: { sessionId },
    actions: [{ action: 'reply', type: 'text', title: 'Reply', placeholder: 'Right now I’m…' }],
  } as NotificationOptions
  if (reg) await reg.showNotification('Quick check-in ✏️', options)
  else new Notification('Quick check-in ✏️', options)
}

export async function showSimpleNotification(title: string, body: string, tag = 'pomodoro') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker?.getRegistration()
  if (reg) await reg.showNotification(title, { body, icon: '/icon.svg', tag, data: { url: tag === 'night' ? '/night' : '/work' } })
  else new Notification(title, { body })
}
