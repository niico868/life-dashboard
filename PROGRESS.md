# Progress

## Session 1e (18 Nov 2026): Chore levelling + push notifications

### What got built
- **Chore levelling:** after 7 days in a row on a chore, a 🆙 card on Habits offers a bigger version (e.g. "Make the bed" → "Make the bed + clear the nightstand", "10 minutes" → "20 minutes"). You can edit the suggestion. Level up retires the old chore and starts the new one at level + 1 (linked by `levelled_from`, so history stays). "Not yet" snoozes the offer for a week. **Phase 1 is now complete.**
- **Real push notifications (night routine):** the `night-nag` Supabase Edge Function runs every 5 minutes (pg_cron). If your routine is past reminder time with steps left, it pushes to your phone even when the app is closed. Turn it on per device: Night → ⏰ → "Push to this device".
- New: `life.push_subscriptions`; `timezone` + `last_night_push_at` on `life.user_settings`; `service_role` access to `life` (the server needed it).

### Nico to-do: finish push setup (one-time)
1. On the Chromebook, run `npx web-push generate-vapid-keys`. You get a Public Key and a Private Key.
2. Paste the **public** key into `.env.local` as `VITE_VAPID_PUBLIC_KEY=...` (and in Cloudflare Pages env vars when deployed). It is safe to share.
3. Store both keys as Edge Function secrets `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`: https://supabase.com/dashboard/project/kbghhdudnnyawbxfgdgi/functions/secrets. **Never** put the private key in the repo or the chat.


## Session 1d (18 Nov 2026): Nightly routine checker

### What got built
- **Night screen (`/night`):** a dark, starry evening view of your night routine. Tap to tick. Until the reminder time it says "N to go". After it, the unticked steps shake and it says "No sleep until it's done 😤". When it's all done: 🌕 "Goodnight, you earned it."
- **The nag:** at your reminder time (default 9:30pm) you get a chime and a notification, then again every 15 min (changeable) until every step is ticked. The messages get firmer each time.
- **Ticker banner:** while the routine is overdue, a scrolling 🌙 banner runs across the top of every other screen, linking to `/night`.
- **"Tonight" runs until 4am:** brushing your teeth at 12:30am still counts for last night.
- **Settings:** on the Night screen, tap ⏰ to set the time and nag interval or switch it off. Saved in the new `life.user_settings` table, so it follows you across devices.
- **Rooster hook:** in `src/work/notify.ts`, set `ALERT_SOUNDS.night = '/sounds/rooster.mp3'` and drop the file in `public/sounds/`.

### Limitation
Reminders fire only while the app is open or in the background (or with the floating timer up). Alerts with the app fully closed need Web Push from a server (Supabase Edge Function + cron, free tier). Not built yet.


## Session 1c (18 Nov 2026): Habits screen

### What got built
- **Habits (`/habits`):** today's habits, chores and night routine steps, grouped 🌅 Morning / ☀️ Any time / 🌙 Night. Only the ones scheduled for today's weekday appear.
- **Tick-offs:** tap the hand-drawn circle and the check draws itself in, with a confetti pop and a little phone buzz. Multi-count habits (e.g. Workout 2×/day) fill a pip per tap. Tapping a finished one clears it (undo).
- **Streaks 🔥:** scheduled days in a row fully done. An unfinished *today* doesn't break your streak until the day is over.
- **Discipline score:** % of what was scheduled that got done over the last 14 days (partial credit for multi-count). Shown overall (the ring, top right) and per standard (bars at the bottom).
- A full-day progress bar, plus a "Every box ticked. That's him. 🏆" banner when you clear the day.
- Dates use your local day (T&T), not UTC, so a 11pm tick lands on the right day.

### What's next
- Chore levelling (offer a bigger chore after 7 days in a row).
- Nightly routine checker + evening notification.


## Session 1b (18 Nov 2026): Phase 1 onboarding

