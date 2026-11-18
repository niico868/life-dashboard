import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { Sketchy } from '../components/Sketchy'
import { SketchButton } from '../components/SketchButton'

export function Login() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setState('sending')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) { setError(error.message); setState('error') } else setState('sent')
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5">
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-2 text-4xl font-bold">
        Hey, welcome in.
      </motion.h1>
      <p className="mb-6 text-ink-soft">Let's get you signed in. No password, just a magic link to your inbox.</p>
      <Sketchy fill="#fffdf7" className="p-5">
        {state === 'sent' ? (
          <p className="hand text-xl">Check your email ✉️ Tap the link and you're in.</p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <label className="hand text-lg" htmlFor="email">Your email</label>
            <input
              id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border-2 border-ink/70 bg-white px-3 py-2.5 outline-none focus:border-clay"
              placeholder="you@example.com"
            />
            <SketchButton type="submit" disabled={state === 'sending'}>
              {state === 'sending' ? 'Sending…' : 'Send me the link'}
            </SketchButton>
            {state === 'error' && <p className="text-sm text-clay">{error}</p>}
          </form>
        )}
      </Sketchy>
    </main>
  )
}
