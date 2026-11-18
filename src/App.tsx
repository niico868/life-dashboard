import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider, useAuth } from './lib/auth'
import { supabase } from './lib/supabase'
import { BottomNav } from './components/BottomNav'
import { Login } from './pages/Login'
import { Placeholder } from './pages/Placeholder'
import { Work } from './pages/Work'
import { Home } from './pages/Home'
import { Habits } from './pages/Habits'
import { Night } from './pages/Night'
import { Calendar } from './pages/Calendar'
import { NightProvider } from './night/NightProvider'
import { NightBanner } from './night/NightBanner'
import { Onboarding } from './pages/Onboarding'
import { Report } from './pages/Report'
import { WorkProvider } from './work/WorkProvider'
import { FloatingTimer } from './work/FloatingTimer'

function Shell() {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <p className="hand p-8 text-2xl">…</p>
  if (!session) return <Login />

  return (
    <WorkProvider>
      <NightProvider>
      <NightBanner />
      <main className="mx-auto max-w-md px-4 pb-28 pt-6">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/habits" element={<Habits />} />
              <Route path="/night" element={<Night />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/work" element={<Work />} />
              <Route path="/report" element={<Report />} />
              <Route path="*" element={<Placeholder title="Lost?" note="That page doesn't exist." />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
        <button className="mt-10 block text-xs text-ink-soft underline" onClick={() => supabase.auth.signOut()}>sign out</button>
      </main>
      <BottomNav />
      <FloatingTimer />
      </NightProvider>
    </WorkProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter><Shell /></BrowserRouter>
    </AuthProvider>
  )
}
