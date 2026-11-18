import { Sketchy } from '../components/Sketchy'

export function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">{title}</h1>
      <Sketchy fill="#fffdf7" className="p-5">
        <p className="text-ink-soft">{note}</p>
      </Sketchy>
    </div>
  )
}
