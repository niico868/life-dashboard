# Life Dashboard — Project Brief

This file is the job sheet for this project. Read it fully at the start of every session.

## Who this is for

One user: Nico (Trinidad & Tobago, UTC-4). He's a clothing-brand owner and web developer working towards becoming a software engineer. He has coding basics (some HTML/JS/Python) and is learning as this gets built. He develops on a Chromebook and checks in from his Android phone.

**How to work with him:**
- At the end of every chunk of work, explain what you built in plain language, with a simple analogy where it helps. He wants to learn, not just receive code.
- Give direct links to any page he needs to open (Supabase dashboard, Cloudflare, GitHub settings).
- For brainstorming or decisions, ask multiple-choice questions.
- Keep PROGRESS.md updated after every session (see below). He reads it from his phone.

## What we're building

A personal life dashboard: a friendly, animated, mobile-first web app (installable PWA) that helps him become the man he wants to be. It has one main dashboard that breaks out into separate sections.

## Build order (do these in order)

### Phase 1 — Ideal-man onboarding + habits  ← START HERE
1. **Foundation:** Vite + React + TypeScript, Tailwind, Supabase client, email magic-link login, PWA setup, app shell with bottom nav (mobile).
2. **Onboarding flow** (first run, can be redone later). A guided, warm, step-by-step conversation-style flow:
   - *Where you are now:* an honest snapshot of the current self (free text).
   - *Visualise him:* describe the ideal man and what his day looks like. Saved to `life.vision`.
   - *His standards:* go area by area (body, food, mind, money, home and organisation, vices, style, work, relationships). Each standard is a **do** ("works out twice a day"), a **don't** ("doesn't eat chicken", "doesn't smoke cigarettes") or a **limit** ("weed on occasion"). Saved to `life.standards`.
   - *Turn standards into actions:* suggest daily habits and chores from each standard, which he can edit. Saved to `life.habits`.
   - *Nightly routine builder:* the "I can't sleep until this is done" list (brush teeth, wash face, charge phone, lay out tomorrow's outfit...). Saved to `life.habits` with `routine = 'night'`, `kind = 'routine_step'`.
   - *Summary screen:* "This is him." A beautiful card of the vision and standards.
3. **Habits screen:** today's habits, chores and routines as tick-offs, with satisfying animations. Track streaks and a discipline score per standard and overall.
4. **Chore levelling:** chores have a `level`. When a chore is hit consistently (e.g. 7 days in a row), offer to level up to a bigger chore.
5. **Nightly routine checker:** an evening view that nags until everything is ticked off. A notification at a set time if it's not done. (A loud rooster alarm comes later. Leave a hook for custom alert sounds.)

### Phase 2 — Work timer + check-ins + reports
- Session timer: start / pause / resume / end, plus a stopwatch, with optional Pomodoro countdown blocks.
- Total work time per day.
- **Random check-in pop-ups** during a running session: "What are you working on right now?" and "Any distractions since the last check?" Answers save as session notes.
- **Minimisable floating timer:** use the Document Picture-in-Picture API (Chrome) so the timer and the check-in pop-up float on top of other apps on the Chromebook. Fall back to Web Notifications with a reply action on the phone.
- Check-in pop-up style: rough-edged, hand-drawn, casual. NOT a boxed corporate modal.
- End-of-session summary and end-of-day report built from the time logs and notes.

### Phase 3 — Calendar + planning
- In-app calendar for weekly appointments and arrangements.
- After each appointment, rate how well it went and track it.
- Shows free and busy time.
- **Planning is core to his growth.** Every event can carry a prep checklist planned well in advance: outfit, departure time, charge phone, and for big ones like a client onboarding, talking points and sheet work. Show prep due ahead of the event.

### Phase 4 — Dashboard home
- Pull everything together: today's habits progress, discipline score, work time today, next appointment plus its prep, and the nightly routine status.
- **Alive:** animated progress bars, chores ticking off, a scrolling ticker of alerts and reminders, moving parts. Static pages are a fail.

### Later ideas (don't build yet)
- Custom alarm sounds (rooster for a missed nightly routine), gamification, deeper habit engagement, and a desktop layout scale-up.

## Design direction

- **"Elevated Comic Sans."** A hand-drawn, doodle feel that's still a high-quality, premium product. Friendly and welcoming. NOT corporate, NOT hard-edged, NOT childish, NOT airy-fairy.
- Sketchy, imperfect borders and shapes (consider rough.js or hand-drawn SVG). Soft, warm palette. Paper-like surfaces.
- Type: a refined handwritten or rounded face for headings (e.g. Kalam, Patrick Hand, Gaegu) paired with a clean, readable rounded body font (e.g. Nunito). Test for legibility.
- Motion everywhere it adds life: Framer Motion for tick-offs, progress fills, page transitions and the alert ticker. Respect prefers-reduced-motion.
- **Mobile first** (design at ~380px wide). Scale up to desktop only after the features are done.

## Tech stack

- Vite + React + TypeScript + Tailwind CSS
- Supabase (auth + Postgres) via `@supabase/supabase-js`
- Framer Motion, rough.js (or similar)
- vite-plugin-pwa (installable, with offline shell)
- Hosting: Cloudflare Pages (he already uses Cloudflare)

## Supabase

- Project: **Neikoli Devs**, ref `kbghhdudnnyawbxfgdgi`
- URL: `https://kbghhdudnnyawbxfgdgi.supabase.co`
- Publishable key (safe for the browser): `sb_publishable_nHgaakYh8CmRhXEd_xZ1nQ_V1RlW7IM`
- Put these in `.env.local` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (see `.env.example`).
- **NEVER** put a service_role or secret key in the repo or frontend.
- All app tables live in the **`life` schema** (other projects may share this Supabase project). Query with `supabase.schema('life').from('habits')`.
- The `life` schema must be listed under Exposed schemas in the Data API settings: https://supabase.com/dashboard/project/kbghhdudnnyawbxfgdgi/settings/api

### Existing tables (already created, see `supabase/migrations/`)
- `life.vision`: current_self, ideal_self, why
- `life.standards`: area, statement, kind (do / dont / limit), target_per_day, active, sort_order
- `life.habits`: standard_id, name, kind (habit / chore / routine_step), routine (morning / night / anytime), level, times_per_day, days_of_week (0 = Sunday), active, sort_order
- `life.habit_logs`: habit_id, log_date, count, note. Unique per (habit_id, log_date).
- Every table has `user_id` defaulting to `auth.uid()`, with row level security set to owner-only.

### Database rules
- Every schema change goes in a new SQL file in `supabase/migrations/` (timestamped). Never edit an old migration.
- Every new table: put it in `life`, add a user_id defaulting to `auth.uid()`, enable RLS, and add an owner-only policy.
- Ask Nico before anything destructive (dropping tables or columns, deleting data).

## Working rules

- Work in small, reviewable steps. Commit often with clear messages.
- Mobile-first. Check every screen at phone width.
- Don't add paid services. Free tiers only.
- If something needs Nico to click in a dashboard, stop, give him the exact link and steps, and wait.

## PROGRESS.md

After every session, update PROGRESS.md with:
- What got built (in plain language)
- What's next
- Anything Nico needs to do (with links)
- Anything to review or test when he's back at the Chromebook
