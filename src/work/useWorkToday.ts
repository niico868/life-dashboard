import { useEffect, useState } from 'react'
import { life } from '../lib/supabase'
import { dayBounds } from '../lib/time'
import { useWork } from './WorkProvider'

/** Seconds worked today: finished sessions + the one running now (live). */
export function useWorkToday(refresh = 0) {
  const { session, elapsed } = useWork()
  const [banked, setBanked] = useState(0)
  useEffect(() => {
    const { start, end } = dayBounds()
    life().from('work_sessions').select('active_seconds').eq('status', 'ended')
      .gte('started_at', start).lt('started_at', end)
      .then(({ data }) => setBanked((data ?? []).reduce((t, r) => t + r.active_seconds, 0)))
  }, [refresh, session?.id])
  return banked + (session ? elapsed : 0)
}
