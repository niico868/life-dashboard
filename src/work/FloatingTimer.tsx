import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useWork } from './WorkProvider'
import { TimerFace } from './TimerFace'
import { CheckIn } from './CheckIn'
import { elapsedOf } from './types'

type DocPiP = { requestWindow: (o: { width: number; height: number }) => Promise<Window> }
const docPiP = (): DocPiP | undefined => (window as unknown as { documentPictureInPicture?: DocPiP }).documentPictureInPicture

export const pipSupported = () => !!docPiP()

/** Copy the app's CSS + fonts into the floating window so it looks the same. */
function copyStyles(target: Document) {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const css = Array.from(sheet.cssRules).map((r) => r.cssText).join('\n')
      const style = target.createElement('style')
      style.textContent = css
      target.head.appendChild(style)
    } catch {
      // Cross-origin sheet (Google Fonts): link it instead.
      if (sheet.href) {
        const link = target.createElement('link')
        link.rel = 'stylesheet'
        link.href = sheet.href
        target.head.appendChild(link)
      }
    }
  }
}

/** Opens the always-on-top floating timer (Chrome's Document Picture-in-Picture). */
export function useOpenPip() {
  const { setPipWindow, pipWindow } = useWork()
  return async () => {
    const api = docPiP()
    if (!api) return false
    if (pipWindow) { pipWindow.focus(); return true }
    const w = await api.requestWindow({ width: 320, height: 380 })
    copyStyles(w.document)
    w.document.body.className = 'm-0 bg-paper p-3'
    w.addEventListener('pagehide', () => setPipWindow(null))
    setPipWindow(w)
    return true
  }
}

/** Renders into the PiP window when one is open. Mounted once in the app shell. */
export function FloatingTimer() {
  const { pipWindow } = useWork()
  if (!pipWindow) return null
  return createPortal(<PipContent win={pipWindow} />, pipWindow.document.body)
}

function PipContent({ win }: { win: Window }) {
  const { session, pause, resume, checkinOpen, submitCheckin, closeCheckin, openCheckin } = useWork()
  // Tick using the PiP window's own clock, so it keeps moving while the main tab is in the background.
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = win.setInterval(() => setNow(Date.now()), 1000)
    return () => win.clearInterval(id)
  }, [win])

  if (!session) return <p className="hand p-4 text-xl">No session running. Close me 👋</p>

  if (checkinOpen) return <CheckIn compact onSubmit={submitCheckin} onLater={closeCheckin} />

  const btn = 'hand rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-ink px-4 py-1 text-lg'
  return (
    <div className="flex flex-col items-center gap-3 font-[Nunito]">
      {session.title && <p className="hand max-w-full truncate text-lg">{session.title}</p>}
      <TimerFace session={session} elapsed={elapsedOf(session, now)} size={200} />
      <div className="flex gap-2">
        {session.status === 'running'
          ? <button className={`${btn} bg-honey`} onClick={() => void pause()}>pause</button>
          : <button className={`${btn} bg-sage`} onClick={() => void resume()}>resume</button>}
        <button className={`${btn} bg-white`} onClick={openCheckin}>check in</button>
      </div>
    </div>
  )
}
