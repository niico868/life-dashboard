# Progress

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
