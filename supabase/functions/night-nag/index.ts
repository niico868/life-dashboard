// Runs every 5 minutes (pg_cron). Sends a Web Push to anyone whose night routine
// is past its reminder time and still has unticked steps.
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'
import webpush from 'npm:web-push@3.6.7'

const NAGS = [
  ['🌙 Night routine time', 'Knock out the list, then sleep.'],
  ['Still not done 👀', '{n} left. He doesn’t go to bed with loose ends.'],
  ['Not sleeping yet 😤', 'Get up, finish the {n}. Two minutes.'],
]

/** The user's local wall-clock parts in their time zone. */
function localParts(tz: string, d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d).map((x) => [x.type, x.value]))
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute }
}

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'life' } })

  const { data: ok } = await db.rpc('check_cron_secret', { candidate: req.headers.get('x-cron-secret') ?? '' })
  if (!ok) return new Response('forbidden', { status: 403 })

  const pub = Deno.env.get('VAPID_PUBLIC_KEY'), priv = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!pub || !priv) return new Response('VAPID keys not set yet', { status: 200 })
  webpush.setVapidDetails('mailto:life-dashboard@example.com', pub, priv)

  const { data: users } = await db.from('user_settings').select('*').eq('night_reminder_on', true)
  let sent = 0
  for (const u of users ?? []) {
    const t = localParts(u.timezone)
    const [rh, rm] = String(u.night_reminder_time).split(':').map(Number)
    // Before 4am still counts as last night.
    const pastReminder = t.h < 4 || t.h * 60 + t.min >= rh * 60 + rm
    if (!pastReminder) continue
    if (u.last_night_push_at && Date.now() - new Date(u.last_night_push_at).getTime() < u.night_nag_minutes * 60_000 - 30_000) continue

    const night = new Date(Date.UTC(t.y, t.m - 1, t.h < 4 ? t.d - 1 : t.d))
    const nightKey = night.toISOString().slice(0, 10)
    const { data: steps } = await db.from('habits').select('id, days_of_week')
      .eq('user_id', u.user_id).eq('active', true).eq('kind', 'routine_step').eq('routine', 'night')
    const todays = (steps ?? []).filter((s) => s.days_of_week.includes(night.getUTCDay()))
    if (!todays.length) continue
    const { data: logs } = await db.from('habit_logs').select('habit_id')
      .eq('log_date', nightKey).in('habit_id', todays.map((s) => s.id))
    const left = todays.length - new Set((logs ?? []).map((l) => l.habit_id)).size
    if (left <= 0) continue

    // Which nag is this tonight? (resets when the previous push was a different night)
    const minsSinceReminder = t.h < 4 ? (24 * 60 - (rh * 60 + rm)) + t.h * 60 + t.min : t.h * 60 + t.min - (rh * 60 + rm)
    const n = Math.min(Math.floor(minsSinceReminder / u.night_nag_minutes), NAGS.length - 1)
    const [title, body] = NAGS[n]
    const payload = JSON.stringify({ title, body: body.replace('{n}', String(left)), tag: 'night', url: '/night' })

    const { data: subs } = await db.from('push_subscriptions').select('*').eq('user_id', u.user_id)
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
        sent++
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) await db.from('push_subscriptions').delete().eq('id', s.id) // phone unsubscribed
      }
    }
    await db.from('user_settings').update({ last_night_push_at: new Date().toISOString() }).eq('user_id', u.user_id)
  }
  return Response.json({ sent })
})
