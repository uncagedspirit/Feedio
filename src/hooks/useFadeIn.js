import { useRef, useState, useEffect } from 'react'

/**
 * Returns [ref, isVisible].
 * Attach `ref` to the element you want to animate.
 * Use `isVisible` to toggle CSS classes or inline styles.
 *
 * @param {number} delay   Optional delay in ms before the element fades in
 * @param {number} threshold  IntersectionObserver threshold (0–1)
 */
export function useFadeIn(delay = 0, threshold = 0.1) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const t = setTimeout(() => setVisible(true), delay)
          observer.disconnect()
          return () => clearTimeout(t)
        }
      },
      { threshold },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [delay, threshold])

  return [ref, visible]
}
