import { useEffect, useRef, type ReactNode, type HTMLAttributes } from 'react'
import rough from 'roughjs'

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  fill?: string
  stroke?: string
  roughness?: number
  seed?: number
}

/** A box with a hand-drawn rough.js border, redrawn whenever it resizes. */
export function Sketchy({ children, fill, stroke = '#2b2a33', roughness = 1.4, seed = 7, className = '', ...rest }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const el = wrap.current
    const s = svg.current
    if (!el || !s) return
    const draw = () => {
      const { width, height } = el.getBoundingClientRect()
      s.setAttribute('width', String(width))
      s.setAttribute('height', String(height))
      while (s.firstChild) s.removeChild(s.firstChild)
      const rc = rough.svg(s)
      s.appendChild(
        rc.rectangle(3, 3, width - 6, height - 6, {
          stroke,
          strokeWidth: 1.8,
          roughness,
          seed,
          fill,
          fillStyle: 'solid',
        }),
      )
    }
    draw()
    // Use the element's own window so this also works inside the Picture-in-Picture window.
    const RO = (el.ownerDocument.defaultView as (Window & typeof globalThis) | null)?.ResizeObserver ?? ResizeObserver
    const ro = new RO(draw)
    ro.observe(el)
    return () => ro.disconnect()
  }, [fill, stroke, roughness, seed])

  return (
    <div ref={wrap} className={`relative ${className}`} {...rest}>
      <svg ref={svg} className="pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative">{children}</div>
    </div>
  )
}
