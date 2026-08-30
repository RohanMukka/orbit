import { useEffect, useRef } from 'react'

export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Only enable custom cursor on non-touch devices
    if (window.matchMedia('(pointer: coarse)').matches) return

    let mouseX = window.innerWidth / 2
    let mouseY = window.innerHeight / 2
    let ringX = mouseX
    let ringY = mouseY
    let isHovering = false
    let isMouseDown = false
    let raf = 0

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`
      }
      
      const target = e.target as HTMLElement
      // Awwwards magnetic hover feel
      const hoverable = target.closest('button, a, .design__handle, [role="button"], [role="slider"], svg circle')
      isHovering = !!hoverable
    }

    const onMouseDown = () => (isMouseDown = true)
    const onMouseUp = () => (isMouseDown = false)

    const loop = () => {
      // Lerp the ring for a smooth trailing effect
      ringX += (mouseX - ringX) * 0.2
      ringY += (mouseY - ringY) * 0.2

      if (ringRef.current) {
        const scale = isMouseDown ? 0.8 : isHovering ? 1.8 : 1
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${scale})`
        // Mix blend modes work best when solid white difference
      }
      raf = requestAnimationFrame(loop)
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('mousedown', onMouseDown, { passive: true })
    window.addEventListener('mouseup', onMouseUp, { passive: true })
    raf = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <div className="cursor-ring" ref={ringRef} aria-hidden />
      <div className="cursor-dot" ref={dotRef} aria-hidden />
    </>
  )
}
