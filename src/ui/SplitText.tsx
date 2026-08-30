import { ReactNode } from 'react'

export function SplitText({ children, delayOffset = 0 }: { children: ReactNode; delayOffset?: number }) {
  if (typeof children !== 'string') return <>{children}</>

  const words = children.split(' ')
  return (
    <span className="split-text" aria-label={children}>
      {words.map((word, i) => (
        <span key={i} className="split-word" aria-hidden="true">
          <span style={{ transitionDelay: `${delayOffset + i * 0.035}s` }}>
            {word}
          </span>
          {i < words.length - 1 && '\u00A0'}
        </span>
      ))}
    </span>
  )
}