### What got built
- **Onboarding (`/onboarding`):** a warm, step-by-step flow. Intro → *Where you are now* → *Visualise him* (+ why) → *Standards*, area by area (💪 body, 🥗 food, 🧠 mind, 💰 money, 🏠 home, 🚬 vices, 👔 style, 💻 work, ❤️ relationships). Each line is a ✓ do / ✗ don't / ~ limit (guessed from your wording, tap to switch). Tap the example chips to add them fast.
- **Turn it into action:** smart templates suggest a habit or chore for each standard (free, no AI). Rename, switch habit/chore, set morning/night/any time, and change ×/day.
- **Night routine builder:** your "can't sleep until it's done" list, in order, with quick-add presets.
- **"This is him." card:** shown at the end and on the Home screen, with a "redo / edit him" link.
- **Redo = edit in place:** your saved answers load pre-filled. Anything you remove is switched off (`active = false`), never deleted, so streak history stays safe.
- Saves to `life.vision`, `life.standards` and `life.habits` (night steps as `kind = routine_step`, `routine = night`).

### What's next
- Habits screen: today's tick-offs with animations, streaks and discipline scores.
- Then chore levelling and the nightly routine checker.

### Test when back at the Chromebook
- Home → "Start onboarding" → go through every step → "Lock it in" → you should land on Home with your card.
- Tap "redo / edit him" and check that everything comes back pre-filled.

## Session 1 (18 Nov 2026): Foundation + Phase 2 (work timer)

### What got built
- **The foundation:** a Vite + React + TypeScript app with Tailwind, the Supabase connection, email magic-link login, an installable PWA (with an offline shell) and a bottom nav (Home / Habits / Work / Report). It uses the hand-drawn look: rough.js sketchy borders, Kalam + Nunito fonts and a warm paper palette.
- **Work timer (`/work`):** start a session as a stopwatch or as 🍅 Pomodoro blocks (25 / 50 / 90 min). You can pause, resume and end it. "Today: Xh Ym" shows your total work time for the day.
- **Random check-ins:** every 15–35 min while a session runs, a scribbled sticky note slaps onto the screen asking "What are you working on right now?" and "Any distractions since the last check?" The answers save as session notes. You can also jot your own notes.
- **Floating timer:** "float it on top ↗" opens a Picture-in-Picture window (Chrome on the Chromebook) that stays above other apps. Check-ins pop up inside it too.
- **Phone fallback:** if the app is in the background, a notification appears with a **Reply** box. Your reply saves as a check-in.
- **End-of-session summary:** "Wrap it up" shows the time, the check-ins and the distractions, plus a "How did it go?" box.
- **Report (`/report`):** the end-of-day report. It shows the total worked, the longest session, the distraction count, each session with its notes, ← → to browse days, and "copy report as text".
- **Database:** new tables `life.work_sessions` and `life.session_notes` (owner-only RLS), in `supabase/migrations/20261118120000_work_sessions.sql`. These are already applied to Supabase.
- **Sound hook:** `src/work/notify.ts` → `ALERT_SOUNDS` is where the rooster (and other custom sounds) will plug in.

### What's next
- Phase 1 proper: the onboarding flow (vision → standards → habits → nightly routine → "This is him"), then the Habits screen, chore levelling and the nightly routine checker.
- Add a baseline migration file for the 4 original tables (they exist in Supabase but have no SQL file in the repo).

### Nico to-do (with links)
1. **Expose the `life` schema** (if not done already): https://supabase.com/dashboard/project/kbghhdudnnyawbxfgdgi/settings/api → Exposed schemas → add `life` → Save.
2. **Allow login redirects:** https://supabase.com/dashboard/project/kbghhdudnnyawbxfgdgi/auth/url-configuration → add `http://localhost:5173` (and your Cloudflare Pages URL once deployed) under Redirect URLs.
3. **Deploy on Cloudflare Pages:** https://dash.cloudflare.com/?to=/:account/pages → Create → Connect to Git → `life-dashboard`. Build command `npm run build`, output `dist`. Add env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (values are in `.env.example`).

### Test when back at the Chromebook
- `npm install`, then `npm run dev` → open http://localhost:5173 → sign in by email.
- Start a session → tap "float it on top" → switch to another app and check the timer stays on top.
- Tap "check in now" to see the pop-up without waiting 15+ minutes.
- On the phone (deployed site, installed to the home screen): start a session, leave the app, and wait for the check-in notification → Reply.
- End a session → check `/report`.
