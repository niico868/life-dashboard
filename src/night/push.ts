import { life } from '../lib/supabase'

const PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
export const pushAvailable = () => !!PUBLIC_KEY && 'PushManager' in window && 'serviceWorker' in navigator

function b64ToBytes(b64: string) {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

export async function isPushOn() {
  if (!pushAvailable()) return false
  const reg = await navigator.serviceWorker.ready
  return !!(await reg.pushManager.getSubscription())
}

/** Sign this device up for push and save the "address" in Supabase. */
export async function enablePush() {
  if (!pushAvailable()) throw new Error('Push is not available here')
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('Notifications are blocked for this site')
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(PUBLIC_KEY!) }))
  const j = sub.toJSON()
  const { error } = await life().from('push_subscriptions')
    .upsert({ endpoint: sub.endpoint, p256dh: j.keys!.p256dh, auth: j.keys!.auth }, { onConflict: 'endpoint' })
  if (error) throw error
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  await life().from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}
