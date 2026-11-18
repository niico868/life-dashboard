/// <reference lib="webworker" />
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
// Offline shell: every navigation gets index.html.
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting() })

// Check-in notification replies → hand to the open app (it holds the login session).
self.addEventListener('notificationclick', (event) => {
  const e = event as NotificationEvent & { reply?: string | null }
  e.notification.close()
  // Plain notifications (night routine, pomodoro): just open the right screen.
  const url = e.notification.data?.url as string | undefined
  if (e.notification.tag !== 'checkin') {
    e.waitUntil((async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const c = all[0] as WindowClient | undefined
      if (c) { await c.focus(); if (url) await c.navigate(url).catch(() => {}) }
      else await self.clients.openWindow(url ?? '/')
    })())
    return
  }
  const sessionId = e.notification.data?.sessionId as string | undefined
  const reply = e.reply?.trim()
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    if (reply && sessionId) {
      if (all.length) {
        all[0].postMessage({ type: 'checkin-reply', sessionId, body: reply })
        return
      }
      await self.clients.openWindow(`/work?reply=${encodeURIComponent(reply)}&session=${sessionId}`)
      return
    }
    // Tapped without replying: open the check-in in the app.
    if (all.length) { await (all[0] as WindowClient).focus(); all[0].postMessage({ type: 'checkin-open' }) }
    else await self.clients.openWindow('/work?checkin=1')
  })())
})
